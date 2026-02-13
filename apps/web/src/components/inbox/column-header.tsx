"use client";

import { memo } from "react";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";

import type { PipelineStage } from "@/lib/constants/pipeline-stages";

interface ColumnHeaderProps {
  stage: PipelineStage;
  count: number;
}

export const ColumnHeader = memo(function ColumnHeader({
  stage,
  count,
}: ColumnHeaderProps) {
  const config = PIPELINE_STAGES[stage];

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div
        className={`w-1 h-5 rounded-full ${config.textColor.replace("text-", "bg-")}`}
      />
      <span className="text-sm font-medium">{config.label}</span>
      <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
        {count}
      </span>
    </div>
  );
});
