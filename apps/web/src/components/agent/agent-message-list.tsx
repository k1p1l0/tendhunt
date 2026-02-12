"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useAgentStore, getActiveMessages } from "@/stores/agent-store";
import { AgentMessage } from "./agent-message";
import { SuggestedActions } from "./suggested-actions";

interface AgentMessageListProps {
  onSend: (text: string) => void;
}

export function AgentMessageList({ onSend }: AgentMessageListProps) {
  const messages = useAgentStore((s) => getActiveMessages(s));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <SuggestedActions onSend={onSend} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <AnimatePresence mode="popLayout">
        {messages.map((msg) => (
          <AgentMessage key={msg.id} message={msg} />
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}
