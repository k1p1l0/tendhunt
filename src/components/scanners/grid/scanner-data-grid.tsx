"use client";

import { useMemo, useState, useCallback, useRef, useEffect, useReducer } from "react";
import DataEditor, {
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
  type Rectangle,
  CompactSelection,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

import { useScannerStore, getScore } from "@/stores/scanner-store";
import type { ColumnDef } from "@/components/scanners/table-columns";
import type { ScannerType } from "@/models/scanner";
import { toGlideColumns, type ColumnMeta } from "./glide-columns";
import { createGetCellContent } from "./cell-content";
import { customRenderers, setLogoRedrawCallback } from "./custom-renderers";
import { useGlideTheme } from "./glide-theme";
import { resolveAccessor, getUniqueColumnValues } from "./format-utils";
import { HeaderMenu, type RunColumnOptions } from "./header-menu";
import { isTextUseCase } from "@/lib/ai-column-config";

// Play button hit area: 24×24 icon in the right side of the header
const PLAY_BTN_SIZE = 24;
const PLAY_BTN_MARGIN = 8;

interface ScannerDataGridProps {
  columns: ColumnDef[];
  rows: Array<Record<string, unknown>>;
  scannerType: ScannerType;
  onAiCellClick?: (columnId: string, entityId: string) => void;
  onScoreColumn?: (columnId: string) => void;
  onCancelScoring?: () => void;
  onRunColumn?: (options: RunColumnOptions) => void;
  onAddColumn?: () => void;
  onEditColumn?: (columnId: string) => void;
  onEditCustomColumn?: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onRowDoubleClick?: (row: Record<string, unknown>) => void;
  onInsertColumn?: (referenceColumnId: string, side: "left" | "right") => void;
}

export function ScannerDataGrid({
  columns,
  rows,
  onAiCellClick,
  onScoreColumn,
  onCancelScoring,
  onRunColumn,
  onAddColumn,
  onEditColumn,
  onEditCustomColumn,
  onRenameColumn,
  onDeleteColumn,
  onRowDoubleClick,
  onInsertColumn,
}: ScannerDataGridProps) {
  const [sortColumnIdx, setSortColumnIdx] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<{
    col: number;
    title: string;
    position: { x: number; y: number };
  } | null>(null);

  // Row selection state
  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  const scores = useScannerStore((s) => s.scores);
  const threshold = useScannerStore((s) => s.threshold);
  const hideBelow = useScannerStore((s) => s.hideBelow);
  const columnWidths = useScannerStore((s) => s.columnWidths);
  const setColumnWidth = useScannerStore((s) => s.setColumnWidth);
  const setColumnOrder = useScannerStore((s) => s.setColumnOrder);
  const columnFilters = useScannerStore((s) => s.columnFilters);
  const setColumnFilter = useScannerStore((s) => s.setColumnFilter);
  const isScoring = useScannerStore((s) => s.isScoring);
  const scoringProgress = useScannerStore((s) => s.scoringProgress);
  const columnScoringProgress = useScannerStore((s) => s.columnScoringProgress);

  const theme = useGlideTheme();

  // Force re-render when logos finish loading asynchronously
  const [, forceRedraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    setLogoRedrawCallback(forceRedraw);
    return () => setLogoRedrawCallback(() => {});
  }, []);

  // Smooth spinner animation: force redraws at ~16fps while scoring
  useEffect(() => {
    if (!isScoring) return;
    const id = setInterval(forceRedraw, 60);
    return () => clearInterval(id);
  }, [isScoring]);

  // Build Glide columns + metadata
  const { gridColumns, columnMeta } = useMemo(
    () => toGlideColumns(columns, columnWidths),
    [columns, columnWidths]
  );

  // Find first score-mode AI column for threshold logic (skip text-only columns)
  const firstAiColumnMeta = useMemo(
    () => columnMeta.find((m) => m.type === "ai" && !isTextUseCase(m.aiUseCase)),
    [columnMeta]
  );

  // Sorted rows
  const sortedRows = useMemo(() => {
    const arr = [...rows];

    if (sortColumnIdx != null) {
      const meta = columnMeta[sortColumnIdx];
      if (meta) {
        arr.sort((a, b) => {
          let aVal: unknown;
          let bVal: unknown;

          if (meta.type === "ai" && meta.aiColumnId) {
            if (isTextUseCase(meta.aiUseCase)) {
              aVal = getScore(scores, meta.aiColumnId, String(a._id))?.response ?? "";
              bVal = getScore(scores, meta.aiColumnId, String(b._id))?.response ?? "";
            } else {
              aVal = getScore(scores, meta.aiColumnId, String(a._id))?.score ?? -1;
              bVal = getScore(scores, meta.aiColumnId, String(b._id))?.score ?? -1;
            }
          } else {
            aVal = resolveAccessor(a, meta.accessor);
            bVal = resolveAccessor(b, meta.accessor);
          }

          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortAsc ? aVal - bVal : bVal - aVal;
          }
          return sortAsc
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }
    } else if (firstAiColumnMeta?.aiColumnId) {
      const colId = firstAiColumnMeta.aiColumnId;
      const hasAnyScore = arr.some(
        (r) => getScore(scores, colId, String(r._id))?.score != null
      );
      if (hasAnyScore) {
        arr.sort((a, b) => {
          const aScore = getScore(scores, colId, String(a._id))?.score ?? -1;
          const bScore = getScore(scores, colId, String(b._id))?.score ?? -1;
          return bScore - aScore;
        });
      }
    }

    return arr;
  }, [rows, sortColumnIdx, sortAsc, columnMeta, scores, firstAiColumnMeta]);

  // Apply column value filters (AND across columns, OR within column)
  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(columnFilters);
    if (activeFilters.length === 0) return sortedRows;

    return sortedRows.filter((row) =>
      activeFilters.every(([colId, allowedValues]) => {
        const meta = columnMeta.find((m) => m.id === colId);
        if (!meta) return true;
        const raw = resolveAccessor(row, meta.accessor);
        if (raw == null) return false;
        const val = String(raw).trim();
        return allowedValues.includes(val);
      })
    );
  }, [sortedRows, columnFilters, columnMeta]);

  // Split into above/below threshold + optionally hide
  const displayRows = useMemo(() => {
    if (!firstAiColumnMeta?.aiColumnId) return filteredRows;
    const colId = firstAiColumnMeta.aiColumnId;

    const above: Array<Record<string, unknown>> = [];
    const below: Array<Record<string, unknown>> = [];

    for (const row of filteredRows) {
      const entry = getScore(scores, colId, String(row._id));
      if (entry?.score != null && entry.score < threshold) {
        below.push(row);
      } else {
        above.push(row);
      }
    }

    if (hideBelow) return above;
    return [...above, ...below];
  }, [filteredRows, firstAiColumnMeta, scores, threshold, hideBelow]);

  // Threshold boundary index (for row dimming)
  const thresholdBoundary = useMemo(() => {
    if (hideBelow || !firstAiColumnMeta?.aiColumnId) return displayRows.length;
    const colId = firstAiColumnMeta.aiColumnId;

    for (let i = 0; i < displayRows.length; i++) {
      const entry = getScore(scores, colId, String(displayRows[i]._id));
      if (entry?.score != null && entry.score < threshold) {
        return i;
      }
    }
    return displayRows.length;
  }, [displayRows, firstAiColumnMeta, scores, threshold, hideBelow]);

  // getCellContent callback
  const getCellContent = useMemo(
    () => createGetCellContent(columnMeta, displayRows, scores, getScore, isScoring),
    [columnMeta, displayRows, scores, isScoring]
  );

  // Row theme override: dim below-threshold rows
  const getRowThemeOverride = useCallback(
    (row: number): Partial<Theme> | undefined => {
      if (row >= thresholdBoundary) {
        return {
          textDark: theme.textLight ?? "#999",
          textMedium: theme.textLight ?? "#999",
        };
      }
      return undefined;
    },
    [thresholdBoundary, theme.textLight]
  );

  // Store columnMeta + columnFilters in refs so drawHeader can access without re-creating
  const columnMetaRef = useRef(columnMeta);
  columnMetaRef.current = columnMeta;
  const columnFiltersRef = useRef(columnFilters);
  columnFiltersRef.current = columnFilters;
  const isScoringRef = useRef(isScoring);
  isScoringRef.current = isScoring;
  const scoringProgressRef = useRef(scoringProgress);
  scoringProgressRef.current = scoringProgress;
  const columnScoringProgressRef = useRef(columnScoringProgress);
  columnScoringProgressRef.current = columnScoringProgress;

  // Draw a small type icon — all centered at (x, cy), ~10px wide
  const drawTypeIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      type: string,
      x: number,
      cy: number,
      color: string,
      fontFamily: string
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      switch (type) {
        case "text": {
          ctx.font = `600 11px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("T", x, cy);
          break;
        }
        case "number": {
          ctx.font = `600 11px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("#", x, cy);
          break;
        }
        case "currency": {
          ctx.font = `500 12px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("£", x, cy);
          break;
        }
        case "date": {
          // Mini calendar: 9×9 box, top bar, two dots
          const s = 4.5;
          const top = cy - s;
          const left = x - s;
          const w = s * 2;
          const h = s * 2;
          ctx.lineWidth = 1.1;
          // Body
          const r = 1;
          ctx.beginPath();
          ctx.moveTo(left + r, top + 2);
          ctx.lineTo(left + w - r, top + 2);
          ctx.arcTo(left + w, top + 2, left + w, top + 2 + r, r);
          ctx.lineTo(left + w, top + h - r);
          ctx.arcTo(left + w, top + h, left + w - r, top + h, r);
          ctx.lineTo(left + r, top + h);
          ctx.arcTo(left, top + h, left, top + h - r, r);
          ctx.lineTo(left, top + 2 + r);
          ctx.arcTo(left, top + 2, left + r, top + 2, r);
          ctx.closePath();
          ctx.stroke();
          // Top bar
          ctx.beginPath();
          ctx.moveTo(left, top + 5);
          ctx.lineTo(left + w, top + 5);
          ctx.stroke();
          // Pegs
          ctx.lineWidth = 1.3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x - 2.5, top);
          ctx.lineTo(x - 2.5, top + 3);
          ctx.moveTo(x + 2.5, top);
          ctx.lineTo(x + 2.5, top + 3);
          ctx.stroke();
          break;
        }
        case "badge": {
          // Small tag icon: rounded rect outline
          const tw = 5;
          const th = 3.5;
          const tr = 2;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(x - tw + tr, cy - th);
          ctx.lineTo(x + tw - tr, cy - th);
          ctx.arcTo(x + tw, cy - th, x + tw, cy, tr);
          ctx.lineTo(x + tw, cy + th - tr);
          ctx.arcTo(x + tw, cy + th, x + tw - tr, cy + th, tr);
          ctx.lineTo(x - tw + tr, cy + th);
          ctx.arcTo(x - tw, cy + th, x - tw, cy, tr);
          ctx.lineTo(x - tw, cy - th + tr);
          ctx.arcTo(x - tw, cy - th, x - tw + tr, cy - th, tr);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case "entity-name": {
          // Person icon: small head circle + shoulders arc
          ctx.lineWidth = 1.1;
          ctx.lineCap = "round";
          // Head
          ctx.beginPath();
          ctx.arc(x, cy - 3, 2.5, 0, Math.PI * 2);
          ctx.stroke();
          // Shoulders
          ctx.beginPath();
          ctx.arc(x, cy + 4.5, 4, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
          break;
        }
        case "url": {
          // Chain link icon: two interlocking ovals
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          // Left oval
          ctx.beginPath();
          ctx.ellipse(x - 2.5, cy, 3, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          // Right oval
          ctx.beginPath();
          ctx.ellipse(x + 2.5, cy, 3, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "email": {
          // @ symbol
          ctx.font = `500 10px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("@", x, cy);
          break;
        }
        case "checkbox": {
          // Small square with checkmark
          const s = 4;
          ctx.lineWidth = 1.1;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          // Square outline
          ctx.strokeRect(x - s, cy - s, s * 2, s * 2);
          // Checkmark
          ctx.beginPath();
          ctx.moveTo(x - 2, cy);
          ctx.lineTo(x - 0.5, cy + 2);
          ctx.lineTo(x + 2.5, cy - 2);
          ctx.stroke();
          break;
        }
        case "paragraph": {
          // Three horizontal lines (menu/paragraph icon)
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          const w = 4.5;
          ctx.beginPath();
          ctx.moveTo(x - w, cy - 3);
          ctx.lineTo(x + w, cy - 3);
          ctx.moveTo(x - w, cy);
          ctx.lineTo(x + w, cy);
          ctx.moveTo(x - w, cy + 3);
          ctx.lineTo(x + 2, cy + 3);
          ctx.stroke();
          break;
        }
        default:
          break;
      }
      ctx.restore();
    },
    []
  );

  // Custom header drawing: all columns get type icon + title
  const drawHeader = useCallback(
    (
      args: {
        ctx: CanvasRenderingContext2D;
        rect: Rectangle;
        column: GridColumn;
        columnIndex: number;
        theme: Theme;
        isSelected: boolean;
        isHovered: boolean;
        hasSelectedCell: boolean;
        spriteManager: unknown;
        menuBounds: Rectangle;
      },
      drawContent: () => void
    ) => {
      const { ctx, rect, column, columnIndex, theme: t, isHovered } = args;
      const meta = columnMetaRef.current[columnIndex];
      const isAi = meta?.type === "ai";
      const cy = rect.y + rect.height / 2;

      if (!isAi) {
        // ── Core column: type icon + title ─────────────────────

        // 1) Draw default header background + borders via Glide
        drawContent();

        // 2) Overdraw content area (preserve right menu arrow zone)
        if (meta) {
          ctx.save();
          ctx.fillStyle = isHovered
            ? (t.bgHeaderHovered ?? t.bgHeader)
            : t.bgHeader;
          ctx.fillRect(rect.x + 1, rect.y + 1, rect.width - 30, rect.height - 2);
          ctx.restore();

          // 3) Type icon centered at x=rect.x+14
          const iconX = rect.x + 14;
          const iconColor = t.textMedium ?? t.textLight;
          drawTypeIcon(ctx, meta.type, iconX, cy, iconColor, t.fontFamily);

          // 4) Title text starts after icon
          const textX = rect.x + 26;
          ctx.save();
          ctx.fillStyle = t.textHeader ?? t.textDark;
          ctx.font = t.headerFontStyle + " " + t.fontFamily;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const maxTextW = rect.x + rect.width - textX - 28;
          let title = column.title;
          if (maxTextW > 0 && ctx.measureText(title).width > maxTextW) {
            while (
              title.length > 0 &&
              ctx.measureText(title + "…").width > maxTextW
            ) {
              title = title.slice(0, -1);
            }
            title += "…";
          }
          ctx.fillText(title, textX, cy);

          // Filter indicator dot
          const filters = columnFiltersRef.current;
          if (meta.id && filters[meta.id]?.length) {
            const dotX = textX + ctx.measureText(title).width + 6;
            ctx.fillStyle = "#3b82f6"; // blue-500
            ctx.beginPath();
            ctx.arc(dotX, cy, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
        return;
      }

      // ── AI column: fully custom header ─────────────────────

      // Check if this column is actively scoring
      const colProgress = meta.aiColumnId
        ? columnScoringProgressRef.current[meta.aiColumnId]
        : undefined;
      const isScoringThisCol = isScoringRef.current && !!colProgress;

      // 1) Tinted background (stronger tint when scoring)
      ctx.save();
      if (isScoringThisCol) {
        ctx.fillStyle = "rgba(229, 255, 0, 0.12)";
      } else {
        ctx.fillStyle = isHovered
          ? "rgba(229, 255, 0, 0.10)"
          : "rgba(229, 255, 0, 0.05)";
      }
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.restore();

      if (isScoringThisCol && colProgress) {
        // ── Scoring state: spinner + title + pct + stop button + progress bar ──

        const fraction = colProgress.total > 0
          ? colProgress.scored / colProgress.total
          : 0;
        const pctText = fraction < 0.01 && colProgress.scored === 0
          ? "0%"
          : `${Math.round(fraction * 100)}%`;

        // Animated spinner (left, where sparkle normally goes)
        const spinnerX = rect.x + 12;
        const spinnerR = 5;
        const angle = ((Date.now() % 1000) / 1000) * Math.PI * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(spinnerX, cy - 2, spinnerR, angle, angle + Math.PI * 1.5);
        ctx.strokeStyle = "#E5FF00";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();

        // Stop button (right-aligned, in Glide's menu zone so clicks route to onHeaderMenuClick)
        const stopBtnRight = rect.x + rect.width - PLAY_BTN_MARGIN;
        const stopCx = stopBtnRight - PLAY_BTN_SIZE / 2;
        const stopCy = cy - 1;
        const stopR = PLAY_BTN_SIZE / 2 - 2;

        ctx.save();
        // Circle background
        ctx.beginPath();
        ctx.arc(stopCx, stopCy, stopR, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? "rgba(239, 68, 68, 0.20)"
          : "rgba(239, 68, 68, 0.10)";
        ctx.fill();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Stop square icon (centered in circle)
        const sqSize = 4;
        ctx.fillStyle = isHovered ? "#ef4444" : "#dc2626";
        ctx.beginPath();
        ctx.roundRect(stopCx - sqSize, stopCy - sqSize, sqSize * 2, sqSize * 2, 1.5);
        ctx.fill();
        ctx.restore();

        // Percentage text (between title and stop button)
        const stopZoneW = PLAY_BTN_SIZE + PLAY_BTN_MARGIN + 4;
        ctx.save();
        ctx.font = `500 10px ${t.fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = t.textMedium ?? t.textLight;
        const pctX = rect.x + rect.width - stopZoneW - 4;
        ctx.fillText(pctText, pctX, cy - 2);
        ctx.restore();

        // Column title — clip to available area
        const pctWidth = ctx.measureText(pctText).width;
        const titleX = rect.x + 26;
        const titleMaxW = rect.width - 26 - pctWidth - stopZoneW - 12;
        ctx.save();
        ctx.fillStyle = t.textHeader ?? t.textDark;
        ctx.font = t.headerFontStyle + " " + t.fontFamily;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.beginPath();
        ctx.rect(titleX, rect.y, titleMaxW, rect.height);
        ctx.clip();
        ctx.fillText(column.title, titleX, cy - 2);
        ctx.restore();

        // Progress bar at the very bottom of the header (3px tall)
        const barH = 3;
        const barY = rect.y + rect.height - barH - 1;
        const barX = rect.x + 4;
        const barW = rect.width - 8;

        // Track
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barH / 2);
        ctx.fill();

        // Fill
        const fillW = barW * fraction;
        if (fillW > 0) {
          ctx.fillStyle = "#c8d900";
          ctx.beginPath();
          ctx.roundRect(barX, barY, fillW, barH, barH / 2);
          ctx.fill();
        }
        ctx.restore();

      } else {
        // ── Idle state: sparkle + title + play button ──

        // Bottom accent line
        ctx.save();
        ctx.fillStyle = "rgba(229, 255, 0, 0.30)";
        ctx.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2);
        ctx.restore();

        // Sparkle icon (left side) — with outline for light-mode visibility
        ctx.save();
        const sparkleX = rect.x + 12;
        const sparkleY = cy;
        const ss = 4.5;

        // Draw sparkle path
        ctx.beginPath();
        ctx.moveTo(sparkleX, sparkleY - ss);
        ctx.quadraticCurveTo(sparkleX, sparkleY, sparkleX + ss, sparkleY);
        ctx.quadraticCurveTo(sparkleX, sparkleY, sparkleX, sparkleY + ss);
        ctx.quadraticCurveTo(sparkleX, sparkleY, sparkleX - ss, sparkleY);
        ctx.quadraticCurveTo(sparkleX, sparkleY, sparkleX, sparkleY - ss);
        ctx.closePath();
        // Outline for contrast
        ctx.strokeStyle = "rgba(180, 200, 0, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#E5FF00";
        ctx.fill();

        // Mini sparkle
        const sx2 = sparkleX + 7;
        const sy2 = sparkleY - 4;
        const ss2 = 2;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2 - ss2);
        ctx.quadraticCurveTo(sx2, sy2, sx2 + ss2, sy2);
        ctx.quadraticCurveTo(sx2, sy2, sx2, sy2 + ss2);
        ctx.quadraticCurveTo(sx2, sy2, sx2 - ss2, sy2);
        ctx.quadraticCurveTo(sx2, sy2, sx2, sy2 - ss2);
        ctx.closePath();
        ctx.strokeStyle = "rgba(180, 200, 0, 0.6)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "#E5FF00";
        ctx.fill();
        ctx.restore();

        // Column title text (after sparkle) — clip to available area
        const textX = sparkleX + 16;
        const playZoneW = PLAY_BTN_SIZE + PLAY_BTN_MARGIN + 4;
        const titleMaxW = rect.width - (textX - rect.x) - playZoneW;

        ctx.save();
        ctx.fillStyle = t.textHeader ?? t.textDark;
        ctx.font = t.headerFontStyle + " " + t.fontFamily;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.beginPath();
        ctx.rect(textX, rect.y, titleMaxW, rect.height);
        ctx.clip();
        ctx.fillText(column.title, textX, cy);
        ctx.restore();

        // Play button (right-aligned, inside header)
        const btnRight = rect.x + rect.width - PLAY_BTN_MARGIN;
        const bcx = btnRight - PLAY_BTN_SIZE / 2;
        const bcy = cy;
        const r = PLAY_BTN_SIZE / 2 - 2;

        ctx.save();
        // Circle background
        ctx.beginPath();
        ctx.arc(bcx, bcy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? "rgba(229, 255, 0, 0.25)"
          : "rgba(229, 255, 0, 0.10)";
        ctx.fill();
        // Circle border for light-mode visibility
        ctx.strokeStyle = "rgba(180, 200, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Play triangle
        const triSize = 5;
        ctx.beginPath();
        ctx.moveTo(bcx - triSize * 0.4, bcy - triSize);
        ctx.lineTo(bcx - triSize * 0.4, bcy + triSize);
        ctx.lineTo(bcx + triSize * 0.7, bcy);
        ctx.closePath();
        ctx.fillStyle = isHovered ? "#c8d900" : "#b0b800";
        ctx.fill();
        ctx.restore();
      }
    },
    [drawTypeIcon]
  );

  // Header click: play button zone → score, otherwise → open menu
  // NOTE: Glide Data Grid intercepts clicks in the header menu zone (30px from
  // right edge) and routes them to onHeaderMenuClick instead of onHeaderClicked.
  // Since the play button overlaps with this zone, play-button scoring is
  // handled in onHeaderMenuClick below, not here.
  const onHeaderClicked = useCallback(
    (col: number, event: { bounds: Rectangle; localEventX: number; localEventY: number }) => {
      const meta = columnMeta[col];

      // AI column: play/stop button zone click (for clicks outside Glide's 30px menu zone)
      if (meta?.type === "ai" && meta.aiColumnId) {
        const colWidth = event.bounds.width;
        const playZoneStart = colWidth - PLAY_BTN_SIZE - PLAY_BTN_MARGIN;
        if (event.localEventX >= playZoneStart) {
          if (isScoring) {
            onCancelScoring?.();
          } else {
            onScoreColumn?.(meta.aiColumnId);
          }
          return;
        }
      }

      // Any other click on the header → open the column menu
      const title = gridColumns[col]?.title ?? "";
      setHeaderMenu({
        col,
        title,
        position: {
          x: event.bounds.x,
          y: event.bounds.y + event.bounds.height,
        },
      });
    },
    [columnMeta, isScoring, onScoreColumn, onCancelScoring, gridColumns]
  );

  // Header menu icon click → for AI columns, trigger scoring or cancel; for others, open menu.
  // Glide Data Grid's internal header menu zone (30px from right edge) overlaps
  // with our play/stop button. Clicks in that zone fire onHeaderMenuClick, not
  // onHeaderClicked.
  const onHeaderMenuClick = useCallback(
    (col: number, position: { x: number; y: number }) => {
      const meta = columnMeta[col];

      if (meta?.type === "ai" && meta.aiColumnId) {
        if (isScoring) {
          // Scoring in progress → stop button click → cancel scoring
          onCancelScoring?.();
          return;
        }
        // Idle → play button click → start scoring
        onScoreColumn?.(meta.aiColumnId);
        return;
      }

      const title = gridColumns[col]?.title ?? "";
      setHeaderMenu({ col, title, position });
    },
    [columnMeta, isScoring, onScoreColumn, onCancelScoring, gridColumns]
  );

  // Sort handler
  const handleSort = useCallback((col: number, asc: boolean) => {
    setSortColumnIdx(col);
    setSortAsc(asc);
  }, []);

  // Edit column handler: resolve column index to aiColumnId
  const handleEditColumn = useCallback(
    (col: number) => {
      const meta = columnMeta[col];
      if (meta?.type === "ai" && meta.aiColumnId) {
        onEditColumn?.(meta.aiColumnId);
      }
    },
    [columnMeta, onEditColumn]
  );

  // Edit custom column handler: resolve column index to customColumnId
  const handleEditCustomColumn = useCallback(
    (col: number) => {
      const meta = columnMeta[col];
      if (meta?.customColumnId) {
        onEditCustomColumn?.(meta.customColumnId);
      }
    },
    [columnMeta, onEditCustomColumn]
  );

  // Column resize
  const onColumnResize = useCallback(
    (column: GridColumn, newSize: number) => {
      if (column.id) {
        setColumnWidth(column.id, newSize);
      }
    },
    [setColumnWidth]
  );

  // Column move
  const onColumnMoved = useCallback(
    (startIndex: number, endIndex: number) => {
      const newOrder = gridColumns.map((c) => c.id ?? "");
      const [moved] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, moved);
      setColumnOrder(newOrder);
    },
    [gridColumns, setColumnOrder]
  );

  // Cell double-click (activation): open entity detail
  const onCellActivated = useCallback(
    (cell: Item) => {
      const row = displayRows[cell[1]];
      if (row) {
        onRowDoubleClick?.(row);
      }
    },
    [displayRows, onRowDoubleClick]
  );

  // Cell click: AI cells open drawer
  const onCellClicked = useCallback(
    (cell: Item) => {
      const [col] = cell;
      const meta = columnMeta[col];
      const row = displayRows[cell[1]];
      if (!meta || !row) return;

      if (meta.type === "ai" && meta.aiColumnId) {
        onAiCellClick?.(meta.aiColumnId, String(row._id));
      }
    },
    [columnMeta, displayRows, onAiCellClick]
  );

  // "+" add column button as right element — tall, prominent like reference
  const addColumnButton = useMemo(
    () =>
      onAddColumn ? (
        <button
          onClick={onAddColumn}
          className="flex h-full w-[50px] items-center justify-center border-l border-border bg-background text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          title="Add column"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : undefined,
    [onAddColumn]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border">
      <DataEditor
        columns={gridColumns}
        rows={displayRows.length}
        getCellContent={getCellContent}
        customRenderers={customRenderers}
        theme={theme}
        getRowThemeOverride={getRowThemeOverride}
        drawHeader={drawHeader}
        freezeColumns={0}
        rowMarkers="both"
        rowSelect="multi"
        columnSelect="none"
        rangeSelect="cell"
        gridSelection={selection}
        onGridSelectionChange={setSelection}
        smoothScrollX
        smoothScrollY
        rowHeight={40}
        headerHeight={36}
        width="100%"
        height="100%"
        rightElement={addColumnButton}
        rightElementProps={{ fill: true, sticky: false }}
        onHeaderClicked={onHeaderClicked}
        onHeaderMenuClick={onHeaderMenuClick}
        onHeaderContextMenu={(col, event) => {
          event.preventDefault();
          // Right-click always opens the context menu (even for AI columns)
          const title = gridColumns[col]?.title ?? "";
          setHeaderMenu({
            col,
            title,
            position: {
              x: event.bounds.x,
              y: event.bounds.y + event.bounds.height,
            },
          });
        }}
        onColumnResize={onColumnResize}
        onColumnMoved={onColumnMoved}
        onCellClicked={onCellClicked}
        onCellActivated={onCellActivated}
      />
      {headerMenu && (() => {
        const meta = columnMeta[headerMenu.col];
        const filterableTypes = new Set(["badge", "text", "entity-name"]);
        const isFilterable = meta && filterableTypes.has(meta.type);
        const menuUniqueValues = isFilterable
          ? getUniqueColumnValues(rows, meta.accessor)
          : undefined;
        const menuActiveFilter = meta?.id ? columnFilters[meta.id] : undefined;

        // Compute scored row count for AI columns
        let menuScoredRows = 0;
        if (meta?.type === "ai" && meta.aiColumnId) {
          for (const row of rows) {
            const entry = getScore(scores, meta.aiColumnId, String(row._id));
            if (entry && entry.score != null) menuScoredRows++;
          }
        }

        return (
          <HeaderMenu
            col={headerMenu.col}
            columnTitle={headerMenu.title}
            columnId={meta?.id ?? ""}
            aiColumnId={meta?.aiColumnId}
            isFrozen={false}
            isAiColumn={meta?.type === "ai"}
            isCustomColumn={!!meta?.customColumnId}
            position={headerMenu.position}
            isScoring={isScoring}
            totalRows={rows.length}
            scoredRows={menuScoredRows}
            onSort={handleSort}
            onEditColumn={handleEditColumn}
            onEditCustomColumn={handleEditCustomColumn}
            onRenameColumn={onRenameColumn}
            onDeleteColumn={onDeleteColumn}
            onRunColumn={onRunColumn}
            uniqueValues={menuUniqueValues}
            activeFilter={menuActiveFilter}
            onFilter={setColumnFilter}
            onInsertColumn={onInsertColumn ? (side) => {
              onInsertColumn(meta?.id ?? "", side);
              setHeaderMenu(null);
            } : undefined}
            onClose={() => setHeaderMenu(null)}
          />
        );
      })()}
    </div>
  );
}
