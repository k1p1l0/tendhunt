"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  summary?: string;
  isLoading?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  query_buyers: "Searching buyers",
  query_contracts: "Searching contracts",
  query_signals: "Checking buying signals",
  search_buyers: "Searching buyers",
  get_buyer_detail: "Loading buyer details",
  get_contract_detail: "Loading contract details",
  analyze_spending: "Analysing spending data",
  query_key_personnel: "Finding key personnel",
  query_spend_data: "Querying spend data",
  query_board_documents: "Searching board documents",
  web_search: "Searching the web",
  create_scanner: "Creating scanner",
  apply_scanner_filter: "Applying filters",
  add_scanner_column: "Adding AI column",
};

function humanizeToolName(name: string): string {
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/20"
      />
      <path
        d="M10 2a8 8 0 0 1 8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

function StepIcon({ isLoading }: { isLoading: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return <SpinnerIcon />;
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center"
    >
      <Check className="h-3 w-3 text-white" strokeWidth={3} />
    </motion.div>
  );
}

function SingleStep({ toolCall }: { toolCall: ToolCall }) {
  const [open, setOpen] = useState(false);
  const loading = !!toolCall.isLoading;
  const label = loading
    ? `${humanizeToolName(toolCall.toolName)}...`
    : toolCall.summary ?? humanizeToolName(toolCall.toolName);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 w-full group text-left py-0.5"
        >
          <StepIcon isLoading={loading} />
          <span className="flex-1 text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors duration-100">
            {label}
          </span>
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground/50 shrink-0 transition-transform duration-150 ${
              open ? "rotate-90" : ""
            }`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-[1.875rem] mt-1 mb-1">
          <pre className="p-2 text-[10px] text-muted-foreground bg-muted/50 rounded-md overflow-x-auto leading-relaxed">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ToolCallChain({ toolCalls }: { toolCalls: ToolCall[] }) {
  const prefersReducedMotion = useReducedMotion();

  if (toolCalls.length === 0) return null;

  return (
    <div className="mb-2 rounded-lg border bg-background/50 px-3 py-2.5">
      <div className="relative">
        {/* Vertical connector line */}
        {toolCalls.length > 1 && (
          <div
            className="absolute left-[0.5625rem] top-[1.25rem] bottom-[0.625rem] w-px bg-border"
            aria-hidden="true"
          />
        )}
        <AnimatePresence mode="popLayout">
          {toolCalls.map((tc, i) => (
            <motion.div
              key={`${tc.toolName}-${i}`}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: i * 0.05 }}
            >
              <SingleStep toolCall={tc} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Keep legacy export for backward compatibility
export function ToolCallIndicator({ toolCall }: { toolCall: ToolCall }) {
  return <ToolCallChain toolCalls={[toolCall]} />;
}
