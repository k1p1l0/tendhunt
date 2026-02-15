"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";

import type { KeyboardEvent, RefObject } from "react";
import type { AgentPageContext } from "./agent-provider";

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

interface ContextChip {
  label: string;
  icon: string;
}

function buildContextChips(context: AgentPageContext): ContextChip[] {
  const chips: ContextChip[] = [];

  switch (context.page) {
    case "buyer_detail":
      if (context.buyerName) chips.push({ label: context.buyerName, icon: "B" });
      if (context.buyerSector) chips.push({ label: context.buyerSector, icon: "S" });
      if (context.buyerRegion) chips.push({ label: context.buyerRegion, icon: "R" });
      break;

    case "contract_detail": {
      const title = context.contractTitle;
      if (title) chips.push({ label: title.length > 40 ? title.slice(0, 40) + "..." : title, icon: "C" });
      if (context.contractBuyerName) chips.push({ label: context.contractBuyerName, icon: "B" });
      if (context.contractValue) chips.push({ label: context.contractValue, icon: "£" });
      break;
    }

    case "scanner":
      if (context.scannerName) chips.push({ label: context.scannerName, icon: "S" });
      if (context.scannerType) chips.push({ label: context.scannerType.toUpperCase(), icon: "T" });
      break;

    case "contracts":
      chips.push({ label: "Contracts list", icon: "C" });
      break;

    case "buyers":
      chips.push({ label: "Buyers list", icon: "B" });
      break;

    case "inbox":
      chips.push({ label: "Inbox", icon: "I" });
      break;
  }

  return chips;
}

function ContextBar({ context }: { context: AgentPageContext }) {
  const chips = useMemo(() => buildContextChips(context), [context]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-1 pb-1.5 overflow-x-auto scrollbar-none">
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0">
        Context
      </span>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0"
        >
          <span className="font-semibold text-foreground/60">{chip.icon}</span>
          <span className="truncate max-w-[150px]">{chip.label}</span>
        </span>
      ))}
    </div>
  );
}

export function AgentInput({ onSend, onStop, isStreaming = false, textareaRef }: AgentInputProps) {
  const [value, setValue] = useState("");
  const { context } = useAgentContext();
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync external ref to local ref
  useEffect(() => {
    if (textareaRef?.current) {
      localRef.current = textareaRef.current;
    }
  }, [textareaRef]);

  const handleInput = useCallback(() => {
    const el = localRef.current;
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
    const el = localRef.current;
    if (el) {
      el.style.height = "auto";
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
      <div className="rounded-2xl border bg-background px-3 py-2 transition-colors focus-within:border-ring">
        <ContextBar context={context} />
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
    </div>
  );
}
