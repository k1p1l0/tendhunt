"use client";

import { KanbanCardContent } from "./kanban-card-content";

import type { PipelineCardData } from "@/types/inbox";

interface KanbanCardPreviewProps {
  card: PipelineCardData;
}

export function KanbanCardPreview({ card }: KanbanCardPreviewProps) {
  return (
    <div
      className="w-[256px]"
      style={{
        transform: "rotate(3deg) scale(1.02)",
      }}
    >
      <div className="shadow-lg rounded-lg">
        <KanbanCardContent card={card} />
      </div>
    </div>
  );
}
