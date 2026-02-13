"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentMessage } from "./agent-message";
import { SuggestedActions } from "./suggested-actions";

import type { AgentMessage as AgentMessageType } from "@/stores/agent-store";

interface AgentMessageListProps {
  messages: AgentMessageType[];
  onSend: (text: string) => void;
  isStreaming?: boolean;
  onRetry?: () => void;
}

function TypingIndicator() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 px-4 py-2"
    >
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
    </motion.div>
  );
}

export function AgentMessageList({
  messages,
  onSend,
  isStreaming = false,
  onRetry,
}: AgentMessageListProps) {
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

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator =
    isStreaming &&
    lastMessage?.role === "assistant" &&
    (lastMessage.isThinking ||
      (!lastMessage.content && !lastMessage.toolCalls?.length));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <AnimatePresence mode="popLayout">
        {messages.map((msg) => (
          <AgentMessage key={msg.id} message={msg} />
        ))}
      </AnimatePresence>

      {showTypingIndicator && <TypingIndicator />}

      {lastMessage?.isError && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-1"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">Something went wrong</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRetry}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          )}
        </motion.div>
      )}

      <div ref={endRef} />
    </div>
  );
}
