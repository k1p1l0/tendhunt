"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import type { ReactNode } from "react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading: boolean;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getValue(item: any, key: string): unknown {
  return item[key];
}

export function DataTable<T extends { _id?: unknown }>({
  columns,
  data,
  loading,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedData = useMemo(() => {
    if (!sort) return data;

    return [...data].sort((a, b) => {
      const aVal = getValue(a, sort.key);
      const bVal = getValue(b, sort.key);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sort]);

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  }

  function renderSortIcon(key: string) {
    if (sort?.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  }

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full max-w-[180px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No data found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={
                col.sortable !== false
                  ? "cursor-pointer select-none hover:text-foreground transition-colors"
                  : ""
              }
              onClick={
                col.sortable !== false
                  ? () => handleSort(col.key)
                  : undefined
              }
            >
              <span className="inline-flex items-center">
                {col.label}
                {col.sortable !== false && renderSortIcon(col.key)}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((item, idx) => (
          <TableRow
            key={String(item._id ?? idx)}
            className={idx % 2 === 1 ? "bg-muted/30" : ""}
          >
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.render
                  ? col.render(item)
                  : String(getValue(item, col.key) ?? "-")}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
