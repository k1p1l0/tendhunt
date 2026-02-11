"use client";

import { useCallback, useEffect, useMemo, useState, useRef, use } from "react";
import Link from "next/link";
import { Loader2, Crosshair, ChevronRight, AlertTriangle, X } from "lucide-react";
import { ScannerHeader } from "@/components/scanners/scanner-header";
import { ScannerDataGrid } from "@/components/scanners/grid/scanner-data-grid";
import type { RunColumnOptions } from "@/components/scanners/grid/header-menu";
import { AddColumnModal } from "@/components/scanners/add-column-modal";
import { ThresholdControls } from "@/components/scanners/threshold-controls";
import { AiCellDrawer } from "@/components/scanners/ai-cell-drawer";
import { EditColumnSheet, type EditColumnData } from "@/components/scanners/edit-column-sheet";
import { EditScannerDialog } from "@/components/scanners/edit-scanner-dialog";
import { EntityDetailSheet } from "@/components/scanners/entity-detail-sheet";
import { getColumnsForType } from "@/components/scanners/table-columns";
import type { ColumnDef } from "@/components/scanners/table-columns";
import { isTextUseCase } from "@/lib/ai-column-config";
import { useScannerStore } from "@/stores/scanner-store";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";
import type { ScannerType } from "@/models/scanner";

interface CustomColumnData {
  columnId: string;
  name: string;
  accessor: string;
  dataType: string;
}

interface ScannerData {
  _id: string;
  name: string;
  type: ScannerType;
  description?: string;
  searchQuery?: string;
  aiColumns: Array<{ columnId: string; name: string; prompt: string; useCase?: string; model?: string }>;
  customColumns?: CustomColumnData[];
  scores: Array<{
    entityId: string;
    columnId: string;
    score?: number;
    value?: string;
    reasoning?: string;
  }>;
  filters?: Record<string, unknown>;
  columnRenames?: Record<string, string>;
  columnFilters?: Record<string, string[]>;
  autoRun?: boolean;
  lastScoredAt?: string;
}

interface SSEEvent {
  type: string;
  columnId?: string;
  columnName?: string;
  entityId?: string;
  score?: number | null;
  reasoning?: string;
  response?: string;
  scored?: number;
  total?: number;
  message?: string;
  fatal?: boolean;
}

const DATA_ENDPOINTS: Record<ScannerType, string> = {
  rfps: "/api/contracts",
  meetings: "/api/signals",
  buyers: "/api/buyers",
};

const DATA_KEYS: Record<ScannerType, string> = {
  rfps: "contracts",
  meetings: "signals",
  buyers: "buyers",
};

/**
 * Reads an SSE stream and calls onEvent for each parsed event.
 */
async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6)) as SSEEvent;
          onEvent(event);
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

