"use client";

import { Progress } from "@/components/ui/progress";
import { useScannerStore } from "@/stores/scanner-store";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ScoreProgressBarProps {
  /** Map of columnId -> column name for display */
  columnNames?: Record<string, string>;
}

export function ScoreProgressBar({ columnNames }: ScoreProgressBarProps) {
  const isScoring = useScannerStore((s) => s.isScoring);
  const { scored, total, columnId } = useScannerStore(
    (s) => s.scoringProgress
  );

  // Only visible when scoring is active or has completed
  if (!isScoring && total === 0) return null;

  const percentage = total > 0 ? Math.round((scored / total) * 100) : 0;
  const isComplete = !isScoring && scored > 0 && scored === total;

  // Resolve column name
  const columnName =
    columnId && columnNames ? columnNames[columnId] : undefined;

  return (
    <div className="flex items-center gap-3">
      {isComplete ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      )}
      <span className="text-sm font-medium whitespace-nowrap">
        {isComplete
          ? `Done! ${scored} scored`
          : columnName
            ? `${columnName}... ${scored}/${total}`
            : `Scoring... ${scored}/${total}`}
      </span>
      <Progress
        value={percentage}
        className="h-1.5 w-[200px] transition-all duration-300"
      />
    </div>
  );
}
