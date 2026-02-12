"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SearchQueryInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

interface Token {
  type: "keyword" | "operator";
  value: string;
}

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const parts = query.split(/\b(OR|AND)\b/gi);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (/^(OR|AND)$/i.test(trimmed)) {
      tokens.push({ type: "operator", value: trimmed.toUpperCase() });
    } else {
      tokens.push({ type: "keyword", value: trimmed });
    }
  }

  return tokens;
}

export function SearchQueryInput({
  value,
  onChange,
  id,
  placeholder = "e.g. cloud migration OR IT infrastructure",
}: SearchQueryInputProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokens = useMemo(() => tokenize(value), [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const hasContent = value.trim().length > 0;
  const keywordCount = tokens.filter((t) => t.type === "keyword").length;
  const previewCount = 5;
  const previewTokens = tokens.slice(0, previewCount);
  const hasMore = tokens.length > previewCount;
  const displayTokens = expanded ? tokens : previewTokens;
  const hiddenCount = tokens.length - previewCount;

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        rows={6}
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    );
  }

  if (!hasContent) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:border-ring transition-colors text-left min-h-[40px]"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-left hover:border-ring transition-colors min-h-[40px] cursor-text"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
          <AnimatePresence mode="popLayout" initial={false}>
            {displayTokens.map((token, i) => (
              <motion.span
                key={`${token.value}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                {token.type === "operator" ? (
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-900/30 border border-orange-200/60 dark:border-orange-800/40 uppercase select-none">
                    {token.value}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-muted/80 dark:bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/90 border border-border/60">
                    {token.value}
                  </span>
                )}
              </motion.span>
            ))}
          </AnimatePresence>

          {hasMore && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(!expanded);
                }
              }}
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors select-none"
            >
              {expanded ? (
                <>
                  less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  +{hiddenCount} more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </span>
          )}
        </div>

        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {keywordCount > 0 && (
        <span className="absolute -top-2 right-2 rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground border border-border/60">
          {keywordCount} {keywordCount === 1 ? "term" : "terms"}
        </span>
      )}
    </div>
  );
}
