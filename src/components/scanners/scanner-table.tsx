"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useScannerStore, getScore } from "@/stores/scanner-store";
import type { ColumnDef } from "@/components/scanners/table-columns";
import type { ScannerType } from "@/models/scanner";

const PAGE_SIZE = 50;

interface ScannerTableProps {
  columns: ColumnDef[];
  rows: Array<Record<string, unknown>>;
  scannerType: ScannerType;
  onAiCellClick?: (columnId: string, entityId: string) => void;
}

/** Resolve a dot-path accessor from a row object */
function resolveAccessor(row: Record<string, unknown>, accessor: string): unknown {
  const parts = accessor.split(".");
  let value: unknown = row;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/** Format a date value as "DD MMM YYYY" */
function formatDate(value: unknown): string {
  if (!value) return "--";
  const d = new Date(value as string | number);
  if (isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Format a currency value as GBP */
function formatCurrency(value: unknown): string {
  if (value == null || value === "") return "--";
  const num = Number(value);
  if (isNaN(num)) return "--";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format a number */
function formatNumber(value: unknown): string {
  if (value == null || value === "") return "--";
  const num = Number(value);
  if (isNaN(num)) return "--";
  return new Intl.NumberFormat("en-GB").format(num);
}

/** Score badge with color coding */
function ScoreBadge({ score }: { score: number }) {
  let colorClass = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (score >= 7) {
    colorClass = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  } else if (score >= 4) {
    colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  }
  return (
    <Badge variant="outline" className={colorClass}>
      {score.toFixed(1)}
    </Badge>
  );
}

export function ScannerTable({
  columns,
  rows,
  onAiCellClick,
}: ScannerTableProps) {
  const [page, setPage] = useState(1);
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const scores = useScannerStore((s) => s.scores);
  const threshold = useScannerStore((s) => s.threshold);
  const hideBelow = useScannerStore((s) => s.hideBelow);

  // Find first AI column for threshold logic
  const firstAiColumn = useMemo(
    () => columns.find((c) => c.type === "ai"),
    [columns]
  );

  // Sorted rows
  const sortedRows = useMemo(() => {
    const arr = [...rows];

    if (sortColumnId) {
      const col = columns.find((c) => c.id === sortColumnId);
      if (col) {
        arr.sort((a, b) => {
          let aVal: unknown;
          let bVal: unknown;

          if (col.type === "ai" && col.aiColumnId) {
            const aEntry = getScore(scores, col.aiColumnId, String(a._id));
            const bEntry = getScore(scores, col.aiColumnId, String(b._id));
            aVal = aEntry?.score ?? -1;
            bVal = bEntry?.score ?? -1;
          } else {
            aVal = resolveAccessor(a, col.accessor);
            bVal = resolveAccessor(b, col.accessor);
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
    } else if (firstAiColumn?.aiColumnId) {
      // Default: sort by first AI column score descending
      const colId = firstAiColumn.aiColumnId;
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
  }, [rows, sortColumnId, sortAsc, columns, scores, firstAiColumn]);

  // Filter by threshold
  const filteredRows = useMemo(() => {
    if (!firstAiColumn?.aiColumnId) return sortedRows;
    const colId = firstAiColumn.aiColumnId;

    if (hideBelow) {
      return sortedRows.filter((row) => {
        const entry = getScore(scores, colId, String(row._id));
        if (entry?.score == null) return true; // show unscored
        return entry.score >= threshold;
      });
    }

    return sortedRows;
  }, [sortedRows, firstAiColumn, scores, threshold, hideBelow]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);

  const handleSort = useCallback(
    (colId: string) => {
      if (sortColumnId === colId) {
        setSortAsc((prev) => !prev);
      } else {
        setSortColumnId(colId);
        setSortAsc(false);
      }
    },
    [sortColumnId]
  );

  /** Check if a row should be dimmed (below threshold but not hidden) */
  function isRowDimmed(row: Record<string, unknown>): boolean {
    if (hideBelow || !firstAiColumn?.aiColumnId) return false;
    const entry = getScore(scores, firstAiColumn.aiColumnId, String(row._id));
    if (entry?.score == null) return false;
    return entry.score < threshold;
  }

  /** Render a cell based on column type */
  function renderCell(
    col: ColumnDef,
    row: Record<string, unknown>
  ): React.ReactNode {
    if (col.type === "ai") {
      const entityId = String(row._id);
      const entry = col.aiColumnId
        ? getScore(scores, col.aiColumnId, entityId)
        : undefined;

      if (entry?.isLoading) {
        return <Skeleton className="h-5 w-16" />;
      }

      if (entry) {
        if (entry.score != null) {
          return (
            <button
              onClick={() =>
                onAiCellClick?.(col.aiColumnId ?? "", entityId)
              }
              className="cursor-pointer"
            >
              <ScoreBadge score={entry.score} />
            </button>
          );
        }
        // Text-only response
        return (
          <button
            onClick={() =>
              onAiCellClick?.(col.aiColumnId ?? "", entityId)
            }
            className="cursor-pointer text-left text-xs text-muted-foreground line-clamp-1 max-w-[120px]"
          >
            {entry.response}
          </button>
        );
      }

      // No score entry -- empty cell
      return (
        <div className="h-5 w-full rounded border border-dashed border-muted-foreground/20" />
      );
    }

    const value = resolveAccessor(row, col.accessor);

    switch (col.type) {
      case "date":
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(value)}
          </span>
        );

      case "currency":
        return (
          <span className="text-sm font-medium whitespace-nowrap">
            {formatCurrency(value)}
          </span>
        );

      case "number":
        return (
          <span className="text-sm tabular-nums">{formatNumber(value)}</span>
        );

      case "badge":
        if (!value) return <span className="text-sm text-muted-foreground">--</span>;
        return (
          <Badge variant="secondary" className="text-xs">
            {String(value)}
          </Badge>
        );

      case "text":
      default:
        if (!value) return <span className="text-sm text-muted-foreground">--</span>;
        return (
          <span
            className={`text-sm ${col.truncate ? "line-clamp-2" : ""}`}
          >
            {String(value)}
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={`${col.width ?? ""} cursor-pointer select-none hover:bg-muted/50`}
                  onClick={() => handleSort(col.id)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-16"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, idx) => (
                <TableRow
                  key={String(row._id) || idx}
                  className={`${
                    idx % 2 === 0 ? "bg-muted/30" : ""
                  } ${isRowDimmed(row) ? "opacity-40" : ""}`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.width ?? ""}>
                      {renderCell(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {startIdx + 1}-
            {Math.min(startIdx + PAGE_SIZE, filteredRows.length)} of{" "}
            {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span>
              Page {clampedPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
