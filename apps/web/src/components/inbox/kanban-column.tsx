"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import { ColumnHeader } from "./column-header";
import { KanbanCard } from "./kanban-card";

import type { PipelineCardData, PipelineStage } from "@/types/inbox";

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: PipelineCardData[];
}

export function KanbanColumn({ stage, cards }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={`flex flex-col flex-shrink-0 w-[280px] min-h-full rounded-xl bg-muted/30 transition-shadow duration-150 ease-out ${
        isOver ? "ring-2 ring-primary/20" : ""
      }`}
    >
      <ColumnHeader stage={stage} count={cards.length} />

      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 px-2 pb-2 overflow-y-auto"
      >
        <SortableContext
          items={cards.map((c) => c._id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {cards.map((card) => (
              <motion.div
                key={card._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <KanbanCard card={card} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[120px] border border-dashed rounded-lg border-muted-foreground/20">
            <p className="text-xs text-muted-foreground">Drag cards here</p>
          </div>
        )}
      </div>
    </div>
  );
}
