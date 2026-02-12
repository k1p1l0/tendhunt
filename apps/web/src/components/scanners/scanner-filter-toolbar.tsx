"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { useScannerStore } from "@/stores/scanner-store";
import type { ColumnDef } from "@/components/scanners/table-columns";

interface ScannerFilterToolbarProps {
  columns: ColumnDef[];
}

export function ScannerFilterToolbar({ columns }: ScannerFilterToolbarProps) {
  const columnFilters = useScannerStore((s) => s.columnFilters);
  const setColumnFilter = useScannerStore((s) => s.setColumnFilter);
  const clearColumnFilters = useScannerStore((s) => s.clearColumnFilters);

  const [removingChips, setRemovingChips] = useState<Set<string>>(new Set());

  const activeFilters = Object.entries(columnFilters).filter(
    ([, values]) => values.length > 0
  );

  const hasFilters = activeFilters.length > 0 || removingChips.size > 0;

  function handleRemoveChip(columnId: string, value: string) {
    const chipKey = `${columnId}:${value}`;
    setRemovingChips((prev) => new Set(prev).add(chipKey));
    setTimeout(() => {
      const current = useScannerStore.getState().columnFilters[columnId] ?? [];
      setColumnFilter(columnId, current.filter((v) => v !== value));
      setRemovingChips((prev) => {
        const next = new Set(prev);
        next.delete(chipKey);
        return next;
      });
    }, 150);
  }

  function handleClearAll() {
    const allKeys = new Set<string>();
    Object.entries(columnFilters).forEach(([colId, vals]) => {
      vals.forEach((v) => allKeys.add(`${colId}:${v}`));
    });
    setRemovingChips(allKeys);
    setTimeout(() => {
      clearColumnFilters();
      setRemovingChips(new Set());
    }, 150);
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-1 transition-all duration-200 overflow-hidden ${
        hasFilters ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Filters</span>
      </div>

      {activeFilters.map(([columnId, values]) => {
        const col = columns.find((c) => c.id === columnId);
        const colName = col?.header ?? columnId;

        return values.map((value) => {
          const chipKey = `${columnId}:${value}`;
          const isRemoving = removingChips.has(chipKey);

          return (
            <span
              key={chipKey}
              className={`inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium ${
                isRemoving
                  ? "animate-out fade-out-0 zoom-out-95 duration-150"
                  : "animate-in fade-in-0 zoom-in-95 duration-200"
              }`}
            >
              <span className="text-muted-foreground">{colName}</span>
              <span>=</span>
              <span>{value}</span>
              <button
                onClick={() => handleRemoveChip(columnId, value)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        });
      })}

      {activeFilters.length > 0 && (
        <button
          onClick={handleClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
