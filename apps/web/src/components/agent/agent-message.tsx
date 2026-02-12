"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { marked } from "marked";
import { ToolCallIndicator } from "./tool-call-indicator";

import type { AgentMessage as AgentMessageType } from "@/stores/agent-store";

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface AgentMessageProps {
  message: AgentMessageType;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const prefersReducedMotion = useReducedMotion();

  const htmlContent = useMemo(() => {
    if (message.role !== "assistant" || !message.content) return "";
    return marked.parse(message.content, { async: false }) as string;
  }, [message.content, message.role]);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  if (message.role === "user") {
    return (
      <motion.div {...motionProps} className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 max-w-[85%] text-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps}>
      {message.toolCalls?.map((tc, i) => (
        <ToolCallIndicator key={`${message.id}-tool-${i}`} toolCall={tc} />
      ))}
      {message.content && (
        <div className="bg-muted rounded-2xl px-4 py-2.5 max-w-[85%]">
          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-headings:my-2 prose-pre:my-2 prose-table:my-2
              prose-a:text-primary prose-a:underline"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </motion.div>
  );
}
