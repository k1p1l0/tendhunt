"use client";

import { useEffect } from "react";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxBreadcrumb } from "./breadcrumb";
import { KanbanBoard } from "@/components/inbox/kanban-board";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";

export default function InboxPage() {
  const { fetchCards, isLoading, error } = useInboxStore();

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

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
        <KanbanBoard />
      )}
    </div>
  );
}
