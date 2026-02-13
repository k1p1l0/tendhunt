"use client";

import { useCallback, useEffect, useState } from "react";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxBreadcrumb } from "./breadcrumb";
import { KanbanBoard } from "@/components/inbox/kanban-board";
import { CardDetailSheet } from "@/components/inbox/card-detail-sheet";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";

import type { PipelineCardData } from "@/types/inbox";

export default function InboxPage() {
  const { fetchCards, isLoading, error, updateCard, removeCard } =
    useInboxStore();
  const [selectedCard, setSelectedCard] = useState<PipelineCardData | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCardClick = useCallback((card: PipelineCardData) => {
    setSelectedCard(card);
    setIsSheetOpen(true);
  }, []);

  const handleCardUpdate = useCallback(
    (id: string, updates: Partial<PipelineCardData>) => {
      updateCard(id, updates);
      setSelectedCard((prev) =>
        prev && prev._id === id ? { ...prev, ...updates } : prev
      );
    },
    [updateCard]
  );

  const handleCardDelete = useCallback(
    (id: string) => {
      removeCard(id);
      setSelectedCard(null);
      setIsSheetOpen(false);
    },
    [removeCard]
  );

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedCard(null);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-x-auto">
      <InboxBreadcrumb />
      <AgentContextSetter context={{ page: "inbox" }} />

      {error && (
        <div className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-3 px-4 pt-4 h-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] rounded-xl bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <KanbanBoard onCardClick={handleCardClick} />
      )}

      <CardDetailSheet
        card={selectedCard}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        onCardUpdate={handleCardUpdate}
        onCardDelete={handleCardDelete}
      />
    </div>
  );
}
