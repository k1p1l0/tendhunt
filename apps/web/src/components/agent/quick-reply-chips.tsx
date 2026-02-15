"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

import type { AgentMessage } from "@/stores/agent-store";

const CHIP_RE = /\[\[option:\s*(.+?)\]\]/g;

export function extractChipOptions(content: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = CHIP_RE.exec(content)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

export function stripChipTokens(content: string): string {
  return content.replace(/\[\[option:\s*.+?\]\]/g, "").trim();
}

interface QuickReplyChipsProps {
  lastMessage: AgentMessage | undefined;
  isStreaming: boolean;
  onSend: (text: string) => void;
}

export function QuickReplyChips({ lastMessage, isStreaming, onSend }: QuickReplyChipsProps) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const options = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content) return [];
    return extractChipOptions(lastMessage.content);
  }, [lastMessage]);

  const handleClick = useCallback(
    (label: string) => {
      if (lastMessage) setDismissedId(lastMessage.id);
      onSend(label);
    },
    [lastMessage, onSend]
  );

  if (isStreaming) return null;
  if (!lastMessage || lastMessage.role !== "assistant") return null;
  if (dismissedId === lastMessage.id) return null;
  if (options.length === 0) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((label, i) => (
        <motion.div
          key={label}
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? {} : { delay: i * 0.05, duration: 0.15 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-xs px-3.5 hover:bg-accent transition-colors"
            onClick={() => handleClick(label)}
          >
            {label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