export default function ScannerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [scanner, setScanner] = useState<ScannerData | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<{
    referenceColumnId: string;
    side: "left" | "right";
  } | null>(null);

  // Drawer state for AI cell details
  const [drawerCell, setDrawerCell] = useState<{
    columnId: string;
    entityId: string;
  } | null>(null);

  // Edit column sheet state
  const [editColumn, setEditColumn] = useState<EditColumnData | null>(null);

  // Edit scanner dialog state
  const [editScannerOpen, setEditScannerOpen] = useState(false);

  // Auto-run state
  const [autoRun, setAutoRun] = useState(false);

  // Entity detail sheet state (double-click row)
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(
    null
  );

  // Abort controller for cancelling active SSE scoring streams
  const scoringAbortRef = useRef<AbortController | null>(null);

  // Store refs for SSE callbacks (avoid stale closures)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const scannerRef = useRef(scanner);
  scannerRef.current = scanner;

  const setActiveScanner = useScannerStore((s) => s.setActiveScanner);
  const loadScores = useScannerStore((s) => s.loadScores);
  const setScore = useScannerStore((s) => s.setScore);
  const setIsScoring = useScannerStore((s) => s.setIsScoring);
  const setScoringProgress = useScannerStore((s) => s.setScoringProgress);
  const setColumnScoringProgress = useScannerStore((s) => s.setColumnScoringProgress);
  const clearColumnScoringProgress = useScannerStore((s) => s.clearColumnScoringProgress);
  const clearScores = useScannerStore((s) => s.clearScores);
  const isScoring = useScannerStore((s) => s.isScoring);
  const loadColumnFilters = useScannerStore((s) => s.loadColumnFilters);
  const columnFilters = useScannerStore((s) => s.columnFilters);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch scanner
      const scannerRes = await fetch(`/api/scanners/${id}`);
      if (!scannerRes.ok) {
        if (scannerRes.status === 404) {
          setError("Scanner not found");
          return;
        }
        throw new Error("Failed to load scanner");
      }
      const { scanner: scannerData } = (await scannerRes.json()) as {
        scanner: ScannerData;
      };
      setScanner(scannerData);
      setAutoRun(scannerData.autoRun ?? false);

      // 2. Set active scanner in store
      setActiveScanner(String(scannerData._id), scannerData.type);

      // 3. Load existing scores into store
      if (scannerData.scores && scannerData.scores.length > 0) {
        loadScores(
          scannerData.scores.map((s) => ({
            columnId: s.columnId,
            entityId: String(s.entityId),
            score: s.score,
            response: s.value ?? "",
            reasoning: s.reasoning,
          }))
        );
      }

      // 4. Restore saved column filters
      if (scannerData.columnFilters && typeof scannerData.columnFilters === "object") {
        loadColumnFilters(scannerData.columnFilters);
      }

      // 5. Generate column definitions
      const cols = getColumnsForType(scannerData.type, scannerData.aiColumns, scannerData.customColumns, scannerData.columnRenames);
      setColumns(cols);

      // 6. Fetch entity data based on scanner type
      const dataEndpoint = DATA_ENDPOINTS[scannerData.type];
      const dataKey = DATA_KEYS[scannerData.type];
      const dataRes = await fetch(dataEndpoint);
      if (!dataRes.ok) {
        throw new Error("Failed to load data");
      }
      const dataJson = await dataRes.json();
      const entityRows: Array<Record<string, unknown>> =
        dataJson[dataKey] || [];
      setRows(entityRows);
    } catch (err) {
      console.error("Scanner detail load error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load scanner data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, setActiveScanner, loadScores, loadColumnFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save column filters (debounced 500ms)
  const isInitialFilterLoad = useRef(true);
  useEffect(() => {
    // Skip the initial hydration — don't re-save what we just loaded
    if (isInitialFilterLoad.current) {
      isInitialFilterLoad.current = false;
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/scanners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnFilters }),
      }).catch((err) => console.error("Failed to save column filters:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [columnFilters, id]);

  /**
   * Helper: set all AI cells to queued state before scoring starts.
   */
  function setAllCellsLoading(
    aiColumns: Array<{ columnId: string }>,
    entityRows: Array<Record<string, unknown>>
  ) {
    for (const column of aiColumns) {
      for (const row of entityRows) {
        setScore(column.columnId, String(row._id), {
          isLoading: true,
          isQueued: true,
          response: "",
          reasoning: "",
        });
      }
    }
  }

  /**
   * Score All: full batch scoring of all AI columns.
   */
  async function handleScore() {
    const currentScanner = scannerRef.current;
    const currentRows = rowsRef.current;

    if (!currentScanner || currentRows.length === 0) return;

    setIsScoring(true);
    setScoringError(null);
    clearScores();
    setAllCellsLoading(currentScanner.aiColumns, currentRows);

    const abortController = new AbortController();
    scoringAbortRef.current = abortController;

    try {
      const response = await fetch(`/api/scanners/${id}/score`, {
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Score All error:", data.error);
        setScoringError(data.error || "Failed to start scoring");
        setIsScoring(false);
        return;
      }

      let fatalErrorSeen = false;
      // Track queued entities per column for progressive activation
      const columnQueues = new Map<string, Set<string>>();
      const CONCURRENCY = 2;

      await readSSEStream(response, (event) => {
        if (event.type === "column_start") {
          setScoringProgress(0, event.total ?? 0, event.columnId);
          if (event.columnId) {
            setColumnScoringProgress(event.columnId, 0, event.total ?? 0);

            // Build queue of all entity IDs for this column
            const queue = new Set<string>();
            for (const row of currentRows) {
              queue.add(String(row._id));
            }
            columnQueues.set(event.columnId, queue);

            // Promote first N from queued → active
            let activated = 0;
            for (const entityId of queue) {
              if (activated >= CONCURRENCY) break;
              setScore(event.columnId, entityId, {
                isLoading: true,
                response: "",
                reasoning: "",
              });
              queue.delete(entityId);
              activated++;
            }
          }
          lastProgressRef.current = Date.now();
        }
        if (event.type === "progress" && event.columnId && event.entityId) {
          setScoringProgress(
            event.scored ?? 0,
            event.total ?? 0,
            event.columnId
          );
          setColumnScoringProgress(event.columnId, event.scored ?? 0, event.total ?? 0);
          setScore(event.columnId, event.entityId, {
            score: event.score ?? undefined,
            response: event.response ?? "",
            reasoning: event.reasoning ?? "",
          });

          // Promote next queued entity → active
          const queue = columnQueues.get(event.columnId);
          if (queue && queue.size > 0) {
            const next = queue.values().next().value;
            if (next) {
              setScore(event.columnId, next, {
                isLoading: true,
                response: "",
                reasoning: "",
              });
              queue.delete(next);
            }
          }

          lastProgressRef.current = Date.now();
        }
        if (event.type === "error" && event.message && !fatalErrorSeen) {
          fatalErrorSeen = true;
          const msg = event.message.includes("credit balance")
            ? "Anthropic API credits exhausted. Please top up at console.anthropic.com."
            : event.message.includes("invalid x-api-key")
              ? "Invalid Anthropic API key. Check your configuration."
              : `Scoring error: ${event.message}`;
          setScoringError(msg);
        }
        if (event.type === "complete") {
          clearColumnScoringProgress();
          setIsScoring(false);
        }
      });

      // Ensure scoring ends even if complete event was missed
      clearColumnScoringProgress();
      setIsScoring(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Score All stream error:", err);
      setScoringError("Scoring connection lost. Please try again.");
      clearColumnScoringProgress();
      setIsScoring(false);
    } finally {
      scoringAbortRef.current = null;
    }
  }

  /**
   * Toggle auto-run: persist to DB and optionally trigger initial scoring.
   */
  async function handleToggleAutoRun(enabled: boolean) {
    setAutoRun(enabled);

    try {
      await fetch(`/api/scanners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRun: enabled }),
      });

      // If enabling and no scores yet, trigger initial scoring
      if (enabled && scannerRef.current && scannerRef.current.scores.length === 0) {
        handleScore();
      }
    } catch (err) {
      console.error("Failed to save autoRun:", err);
      setAutoRun(!enabled); // Revert on failure
    }
  }

  // Auto-run interval polling (5 minutes)
  const handleScoreRef = useRef(handleScore);
  handleScoreRef.current = handleScore;

  useEffect(() => {
    if (!autoRun || isScoring) return;

    const interval = setInterval(() => {
      handleScoreRef.current();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRun, isScoring]);

  // Safety: auto-cancel stuck scoring after 3 minutes of no progress
  const lastProgressRef = useRef<number>(0);
  useEffect(() => {
    if (!isScoring) {
      lastProgressRef.current = 0;
      return;
    }
    lastProgressRef.current = Date.now();
    const check = setInterval(() => {
      if (Date.now() - lastProgressRef.current > 3 * 60 * 1000) {
        console.warn("Scoring stuck — auto-cancelling after 3 min timeout");
        clearColumnScoringProgress();
        setIsScoring(false);
      }
    }, 10_000);
    return () => clearInterval(check);
  }, [isScoring, clearColumnScoringProgress, setIsScoring]);

  // Update lastProgress timestamp on any scoring progress
  const scoringProgress = useScannerStore((s) => s.scoringProgress);
  useEffect(() => {
    if (isScoring && scoringProgress.scored > 0) {
      lastProgressRef.current = Date.now();
    }
  }, [isScoring, scoringProgress.scored]);

  /**
   * Cancel any active scoring stream and clean up UI state.
   */
  function cancelScoring() {
    if (scoringAbortRef.current) {
      scoringAbortRef.current.abort();
      scoringAbortRef.current = null;
    }
    clearColumnScoringProgress();
    setIsScoring(false);

    // Clear loading/queued states on any cells still showing spinners
    const scores = useScannerStore.getState().scores;
    for (const [key, entry] of Object.entries(scores)) {
      if (entry.isLoading || entry.isQueued) {
        const [colId, entityId] = key.split(":");
        setScore(colId, entityId, { response: "", reasoning: "" });
      }
    }

    // Reload to get whatever was scored before cancellation
    reloadScores();
  }

  /**
   * Compute filtered row IDs based on active column filters.
   * Returns null if no filters are active (meaning: score all).
   */
  function getFilteredEntityIds(): string[] | null {
    const filters = useScannerStore.getState().columnFilters;
    const activeFilters = Object.entries(filters).filter(
      ([, vals]) => vals.length > 0
    );
    if (activeFilters.length === 0) return null;

    const currentRows = rowsRef.current;
    const cols = columns;

    const filtered = currentRows.filter((row) =>
      activeFilters.every(([colId, allowedValues]) => {
        const col = cols.find((c) => c.id === colId);
        if (!col) return true;
        const raw = row[col.accessor];
        if (raw == null) return false;
        const val = String(raw).trim();
        return allowedValues.includes(val);
      })
    );

    return filtered.map((r) => String(r._id));
  }

  async function scoreSingleColumn(
    columnId: string,
    options?: { limit?: number; force?: boolean; entityIds?: string[] }
  ) {
    const currentRows = rowsRef.current;
    const scores = useScannerStore.getState().scores;
    const CONCURRENCY = 2;

    // Determine which rows to set loading state on
    const targetIds = options?.entityIds
      ? new Set(options.entityIds)
      : null;

    // Track queued entities for progressive activation
    const queuedEntityIds = new Set<string>();

    for (const row of currentRows) {
      const entityId = String(row._id);
      // Skip rows not in the target set (when scoped to filtered rows)
      if (targetIds && !targetIds.has(entityId)) continue;
      const existing = scores[`${columnId}:${entityId}`];
      const hasScore = existing && existing.score != null;
      if (options?.force || !hasScore) {
        setScore(columnId, entityId, {
          isLoading: true,
          isQueued: true,
          response: "",
          reasoning: "",
        });
        queuedEntityIds.add(entityId);
      }
    }

    setIsScoring(true);
    setScoringError(null);

    // Create a fresh abort controller for this scoring run
    const abortController = new AbortController();
    scoringAbortRef.current = abortController;

    try {
      const response = await fetch(`/api/scanners/${id}/score-column`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId,
          ...(options?.limit && { limit: options.limit }),
          ...(options?.force && { force: true }),
          ...(options?.entityIds && { entityIds: options.entityIds }),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Score column error:", data.error);
        setScoringError(data.error || "Failed to start scoring");
        // Clear loading/queued states
        for (const row of currentRows) {
          const entityId = String(row._id);
          const existing = useScannerStore.getState().scores[`${columnId}:${entityId}`];
          if (existing?.isLoading || existing?.isQueued) {
            setScore(columnId, entityId, { response: "", reasoning: "" });
          }
        }
        setIsScoring(false);
        return;
      }

      let fatalErrorSeen = false;

      await readSSEStream(response, (event) => {
        if (event.type === "column_start") {
          setScoringProgress(0, event.total ?? 0, event.columnId);
          if (event.columnId) {
            setColumnScoringProgress(event.columnId, 0, event.total ?? 0);
          }

          // Promote first N queued entities → active
          let activated = 0;
          for (const entityId of queuedEntityIds) {
            if (activated >= CONCURRENCY) break;
            setScore(columnId, entityId, {
              isLoading: true,
              response: "",
              reasoning: "",
            });
            queuedEntityIds.delete(entityId);
            activated++;
          }

          lastProgressRef.current = Date.now();
        }
        if (event.type === "progress" && event.columnId && event.entityId) {
          setScoringProgress(
            event.scored ?? 0,
            event.total ?? 0,
            event.columnId
          );
          setColumnScoringProgress(event.columnId, event.scored ?? 0, event.total ?? 0);
          setScore(event.columnId, event.entityId, {
            score: event.score ?? undefined,
            response: event.response ?? "",
            reasoning: event.reasoning ?? "",
          });

          // Promote next queued entity → active
          if (queuedEntityIds.size > 0) {
            const next = queuedEntityIds.values().next().value;
            if (next) {
              setScore(columnId, next, {
                isLoading: true,
                response: "",
                reasoning: "",
              });
              queuedEntityIds.delete(next);
            }
          }

          lastProgressRef.current = Date.now();
        }
        if (event.type === "error" && event.message && !fatalErrorSeen) {
          // Surface the first error message to the user
          fatalErrorSeen = true;
          const msg = event.message.includes("credit balance")
            ? "Anthropic API credits exhausted. Please top up at console.anthropic.com."
            : event.message.includes("invalid x-api-key")
              ? "Invalid Anthropic API key. Check your configuration."
              : `Scoring error: ${event.message}`;
          setScoringError(msg);

          // If fatal, abort the rest of the scoring run
          if (event.fatal) {
            scoringAbortRef.current?.abort();
          }
        }
        if (event.type === "complete") {
          clearColumnScoringProgress();
          setIsScoring(false);
          reloadScores();
        }
      });

      clearColumnScoringProgress();
      setIsScoring(false);
    } catch (err) {
      // AbortError is expected when user cancels — don't log as error
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Score column stream error:", err);
      setScoringError("Scoring connection lost. Please try again.");
      clearColumnScoringProgress();
      setIsScoring(false);
    } finally {
      scoringAbortRef.current = null;
    }
  }

  /**
   * Reload scores from server to sync state after scoring completes.
   */
  async function reloadScores() {
    try {
      const scannerRes = await fetch(`/api/scanners/${id}`);
      if (!scannerRes.ok) return;
      const { scanner: scannerData } = (await scannerRes.json()) as { scanner: ScannerData };
      if (scannerData.scores && scannerData.scores.length > 0) {
        loadScores(
          scannerData.scores.map((s) => ({
            columnId: s.columnId,
            entityId: String(s.entityId),
            score: s.score,
            response: s.value ?? "",
            reasoning: s.reasoning,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to reload scores:", err);
    }
  }

  /**
   * If insertPosition is set, move the last column (the newly added one)
   * to the correct position relative to the reference column, then clear state.
   */
  function reorderWithInsertPosition(cols: ColumnDef[]): ColumnDef[] {
    if (!insertPosition || cols.length < 2) {
      setInsertPosition(null);
      return cols;
    }

    const refIndex = cols.findIndex((c) => c.id === insertPosition.referenceColumnId);
    if (refIndex === -1) {
      setInsertPosition(null);
      return cols;
    }

    const reordered = [...cols];
    const newCol = reordered.pop()!;
    const targetIndex = insertPosition.side === "left" ? refIndex : refIndex + 1;
    reordered.splice(targetIndex, 0, newCol);
    setInsertPosition(null);
    return reordered;
  }

  /**
   * Handle a new column being added from the modal (AI or custom data).
   */
  async function handleColumnAdded(column: {
    columnId: string;
    name: string;
    kind: "ai" | "custom";
    prompt?: string;
    accessor?: string;
    dataType?: string;
    useCase?: string;
    model?: string;
  }) {
    if (!scanner) return;

    if (column.kind === "custom") {
      // Custom data column — add to customColumns, rebuild columns, no scoring
      const newCustomCol: CustomColumnData = {
        columnId: column.columnId,
        name: column.name,
        accessor: column.accessor!,
        dataType: column.dataType!,
      };
      const updatedCustomColumns = [...(scanner.customColumns ?? []), newCustomCol];
      const updatedScanner = { ...scanner, customColumns: updatedCustomColumns };
      setScanner(updatedScanner);
      const newCols = getColumnsForType(updatedScanner.type, updatedScanner.aiColumns, updatedCustomColumns, updatedScanner.columnRenames);
      setColumns(reorderWithInsertPosition(newCols));
    } else {
      // AI column — add to aiColumns, rebuild columns, trigger scoring
      const aiCol = {
        columnId: column.columnId,
        name: column.name,
        prompt: column.prompt!,
        useCase: column.useCase,
        model: column.model,
      };
      const updatedAiColumns = [...scanner.aiColumns, aiCol];
      const updatedScanner = { ...scanner, aiColumns: updatedAiColumns };
      setScanner(updatedScanner);
      const newCols = getColumnsForType(updatedScanner.type, updatedAiColumns, updatedScanner.customColumns, updatedScanner.columnRenames);
      setColumns(reorderWithInsertPosition(newCols));
      const filteredIds = getFilteredEntityIds();
      await scoreSingleColumn(column.columnId, {
        ...(filteredIds && { entityIds: filteredIds }),
      });
    }
  }

  function handleAddColumn() {
    setInsertPosition(null);
    setAddColumnOpen(true);
  }

  function handleInsertColumn(referenceColumnId: string, side: "left" | "right") {
    setInsertPosition({ referenceColumnId, side });
    setAddColumnOpen(true);
  }

  function handleEditScanner() {
    setEditScannerOpen(true);
  }

  function handleScannerUpdated(updated: {
    name: string;
    description: string;
    searchQuery: string;
    filters: Record<string, unknown>;
  }) {
    if (!scanner) return;
    const updatedScanner = {
      ...scanner,
      name: updated.name,
      description: updated.description,
      searchQuery: updated.searchQuery,
      filters: updated.filters,
    };
    setScanner(updatedScanner);
  }

  function handleRunColumn(options: RunColumnOptions) {
    const filteredIds = getFilteredEntityIds();
    scoreSingleColumn(options.columnId, {
      limit: options.limit,
      force: options.force,
      ...(filteredIds && { entityIds: filteredIds }),
    });
  }

  function handleAiCellClick(columnId: string, entityId: string) {
    setDrawerCell({ columnId, entityId });
  }

  function handleEditColumn(columnId: string) {
    if (!scanner) return;
    const col = scanner.aiColumns.find((c) => c.columnId === columnId);
    if (col) {
      setEditColumn({
        columnId: col.columnId,
        name: col.name,
        prompt: col.prompt,
        useCase: col.useCase,
        model: col.model,
      });
    }
  }

  // Edit custom column — for now, just log/no-op since we'd need a dedicated edit modal
  // The header menu "Edit Field" could re-open the add column modal in edit mode in a future iteration
  function handleEditCustomColumn(_columnId: string) {
    // TODO: implement custom column edit dialog
  }

  async function handleColumnUpdated(updated: EditColumnData, rescore: boolean) {
    if (!scanner) return;

    // Update local scanner state
    const updatedAiColumns = scanner.aiColumns.map((c) =>
      c.columnId === updated.columnId
        ? { ...c, name: updated.name, prompt: updated.prompt, useCase: updated.useCase, model: updated.model }
        : c
    );
    const updatedScanner = { ...scanner, aiColumns: updatedAiColumns };
    setScanner(updatedScanner);

    // Regenerate column definitions (name may have changed)
    const cols = getColumnsForType(updatedScanner.type, updatedAiColumns, updatedScanner.customColumns, updatedScanner.columnRenames);
    setColumns(cols);

    // Optionally re-score if prompt changed
    if (rescore) {
      await scoreSingleColumn(updated.columnId, { force: true });
    }
  }

  /**
   * Rename any column (core, custom, or AI).
   */
  async function handleRenameColumn(columnId: string, newName: string) {
    if (!scanner) return;

    // Check if it's an AI column
    const aiCol = scanner.aiColumns.find((c) => c.columnId === columnId || `ai-${c.columnId}` === columnId);

    if (aiCol) {
      // AI column — update via PUT /columns endpoint
      await fetch(`/api/scanners/${id}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: aiCol.columnId, name: newName }),
      });

      const updatedAiColumns = scanner.aiColumns.map((c) =>
        c.columnId === aiCol.columnId ? { ...c, name: newName } : c
      );
      const updatedScanner = { ...scanner, aiColumns: updatedAiColumns };
      setScanner(updatedScanner);
      setColumns(getColumnsForType(updatedScanner.type, updatedAiColumns, updatedScanner.customColumns, updatedScanner.columnRenames));
      return;
    }

    // Check if it's a custom column
    const customCol = (scanner.customColumns ?? []).find(
      (c) => c.columnId === columnId || `custom-${c.columnId}` === columnId
    );

    if (customCol) {
      // Custom column — update name via PUT /columns with accessor to trigger custom path
      await fetch(`/api/scanners/${id}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: customCol.columnId, name: newName, accessor: customCol.accessor }),
      });

      const updatedCustomColumns = (scanner.customColumns ?? []).map((c) =>
        c.columnId === customCol.columnId ? { ...c, name: newName } : c
      );
      const updatedScanner = { ...scanner, customColumns: updatedCustomColumns };
      setScanner(updatedScanner);
      setColumns(getColumnsForType(updatedScanner.type, updatedScanner.aiColumns, updatedCustomColumns, updatedScanner.columnRenames));
      return;
    }

    // Core column — persist via PATCH /scanners/[id] columnRenames
    const updatedRenames = { ...scanner.columnRenames, [columnId]: newName };

    await fetch(`/api/scanners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnRenames: { [columnId]: newName } }),
    });

    const updatedScanner = { ...scanner, columnRenames: updatedRenames };
    setScanner(updatedScanner);
    setColumns(getColumnsForType(updatedScanner.type, updatedScanner.aiColumns, updatedScanner.customColumns, updatedRenames));
  }

  /**
   * Delete an AI or custom column (core columns cannot be deleted).
   */
  async function handleDeleteColumn(columnId: string) {
    if (!scanner) return;

    // Check AI columns first
    const aiCol = scanner.aiColumns.find((c) => c.columnId === columnId || `ai-${c.columnId}` === columnId);
    if (aiCol) {
      await fetch(`/api/scanners/${id}/columns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: aiCol.columnId }),
      });

      const updatedAiColumns = scanner.aiColumns.filter((c) => c.columnId !== aiCol.columnId);
      const updatedScanner = { ...scanner, aiColumns: updatedAiColumns };
      setScanner(updatedScanner);
      setColumns(getColumnsForType(updatedScanner.type, updatedAiColumns, updatedScanner.customColumns, updatedScanner.columnRenames));
      return;
    }

    // Check custom columns
    const customCol = (scanner.customColumns ?? []).find(
      (c) => c.columnId === columnId || `custom-${c.columnId}` === columnId
    );
    if (customCol) {
      await fetch(`/api/scanners/${id}/columns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: customCol.columnId }),
      });

      const updatedCustomColumns = (scanner.customColumns ?? []).filter((c) => c.columnId !== customCol.columnId);
      const updatedScanner = { ...scanner, customColumns: updatedCustomColumns };
      setScanner(updatedScanner);
      setColumns(getColumnsForType(updatedScanner.type, updatedScanner.aiColumns, updatedCustomColumns, updatedScanner.columnRenames));
    }
  }

  // Build column name map for progress bar and drawer
  const columnNames = useMemo(() => {
    if (!scanner) return {};
    const map: Record<string, string> = {};
    for (const col of scanner.aiColumns) {
      map[col.columnId] = col.name;
    }
    return map;
  }, [scanner]);

  // Resolve drawer entity and column names
  const drawerEntityName = useMemo(() => {
    if (!drawerCell) return "";
    const row = rows.find((r) => String(r._id) === drawerCell.entityId);
    if (!row) return "";
    return String(
      row.title || row.name || row.organizationName || row._id || ""
    );
  }, [drawerCell, rows]);

  const drawerColumnName = useMemo(() => {
    if (!drawerCell || !scanner) return "";
    return columnNames[drawerCell.columnId] || "AI Analysis";
  }, [drawerCell, scanner, columnNames]);

  const drawerUseCase = useMemo(() => {
    if (!drawerCell || !scanner) return undefined;
    const col = scanner.aiColumns.find((c) => c.columnId === drawerCell.columnId);
    return col?.useCase;
  }, [drawerCell, scanner]);

  // Get the primary (first score-mode) AI column ID for threshold controls
  const primaryColumnId = useMemo(() => {
    if (!scanner || scanner.aiColumns.length === 0) return undefined;
    const scoreCol = scanner.aiColumns.find((c) => !isTextUseCase(c.useCase));
    return scoreCol?.columnId;
  }, [scanner]);

  // Compute filtered row count for the header display
  const filteredRowCount = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(
      ([, vals]) => vals.length > 0
    );
    if (activeFilters.length === 0) return rows.length;

    return rows.filter((row) =>
      activeFilters.every(([colId, allowedValues]) => {
        const col = columns.find((c) => c.id === colId);
        if (!col) return true;
        const raw = row[col.accessor];
        if (raw == null) return false;
        const val = String(raw).trim();
        return allowedValues.includes(val);
      })
    ).length;
  }, [rows, columnFilters, columns]);

  // Push breadcrumb into the global header
  const { setBreadcrumb } = useBreadcrumb();
  useEffect(() => {
    setBreadcrumb(
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Crosshair className="h-4 w-4" />
          <span className="font-medium">TendHunt</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <Link
          href="/scanners"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Scanners
        </Link>
        {scanner && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {scanner.name}
            </span>
          </>
        )}
      </nav>
    );
    return () => setBreadcrumb(null);
  }, [scanner?.name, setBreadcrumb]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !scanner) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card py-16">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive font-medium">
            {error || "Scanner not found"}
          </p>
          <p className="text-xs text-muted-foreground">
            The scanner may have been deleted or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Sticky toolbar area */}
      <div className="shrink-0 space-y-3 px-1 pb-3">
        {/* Scanner Header */}
        <ScannerHeader
          scanner={{ ...scanner, autoRun }}
          rowCount={filteredRowCount}
          columnCount={columns.length}
          activeFilterCount={Object.values(columnFilters).filter((v) => v.length > 0).length}
          isScoring={isScoring}
          onToggleAutoRun={handleToggleAutoRun}
          onRunNow={handleScore}
          onCancelScoring={cancelScoring}
          onEditScanner={handleEditScanner}
        />

        {/* Inline toolbar row: threshold controls */}
        <div className="flex flex-wrap items-center gap-6">
          <ThresholdControls primaryColumnId={primaryColumnId} />
        </div>
      </div>

      {/* Scoring error banner */}
      {scoringError && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{scoringError}</span>
          <button
            onClick={() => setScoringError(null)}
            className="shrink-0 rounded-md p-0.5 hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Grid fills remaining space */}
      <div className="flex-1 min-h-0 px-1 pb-2">
        <ScannerDataGrid
          columns={columns}
          rows={rows}
          scannerType={scanner.type}
          onAiCellClick={handleAiCellClick}
          onScoreColumn={(colId) => {
            const filteredIds = getFilteredEntityIds();
            scoreSingleColumn(colId, {
              force: true,
              ...(filteredIds && { entityIds: filteredIds }),
            });
          }}
          onCancelScoring={cancelScoring}
          onRunColumn={handleRunColumn}
          onAddColumn={handleAddColumn}
          onEditColumn={handleEditColumn}
          onEditCustomColumn={handleEditCustomColumn}
          onRenameColumn={handleRenameColumn}
          onDeleteColumn={handleDeleteColumn}
          onRowDoubleClick={setDetailRow}
          onInsertColumn={handleInsertColumn}
        />
      </div>

      {/* AI Cell Drawer (side panel) */}
      <AiCellDrawer
        open={drawerCell !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerCell(null);
        }}
        columnId={drawerCell?.columnId ?? null}
        entityId={drawerCell?.entityId ?? null}
        columnName={drawerColumnName}
        entityName={drawerEntityName}
        scannerType={scanner.type}
        useCase={drawerUseCase}
      />

      {/* Add Column Modal */}
      <AddColumnModal
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        scannerId={id}
        scannerType={scanner.type}
        onColumnAdded={handleColumnAdded}
      />

      {/* Edit Column Sheet */}
      <EditColumnSheet
        open={editColumn !== null}
        onOpenChange={(open) => {
          if (!open) setEditColumn(null);
        }}
        column={editColumn}
        scannerId={id}
        onColumnUpdated={handleColumnUpdated}
      />

      {/* Edit Scanner Dialog */}
      <EditScannerDialog
        open={editScannerOpen}
        onOpenChange={setEditScannerOpen}
        scanner={scanner}
        onSaved={handleScannerUpdated}
      />

      {/* Entity Detail Sheet (double-click row) */}
      <EntityDetailSheet
        open={detailRow !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
        row={detailRow}
        scannerType={scanner.type}
        aiColumns={scanner.aiColumns}
      />
    </div>
  );
}
