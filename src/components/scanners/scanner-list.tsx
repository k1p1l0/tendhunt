"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Sparkles, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ScannerType } from "@/models/scanner";

interface ScannerRow {
  _id: string;
  name: string;
  type: ScannerType;
  description?: string;
  lastScoredAt?: string;
  createdAt: string;
  updatedAt: string;
  aiColumns: Array<{ columnId: string; name: string }>;
}

interface ScannerListProps {
  scanners: ScannerRow[];
  onScannerClick: (id: string) => void;
  onDeleteScanner: (id: string) => void;
}

const TYPE_COLORS: Record<ScannerType, string> = {
  rfps: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  meetings:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  buyers:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const TYPE_LABELS: Record<ScannerType, string> = {
  rfps: "RFPs",
  meetings: "Board Meetings",
  buyers: "Buyers",
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ScannerList({
  scanners,
  onScannerClick,
  onDeleteScanner,
}: ScannerListProps) {
  const router = useRouter();

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

  return (
    <div className="space-y-3">
      {scanners.map((scanner) => (
        <Card
          key={scanner._id}
          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer"
          onClick={() => onScannerClick(scanner._id)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-medium">
                {scanner.name}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[scanner.type]}`}
              >
                {TYPE_LABELS[scanner.type]}
              </span>
            </div>
            {scanner.description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {scanner.description}
              </p>
            )}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>Updated {formatRelativeTime(scanner.updatedAt)}</span>
              <span>
                Created{" "}
                {new Date(scanner.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {scanner.aiColumns?.length > 0 && (
                <span>
                  {scanner.aiColumns.length} AI column
                  {scanner.aiColumns.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/scanners/${scanner._id}`);
              }}
            >
              Open
            </Button>
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
          </div>
        </Card>
      ))}
    </div>
  );
}
