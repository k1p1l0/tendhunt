import { GridCellKind, type GridCell } from "@glideapps/glide-data-grid";
import type { ColumnMeta } from "./glide-columns";
import {
  createScoreBadgeCell,
  createTextShimmerCell,
  createCategoryBadgeCell,
  createEntityNameCell,
} from "./custom-renderers";
import {
  resolveAccessor,
  formatDate,
  formatCurrency,
  formatNumber,
} from "./format-utils";
import type { ScoreEntry } from "@/stores/scanner-store";
import { isTextUseCase } from "@/lib/ai-column-config";

/**
 * Create a getCellContent callback for Glide DataEditor.
 * Captures columnMeta, displayRows, and scores as a closure.
 */
export function createGetCellContent(
  columnMeta: ColumnMeta[],
  displayRows: Array<Record<string, unknown>>,
  scores: Record<string, ScoreEntry>,
  getScore: (
    scores: Record<string, ScoreEntry>,
    columnId: string,
    entityId: string
  ) => ScoreEntry | undefined,
  isScoringActive?: boolean
) {
  return function getCellContent([col, row]: readonly [
    number,
    number,
  ]): GridCell {
    const meta = columnMeta[col];
    const rowData = displayRows[row];

    if (!meta || !rowData) {
      return {
        kind: GridCellKind.Text,
        data: "",
        displayData: "--",
        allowOverlay: false,
      };
    }

    // AI column — text mode vs score mode
    if (meta.type === "ai" && meta.aiColumnId) {
      const entityId = String(rowData._id);
      const entry = getScore(scores, meta.aiColumnId, entityId);

      if (isTextUseCase(meta.aiUseCase)) {
        // Text mode: show text shimmer skeleton while loading
        if (entry?.isLoading || entry?.isQueued) {
          return createTextShimmerCell();
        }
        const text = entry?.response || "";
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || "--",
          allowOverlay: false,
        };
      }

      // Score mode: queued shows shimmer bar, active shows spinner
      if (entry?.isQueued) {
        return createScoreBadgeCell(null, false, true);
      }
      if (entry?.isLoading) {
        return createScoreBadgeCell(null, true);
      }
      if (entry?.score != null) {
        return createScoreBadgeCell(entry.score, false);
      }
      // No score — show queued shimmer when scoring is active, dashed circle otherwise
      return createScoreBadgeCell(null, false, isScoringActive);
    }

    // Entity name with logo
    if (meta.type === "entity-name") {
      const name = resolveAccessor(rowData, meta.accessor);
      const logoName = meta.logoAccessor
        ? resolveAccessor(rowData, meta.logoAccessor)
        : name;
      const nameStr = name != null ? String(name) : "";
      const logoStr = logoName != null ? String(logoName) : nameStr;
      return createEntityNameCell(nameStr, logoStr);
    }

    const value = resolveAccessor(rowData, meta.accessor);

    switch (meta.type) {
      case "date": {
        const display = formatDate(value);
        return {
          kind: GridCellKind.Text,
          data: value != null ? String(value) : "",
          displayData: display,
          allowOverlay: false,
        };
      }

      case "currency": {
        const display = formatCurrency(value);
        return {
          kind: GridCellKind.Text,
          data: value != null ? String(value) : "",
          displayData: display,
          allowOverlay: false,
        };
      }

      case "number": {
        const num = value != null ? Number(value) : undefined;
        if (num == null || isNaN(num)) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: formatNumber(value),
          allowOverlay: false,
        };
      }

      case "badge": {
        const label = value != null ? String(value) : "";
        if (!label) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return createCategoryBadgeCell(label);
      }

      case "url": {
        const url = value != null ? String(value) : "";
        if (!url) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Uri,
          data: url,
          allowOverlay: true,
        };
      }

      case "email": {
        const email = value != null ? String(value) : "";
        if (!email) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Uri,
          data: `mailto:${email}`,
          allowOverlay: true,
        };
      }

      case "checkbox": {
        const checked = Boolean(value);
        return {
          kind: GridCellKind.Boolean,
          data: checked,
          allowOverlay: false,
        };
      }

      case "paragraph": {
        const text = value != null ? String(value) : "";
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || "--",
          allowOverlay: true,
          allowWrapping: true,
        };
      }

      case "text":
      default: {
        const text = value != null ? String(value) : "";
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || "--",
          allowOverlay: false,
        };
      }
    }
  };
}
