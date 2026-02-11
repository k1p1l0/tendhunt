"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannerHeader } from "@/components/scanners/scanner-header";
import { ScannerTable } from "@/components/scanners/scanner-table";
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

  const setActiveScanner = useScannerStore((s) => s.setActiveScanner);
  const loadScores = useScannerStore((s) => s.loadScores);
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

  function handleScore() {
    // Scoring will be implemented in Plan 04
    // For now, just a placeholder
    console.log("Score All clicked -- scoring will be wired in Plan 04");
  }

  function handleAddColumn() {
    // Add Column modal will be implemented in Plan 05
    console.log("Add Column clicked -- will be wired in Plan 05");
  }

  function handleEditScanner() {
    // Edit scanner -- future feature
    console.log("Edit Scanner clicked -- future feature");
  }

  function handleAiCellClick(columnId: string, entityId: string) {
    // Side drawer will be wired in Plan 05
    console.log("AI cell clicked:", columnId, entityId);
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
    </div>
  );
}
