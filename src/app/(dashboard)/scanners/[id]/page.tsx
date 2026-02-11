"use client";

import { useCallback, useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannerHeader } from "@/components/scanners/scanner-header";
import { ScannerTable } from "@/components/scanners/scanner-table";
import { AddColumnModal } from "@/components/scanners/add-column-modal";
import { getColumnsForType } from "@/components/scanners/table-columns";
import type { ColumnDef } from "@/components/scanners/table-columns";
import { useScannerStore } from "@/stores/scanner-store";
import type { ScannerType } from "@/models/scanner";

interface ScannerData {
  _id: string;
  name: string;
  type: ScannerType;
  description?: string;
  searchQuery?: string;
  aiColumns: Array<{ columnId: string; name: string; prompt: string }>;
  scores: Array<{
    entityId: string;
    columnId: string;
    score?: number;
    value?: string;
    reasoning?: string;
  }>;
  filters?: Record<string, unknown>;
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
 * Handles buffering for partial messages.
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
  const router = useRouter();

  const [scanner, setScanner] = useState<ScannerData | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);

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
  const clearScores = useScannerStore((s) => s.clearScores);
  const isScoring = useScannerStore((s) => s.isScoring);

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

      // 4. Generate column definitions
      const cols = getColumnsForType(scannerData.type, scannerData.aiColumns);
      setColumns(cols);

      // 5. Fetch entity data based on scanner type
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
  }, [id, setActiveScanner, loadScores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Helper: set all AI cells to loading state before scoring starts.
   */
  function setAllCellsLoading(
    aiColumns: Array<{ columnId: string }>,
    entityRows: Array<Record<string, unknown>>
  ) {
    for (const column of aiColumns) {
      for (const row of entityRows) {
        setScore(column.columnId, String(row._id), {
          isLoading: true,
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
    clearScores();
    setAllCellsLoading(currentScanner.aiColumns, currentRows);

    try {
      const response = await fetch(`/api/scanners/${id}/score`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Score All error:", data.error);
        setIsScoring(false);
        return;
      }

      await readSSEStream(response, (event) => {
        if (event.type === "column_start") {
          setScoringProgress(0, event.total ?? 0, event.columnId);
        }
        if (event.type === "progress" && event.columnId && event.entityId) {
          setScoringProgress(
            event.scored ?? 0,
            event.total ?? 0,
            event.columnId
          );
          setScore(event.columnId, event.entityId, {
            score: event.score ?? undefined,
            response: event.response ?? "",
            reasoning: event.reasoning ?? "",
          });
        }
        if (event.type === "complete") {
          setIsScoring(false);
        }
      });

      // Ensure scoring ends even if complete event was missed
      setIsScoring(false);
    } catch (err) {
      console.error("Score All stream error:", err);
      setIsScoring(false);
    }
  }

  /**
   * Score a single column for all entities (used after adding a new column).
   */
  async function scoreSingleColumn(columnId: string) {
    const currentRows = rowsRef.current;

    // Set loading state for just this column
    for (const row of currentRows) {
      setScore(columnId, String(row._id), {
        isLoading: true,
        response: "",
        reasoning: "",
      });
    }

    setIsScoring(true);

    try {
      const response = await fetch(`/api/scanners/${id}/score-column`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Score column error:", data.error);
        setIsScoring(false);
        return;
      }

      await readSSEStream(response, (event) => {
        if (event.type === "column_start") {
          setScoringProgress(0, event.total ?? 0, event.columnId);
        }
        if (event.type === "progress" && event.columnId && event.entityId) {
          setScoringProgress(
            event.scored ?? 0,
            event.total ?? 0,
            event.columnId
          );
          setScore(event.columnId, event.entityId, {
            score: event.score ?? undefined,
            response: event.response ?? "",
            reasoning: event.reasoning ?? "",
          });
        }
        if (event.type === "complete") {
          setIsScoring(false);
        }
      });

      setIsScoring(false);
    } catch (err) {
      console.error("Score column stream error:", err);
      setIsScoring(false);
    }
  }

  /**
   * Handle a new column being added from the modal.
   * Updates local state and triggers single-column scoring.
   */
  async function handleColumnAdded(column: {
    columnId: string;
    name: string;
    prompt: string;
  }) {
    if (!scanner) return;

    // Update local scanner data with new column
    const updatedAiColumns = [...scanner.aiColumns, column];
    const updatedScanner = { ...scanner, aiColumns: updatedAiColumns };
    setScanner(updatedScanner);

    // Regenerate column definitions with the new AI column
    const cols = getColumnsForType(updatedScanner.type, updatedAiColumns);
    setColumns(cols);

    // Trigger scoring for the new column only
    await scoreSingleColumn(column.columnId);
  }

  function handleAddColumn() {
    setAddColumnOpen(true);
  }

  function handleEditScanner() {
    // Edit scanner -- future feature
    console.log("Edit Scanner clicked -- future feature");
  }

  function handleAiCellClick(columnId: string, entityId: string) {
    // For now, show the reasoning in a temporary alert-like UX.
    // Plan 06 will add the full side drawer.
    const scores = useScannerStore.getState().scores;
    const key = `${columnId}:${entityId}`;
    const entry = scores[key];

    if (entry) {
      console.log("AI cell details:", {
        columnId,
        entityId,
        score: entry.score,
        reasoning: entry.reasoning,
        response: entry.response,
      });
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/scanners")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scanners
        </Button>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !scanner) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/scanners")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scanners
        </Button>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/scanners")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scanners
      </Button>

      {/* Scanner Header */}
      <ScannerHeader
        scanner={scanner}
        rowCount={rows.length}
        onScore={handleScore}
        onAddColumn={handleAddColumn}
        onEditScanner={handleEditScanner}
        isScoring={isScoring}
      />

      {/* Scanner Table */}
      <ScannerTable
        columns={columns}
        rows={rows}
        scannerType={scanner.type}
        onAiCellClick={handleAiCellClick}
      />

      {/* Add Column Modal */}
      <AddColumnModal
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        scannerId={id}
        onColumnAdded={handleColumnAdded}
      />
    </div>
  );
}
