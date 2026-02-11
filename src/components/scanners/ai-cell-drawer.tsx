"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useScannerStore, getScore } from "@/stores/scanner-store";
import type { ScannerType } from "@/models/scanner";

interface AiCellDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string | null;
  entityId: string | null;
  columnName: string;
  entityName: string;
  scannerType: ScannerType;
}

const TYPE_LABELS: Record<ScannerType, string> = {
  rfps: "RFPs",
  meetings: "Meetings",
  buyers: "Buyers",
};

function ScoreCircle({ score }: { score: number }) {
  let bgClass =
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (score >= 7) {
    bgClass =
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  } else if (score >= 4) {
    bgClass =
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${bgClass}`}
      >
        <span className="text-2xl font-bold">{score.toFixed(1)}</span>
      </div>
      <span className="text-sm text-muted-foreground">out of 10</span>
    </div>
  );
}

export function AiCellDrawer({
  open,
  onOpenChange,
  columnId,
  entityId,
  columnName,
  entityName,
  scannerType,
}: AiCellDrawerProps) {
  const scores = useScannerStore((s) => s.scores);

  // Get the score entry
  const entry =
    columnId && entityId ? getScore(scores, columnId, entityId) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{columnName || "AI Analysis"}</SheetTitle>
          <SheetDescription>{entityName || "Entity details"}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {!entry ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Not yet scored. Click &quot;Score All&quot; to analyze this
                item.
              </p>
            </div>
          ) : (
            <>
              {/* Score display */}
              {entry.score != null && (
                <>
                  <ScoreCircle score={entry.score} />
                  <Separator />
                </>
              )}

              {/* Reasoning section */}
              {entry.reasoning && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Reasoning</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {entry.reasoning}
                  </p>
                </div>
              )}

              {/* Full Response section (only if different from reasoning) */}
              {entry.response &&
                entry.response !== entry.reasoning && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Full Response</h3>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {entry.response}
                      </p>
                    </div>
                  </>
                )}

              {/* Metadata section */}
              <Separator />
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Column type:</span>
                  <span>{columnId ? "AI" : "default"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scanner type:</span>
                  <Badge variant="secondary" className="text-xs h-5">
                    {TYPE_LABELS[scannerType]}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
