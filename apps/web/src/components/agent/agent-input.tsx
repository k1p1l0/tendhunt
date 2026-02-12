"use client";

import { useRef, useState, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";

interface AgentInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
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

export function AgentInput({ onSend, onStop, isStreaming = false }: AgentInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { context } = useAgentContext();

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 96) + "px";
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

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
      <div className="flex items-end gap-2">
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
          className="resize-none bg-transparent w-full outline-none text-sm leading-relaxed py-1.5 max-h-24 scrollbar-thin disabled:opacity-50"
        />
        {isStreaming ? (
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant={canSend ? "default" : "secondary"}
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
