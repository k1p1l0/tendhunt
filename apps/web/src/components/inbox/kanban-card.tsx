"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCardContent } from "./kanban-card-content";

import type { PipelineCardData } from "@/types/inbox";

interface KanbanCardProps {
  card: PipelineCardData;
  onCardClick?: (card: PipelineCardData) => void;
}

export function KanbanCard({ card, onCardClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onCardClick?.(card)}
    >
      <KanbanCardContent card={card} />
    </div>
  );
}
