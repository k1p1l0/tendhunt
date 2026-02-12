"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { marked } from "marked";
import { ToolCallIndicator } from "./tool-call-indicator";
import type { AgentMessage as AgentMessageType } from "@/stores/agent-store";

interface AgentMessageProps {
  message: AgentMessageType;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const htmlContent = useMemo(() => {
    if (message.role !== "assistant") return "";
    return marked.parse(message.content, { async: false }) as string;
  }, [message.content, message.role]);

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 max-w-[85%] text-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {message.toolCalls?.map((tc, i) => (
        <ToolCallIndicator key={`${message.id}-tool-${i}`} toolCall={tc} />
      ))}
      <div className="bg-muted rounded-2xl px-4 py-2.5 max-w-[85%]">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </motion.div>
  );
}
