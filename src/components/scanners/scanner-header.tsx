"use client";

import { Sparkles, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ScannerType } from "@/models/scanner";

interface ScannerHeaderProps {
  scanner: {
    name: string;
    type: ScannerType;
    description?: string;
    aiColumns: Array<{ columnId: string; name: string }>;
  };
  rowCount: number;
  onAddColumn: () => void;
  onEditScanner: () => void;
  onScore: () => void;
  isScoring: boolean;
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
  onAddColumn,
  onEditScanner,
  onScore,
  isScoring,
}: ScannerHeaderProps) {
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

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button onClick={onScore} disabled={isScoring} size="sm">
          {isScoring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isScoring ? "Scoring..." : "Score All"}
        </Button>

        <Button variant="outline" size="sm" onClick={onAddColumn}>
          <Plus className="h-4 w-4" />
          Add Column
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onEditScanner}
          disabled
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <span className="text-sm text-muted-foreground">
          {rowCount} {rowCount === 1 ? "row" : "rows"}
        </span>
      </div>
    </div>
  );
}
