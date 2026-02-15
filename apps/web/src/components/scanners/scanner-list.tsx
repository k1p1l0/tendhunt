"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Sparkles,
  Trash2,
  Pencil,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ScannerType } from "@/models/scanner";

export interface ScannerRow {
  _id: string;
  name: string;
  type: ScannerType;
  description?: string;
  lastScoredAt?: string;
  createdAt: string;
  updatedAt: string;
  aiColumns: Array<{ columnId: string; name: string }>;
  totalEntries?: number;
  creditsUsed?: number;
}

interface ScannerListProps {
  scanners: ScannerRow[];
  onScannerClick: (id: string) => void;
  onDeleteScanner: (id: string) => void;
}

const TYPE_CONFIG: Record<
  ScannerType,
  { label: string; emoji: string; badgeClass: string }
> = {
  rfps: {
    label: "RFPs",
    emoji: "📄",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  meetings: {
    label: "Meetings",
    emoji: "🗓",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  buyers: {
    label: "Buyers",
    emoji: "👤",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

type SortField = "name" | "type" | "updatedAt" | "createdAt" | "creditsUsed" | "totalEntries";
type SortDir = "asc" | "desc";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  return formatRelativeTime(dateStr);
}

export function ScannerList({
  scanners,
  onScannerClick,
  onDeleteScanner,
}: ScannerListProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (scanners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 px-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">No scanners yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create your first scanner to start analyzing opportunities. Scanners
          use AI to score contracts, signals, and organizations against your
          company profile.
        </p>
      </div>
    );
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "type" ? "asc" : "desc");
    }
  }

  const filtered = scanners.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "type":
        return dir * a.type.localeCompare(b.type);
      case "updatedAt":
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      case "createdAt":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "creditsUsed":
        return dir * ((a.creditsUsed ?? 0) - (b.creditsUsed ?? 0));
      case "totalEntries":
        return dir * ((a.totalEntries ?? 0) - (b.totalEntries ?? 0));
      default:
        return 0;
    }
  });

  const renderSortableHead = (field: SortField, children: React.ReactNode, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
      >
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search bar + count */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, type or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} scanner{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortableHead("name", "Name", "min-w-[280px]")}
              {renderSortableHead("type", "Type")}
              {renderSortableHead("updatedAt", "Last Modified")}
              {renderSortableHead("createdAt", "Created")}
              {renderSortableHead("creditsUsed", "Credits Used")}
              {renderSortableHead("totalEntries", "Total Entries")}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((scanner, idx) => {
              const config = TYPE_CONFIG[scanner.type] ?? {
                label: scanner.type,
                emoji: "📋",
                badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
              };
              return (
                <TableRow
                  key={scanner._id}
                  className="cursor-pointer"
                  onClick={() => onScannerClick(scanner._id)}
                >
                  <TableCell className="font-medium">
                    {idx + 1}. {scanner.name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
                    >
                      <span>{config.emoji}</span>
                      {config.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(scanner.updatedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatShortDate(scanner.createdAt)}
                  </TableCell>
                  <TableCell>{scanner.creditsUsed ?? 0}</TableCell>
                  <TableCell>{scanner.totalEntries ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Scanner actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Scanner
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScanner(scanner._id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Scanner
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No scanners match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
