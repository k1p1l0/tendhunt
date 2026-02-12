"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";

import type { KeyboardEvent, RefObject } from "react";

interface AgentInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

function getPlaceholder(
  context: ReturnType<typeof useAgentContext>["context"]
): string {
  switch (context.page) {
    case "buyer_detail":
      return context.buyerName
        ? `Ask about ${context.buyerName}...`
        : "Ask about this buyer...";
    case "scanner":
      return context.scannerName
        ? `Ask about your ${context.scannerName} scanner...`
        : "Ask about this scanner...";
    case "contract_detail":
      return context.contractTitle
        ? `Ask about ${context.contractTitle}...`
        : "Ask about this contract...";
    default:
      return "Research UK public sector buyers...";
  }
}

export function AgentInput({ onSend, onStop, isStreaming = false, textareaRef }: AgentInputProps) {
  const [value, setValue] = useState("");
  const { context } = useAgentContext();

  const handleInput = useCallback(() => {
    const el = textareaRef?.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 96) + "px";
    }
  }, [textareaRef]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef?.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend, textareaRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="px-4 py-3 border-t">
      <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 transition-colors focus-within:border-ring">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder(context)}
          disabled={isStreaming}
          rows={1}
          aria-label="Message input"
          className="resize-none bg-transparent w-full outline-none text-sm leading-relaxed py-1 max-h-24 scrollbar-thin disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/60"
        />
        {isStreaming ? (
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 rounded-full"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}>
            <Button
              variant={canSend ? "default" : "secondary"}
              size="icon"
              className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
