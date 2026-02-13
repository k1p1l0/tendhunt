"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { KeyboardEvent } from "react";

interface SculptorHeroInputProps {
  onSend: (content: string) => void;
  isStreaming?: boolean;
}

export function SculptorHeroInput({
  onSend,
  isStreaming = false,
}: SculptorHeroInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 72) + "px";
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    const el = textareaRef.current;
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
    <div className="w-full">
      <div className="flex items-end gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm transition-all duration-150 focus-within:border-ring focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sculptor anything about procurement..."
          disabled={isStreaming}
          rows={1}
          aria-label="Ask Sculptor"
          className="resize-none bg-transparent w-full outline-none text-base leading-relaxed py-1 max-h-[4.5rem] scrollbar-thin disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/60"
        />
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
      </div>
    </div>
  );
}
