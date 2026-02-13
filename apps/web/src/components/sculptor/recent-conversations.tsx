"use client";

import { motion, useReducedMotion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";

import type { RecentConversation } from "@/lib/dashboard";

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

interface RecentConversationsProps {
  conversations: RecentConversation[];
}

export function RecentConversations({
  conversations,
}: RecentConversationsProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    useAgentStore.getState().setPanelOpen(true);
  };

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Jump back in</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {conversations.map((conv, index) => (
          <motion.button
            key={conv._id}
            type="button"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.2, delay: index * 0.05, ease: "easeOut" }
            }
            onClick={handleClick}
            className="rounded-xl border bg-background p-4 text-left hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            <p className="font-medium text-sm truncate">{conv.title}</p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span>{getRelativeTime(conv.lastMessageAt)}</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {conv.messageCount}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
