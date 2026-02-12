"use client";

import { Pencil, Loader2, RefreshCw, ChevronDown, Columns3, Rows3, Filter, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchQueryDisplay } from "@/components/scanners/search-query-display";
import type { ScannerType } from "@/models/scanner";

interface ScannerHeaderProps {
  scanner: {
    name: string;
    type: ScannerType;
    description?: string;
    searchQuery?: string;
    autoRun?: boolean;
  };
  rowCount: number;
  columnCount: number;
  activeFilterCount: number;
  isScoring: boolean;
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
};

const TYPE_LABELS: Record<ScannerType, string> = {
  rfps: "RFPs",
  meetings: "Meetings",
  buyers: "Buyers",
};

export function ScannerHeader({
  scanner,
  rowCount,
  columnCount,
  activeFilterCount,
  isScoring,
  onToggleAutoRun,
  onRunNow,
  onCancelScoring,
  onEditScanner,
}: ScannerHeaderProps) {
  const autoRun = scanner.autoRun ?? false;

  return (
    <div className="space-y-3">
      {/* Name + type badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{scanner.name}</h1>
        <Badge
          variant="outline"
          className={TYPE_BADGE_STYLES[scanner.type]}
        >
          {TYPE_LABELS[scanner.type]}
        </Badge>
      </div>

      {/* Description */}
      {scanner.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {scanner.description}
        </p>
      )}

      {/* Search Query */}
      {scanner.searchQuery && (
        <SearchQueryDisplay query={scanner.searchQuery} />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Auto-run dropdown button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={autoRun ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
            >
              {isScoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Auto-run
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {/* Auto-update toggle */}
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
            {/* Manual trigger / Stop */}
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

        {/* Edit */}
        <Button variant="ghost" size="sm" onClick={onEditScanner}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Columns3 className="h-3.5 w-3.5" />
            {columnCount} {columnCount === 1 ? "column" : "columns"}
          </span>
          <span className="flex items-center gap-1">
            <Rows3 className="h-3.5 w-3.5" />
            {rowCount} {rowCount === 1 ? "row" : "rows"}
          </span>
          {activeFilterCount > 0 && (
            <span className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
