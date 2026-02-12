"use client";

import { useState } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  summary?: string;
  isLoading?: boolean;
}

function humanizeToolName(name: string): string {
  const map: Record<string, string> = {
    query_buyers: "Searching buyers",
    query_contracts: "Searching contracts",
    query_signals: "Checking signals",
    search_buyers: "Searching buyers",
    get_buyer_detail: "Loading buyer details",
    get_contract_detail: "Loading contract details",
    analyze_spending: "Analyzing spending data",
  };
  if (map[name]) return map[name];
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ToolCallIndicator({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2" role="status" aria-live="polite">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg px-3 py-2 border w-full text-left transition-colors hover:bg-muted/50"
      >
        {toolCall.isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        )}
        <span className="flex-1 truncate">
          {toolCall.isLoading
            ? `${humanizeToolName(toolCall.toolName)}...`
            : toolCall.summary ?? humanizeToolName(toolCall.toolName)}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <pre className="mt-1 p-2 text-[10px] text-muted-foreground bg-muted/50 rounded-md overflow-x-auto">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
