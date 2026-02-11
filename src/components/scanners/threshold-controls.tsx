"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useScannerStore, getScore } from "@/stores/scanner-store";

interface ThresholdControlsProps {
  /** The AI column ID to use for threshold calculations */
  primaryColumnId?: string;
}

export function ThresholdControls({ primaryColumnId }: ThresholdControlsProps) {
  const threshold = useScannerStore((s) => s.threshold);
  const setThreshold = useScannerStore((s) => s.setThreshold);
  const hideBelow = useScannerStore((s) => s.hideBelow);
  const setHideBelow = useScannerStore((s) => s.setHideBelow);
  const scores = useScannerStore((s) => s.scores);

  // Calculate stats from scores
  const { aboveCount, totalScored } = useMemo(() => {
    if (!primaryColumnId) return { aboveCount: 0, totalScored: 0 };

    let above = 0;
    let total = 0;

    for (const [key, entry] of Object.entries(scores)) {
      // Only count entries for the primary column
      if (!key.startsWith(`${primaryColumnId}:`)) continue;
      if (entry.score == null) continue;
      total++;
      if (entry.score >= threshold) above++;
    }

    return { aboveCount: above, totalScored: total };
  }, [scores, primaryColumnId, threshold]);

  // Only render when scores exist
  if (totalScored === 0) return null;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Slider section */}
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-sm font-medium">
              Threshold: {threshold.toFixed(1)}
            </label>
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              min={1}
              max={10}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {/* Toggle section */}
          <div className="flex items-center gap-2">
            <Switch
              checked={hideBelow}
              onCheckedChange={setHideBelow}
            />
            <label className="text-sm">
              {hideBelow ? "Hide" : "Dim"}
            </label>
          </div>

          {/* Stats section */}
          <div className="text-right text-sm text-muted-foreground">
            {aboveCount}/{totalScored} above
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
