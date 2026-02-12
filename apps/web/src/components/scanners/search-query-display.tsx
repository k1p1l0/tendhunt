"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SearchQueryDisplayProps {
  query: string;
  className?: string;
}

interface Token {
  type: "keyword" | "operator";
  value: string;
}

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  // Split by OR/AND operators (case-insensitive, word boundary)
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

export function SearchQueryDisplay({
  query,
  className = "",
}: SearchQueryDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const tokens = useMemo(() => tokenize(query), [query]);

  if (!query.trim()) return null;

  const hasMultipleKeywords = tokens.filter((t) => t.type === "keyword").length > 1;
  const previewTokens = hasMultipleKeywords ? tokens.slice(0, 5) : tokens;
  const hasMore = hasMultipleKeywords && tokens.length > 5;
  const displayTokens = expanded ? tokens : previewTokens;

  return (
    <div className={`group relative ${className}`}>
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-900/30 border border-orange-200/60 dark:border-orange-800/40 uppercase">
                    {token.value}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-primary/8 dark:bg-primary/15 px-2 py-0.5 text-xs font-medium text-foreground/90 border border-primary/10 dark:border-primary/20">
                    {token.value}
                  </span>
                )}
              </motion.span>
            ))}
          </AnimatePresence>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {expanded ? (
                <>
                  less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  +{tokens.length - previewTokens.length} more{" "}
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
