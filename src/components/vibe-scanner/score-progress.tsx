"use client";

import { Progress } from "@/components/ui/progress";
import { useVibeStore } from "@/stores/vibe-store";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ScoreProgress() {
  const isScoring = useVibeStore((s) => s.isScoring);
  const { scored, total } = useVibeStore((s) => s.scoringProgress);

  if (!isScoring && total === 0) return null;

  const percentage = total > 0 ? Math.round((scored / total) * 100) : 0;
  const isComplete = !isScoring && scored > 0 && scored === total;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        <span className="text-sm font-medium">
          {isComplete
            ? `Scoring complete! ${scored} contracts scored.`
            : `Scoring ${scored} of ${total} contracts...`}
        </span>
      </div>
      <Progress value={percentage} className="h-2 transition-all duration-300" />
    </div>
  );
}
