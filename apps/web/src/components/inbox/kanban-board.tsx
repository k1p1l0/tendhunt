"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useInboxStore } from "@/stores/inbox-store";
import { STAGE_ORDER } from "@/lib/constants/pipeline-stages";
import { KanbanColumn } from "./kanban-column";
import { KanbanCardPreview } from "./kanban-card-preview";

import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import type { PipelineCardData, PipelineStage, ReorderPayload } from "@/types/inbox";

function groupByStage(
  cards: PipelineCardData[]
): Record<PipelineStage, PipelineCardData[]> {
  const groups: Record<PipelineStage, PipelineCardData[]> = {
    NEW: [],
    QUALIFIED: [],
    PREPARING_BID: [],
    SUBMITTED: [],
    WON: [],
    LOST: [],
  };

  for (const card of cards) {
    if (groups[card.stage]) {
      groups[card.stage].push(card);
    }
  }

  for (const stage of STAGE_ORDER) {
    groups[stage].sort((a, b) => a.position - b.position);
  }

  return groups;
}

function findCardStage(
  cards: PipelineCardData[],
  cardId: string
): PipelineStage | null {
  const card = cards.find((c) => c._id === cardId);
  return card?.stage ?? null;
}

export function KanbanBoard() {
  const { cards, setCards, fetchCards } = useInboxStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const cardsByStage = useMemo(() => groupByStage(cards), [cards]);

  const activeCard = useMemo(
    () => (activeId ? cards.find((c) => c._id === activeId) : undefined),
    [activeId, cards]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeCardId = active.id as string;
      const overId = over.id as string;

      const activeStage = findCardStage(cards, activeCardId);
      if (!activeStage) return;

      let overStage: PipelineStage | null = null;

      if (STAGE_ORDER.includes(overId as PipelineStage)) {
        overStage = overId as PipelineStage;
      } else {
        overStage = findCardStage(cards, overId);
      }

      if (!overStage || activeStage === overStage) return;

      setCards(
        cards.map((c) =>
          c._id === activeCardId ? { ...c, stage: overStage } : c
        )
      );
    },
    [cards, setCards]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeCardId = active.id as string;
      const overId = over.id as string;
      const currentStage = findCardStage(cards, activeCardId);
      if (!currentStage) return;

      let targetStage: PipelineStage;
      if (STAGE_ORDER.includes(overId as PipelineStage)) {
        targetStage = overId as PipelineStage;
      } else {
        targetStage = findCardStage(cards, overId) ?? currentStage;
      }

      const stageCards = cards
        .filter((c) => c.stage === targetStage)
        .sort((a, b) => a.position - b.position);

      const oldIndex = stageCards.findIndex((c) => c._id === activeCardId);
      const overIndex = stageCards.findIndex((c) => c._id === overId);

      let reorderedCards = stageCards;
      if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
        reorderedCards = arrayMove(stageCards, oldIndex, overIndex);
      }

      const updatedCards = cards.map((c) => {
        const idx = reorderedCards.findIndex((rc) => rc._id === c._id);
        if (idx !== -1) {
          return { ...c, stage: targetStage, position: idx };
        }
        return c;
      });

      setCards(updatedCards);

      const payload: ReorderPayload = {
        stage: targetStage,
        cardIds: reorderedCards.map((c) => c._id),
      };

      if (currentStage !== targetStage) {
        const sourceCards = updatedCards
          .filter((c) => c.stage === currentStage)
          .sort((a, b) => a.position - b.position);

        payload.movedCard = {
          cardId: activeCardId,
          fromStage: currentStage,
        };
        payload.sourceColumn = {
          stage: currentStage,
          cardIds: sourceCards.map((c) => c._id),
        };
      }

      try {
        const res = await fetch("/api/inbox/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          await fetchCards();
        }
      } catch {
        await fetchCards();
      }
    },
    [cards, setCards, fetchCards]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    fetchCards();
  }, [fetchCards]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 px-4 pt-4 h-full pb-4">
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            cards={cardsByStage[stage]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? <KanbanCardPreview card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
