"use client";

import { useState } from "react";
import { Pencil, Loader2, RefreshCw, ChevronDown, Rows3, Filter, Play, Square, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScannerType } from "@/models/scanner";

interface RowPagination {
  offset: number;
  limit: number;
}

interface ScannerHeaderProps {
  scanner: {
    name: string;
    type: ScannerType;
    description?: string;
    searchQuery?: string;
    autoRun?: boolean;
  };
  rowCount: number;
  totalRowCount: number;
  activeFilterCount: number;
  isScoring: boolean;
  rowPagination: RowPagination;
  columnCount?: number;
  totalColumnCount?: number;
  onRowPaginationChange: (offset: number, limit: number) => void;
  onToggleAutoRun: (enabled: boolean) => void;
  onRunNow: () => void;
  onCancelScoring: () => void;
  onEditScanner: () => void;
}

const TYPE_BADGE_STYLES: Record<ScannerType, string> = {
  rfps: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  meetings:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  buyers:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  schools:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const TYPE_LABELS: Record<ScannerType, string> = {
  rfps: "RFPs",
  meetings: "Meetings",
  buyers: "Buyers",
  schools: "Schools",
};

const ENTITY_LABELS: Record<ScannerType, [string, string]> = {
  rfps: ["contract", "contracts"],
  meetings: ["signal", "signals"],
  buyers: ["buyer", "buyers"],
  schools: ["school", "schools"],
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function ScannerHeader({
  scanner,
  rowCount,
  totalRowCount,
  activeFilterCount,
  isScoring,
  rowPagination,
  columnCount,
  totalColumnCount,
  onRowPaginationChange,
  onToggleAutoRun,
  onRunNow,
  onCancelScoring,
  onEditScanner,
}: ScannerHeaderProps) {
  const autoRun = scanner.autoRun ?? false;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localOffset, setLocalOffset] = useState(rowPagination.offset);
  const [localLimit, setLocalLimit] = useState(rowPagination.limit);

  const isPaginated = rowPagination.limit > 0 || rowPagination.offset > 0;

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setLocalOffset(rowPagination.offset);
      setLocalLimit(rowPagination.limit);
    }
    setPopoverOpen(open);
  }

  function handleSave() {
    onRowPaginationChange(localOffset, localLimit);
    setPopoverOpen(false);
  }

  function handleShowAll() {
    setLocalOffset(0);
    setLocalLimit(0);
    onRowPaginationChange(0, 0);
    setPopoverOpen(false);
  }

  const [, entityPlural] = ENTITY_LABELS[scanner.type];
  const rowLabel = isPaginated
    ? `${formatNumber(rowCount)}/${formatNumber(totalRowCount)} ${entityPlural}`
    : `${formatNumber(rowCount)} ${entityPlural}`;

  const columnLabel = columnCount != null && totalColumnCount != null && columnCount < totalColumnCount
    ? `${columnCount}/${totalColumnCount} columns`
    : null;

  return (
    <div className="flex h-9 items-center gap-1.5 text-sm">
      {/* Auto-run dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
              autoRun
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {isScoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Auto-run
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-medium">Auto-update</span>
            <Switch
              checked={autoRun}
              onCheckedChange={onToggleAutoRun}
            />
          </div>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Run AI scoring when new data arrives
          </p>
          <DropdownMenuSeparator />
          {isScoring ? (
            <DropdownMenuItem onClick={onCancelScoring}>
              <Square className="h-3.5 w-3.5 mr-2 text-destructive" />
              <span className="text-destructive">Stop scoring</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onRunNow}>
              <Play className="h-3.5 w-3.5 mr-2" />
              Run now
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 h-4" />

      {/* Column count (if filtered) */}
      {columnLabel && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {columnLabel}
        </span>
      )}

      {/* Row count — clickable popover */}
      <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Rows3 className="h-3.5 w-3.5" />
            {rowLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Row pagination</h4>
            <p className="text-xs text-muted-foreground">
              Control how many rows load into the grid.
            </p>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="row-offset" className="text-xs">Starting row</Label>
              <Input
                id="row-offset"
                type="number"
                min={0}
                value={localOffset || ""}
                onChange={(e) => setLocalOffset(e.target.value ? parseInt(e.target.value, 10) : 0)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="row-limit" className="text-xs">Row limit</Label>
              <Input
                id="row-limit"
                type="number"
                min={0}
                value={localLimit || ""}
                onChange={(e) => setLocalLimit(e.target.value ? parseInt(e.target.value, 10) : 0)}
                placeholder="No limit"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={handleShowAll}
            >
              Show all rows
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={handleSave}
            >
              Save changes
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters count */}
      {activeFilterCount > 0 && (
        <span className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}
        </span>
      )}

      {/* Search query indicator */}
      {scanner.searchQuery && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Search
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{scanner.searchQuery}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Edit button — right side */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onEditScanner}>
        <Pencil className="h-3 w-3" />
        Edit
      </Button>
    </div>
  );
}
