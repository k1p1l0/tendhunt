"use client";

import { motion, useReducedMotion } from "motion/react";
import { SculptorIcon } from "@/components/sculptor/sculptor-icon";
import { useAgentContext } from "./agent-provider";

import type { AgentPageContext } from "./agent-provider";

function getPrompts(context: AgentPageContext): string[] {
  switch (context.page) {
    case "buyer_detail":
      return [
        context.buyerName
          ? `What are the recent buying signals for ${context.buyerName}?`
          : "What are the recent buying signals for this buyer?",
        "Who are the key decision-makers?",
        context.buyerName
          ? `What has ${context.buyerName} spent recently?`
          : "What has this buyer spent recently?",
        "Find similar buyers",
      ];
    case "scanner":
      if (context.scannerType === "buyers") {
        return [
          "Which buyers have the most procurement signals?",
          "Find NHS trusts with recent board meetings",
          "Compare spending patterns",
        ];
      }
      return [
        "Which contracts have the highest value?",
        "Find contracts with upcoming deadlines",
        "Summarize the top opportunities",
      ];
    case "contract_detail":
      return [
        context.contractBuyerName
          ? `Tell me about ${context.contractBuyerName}`
          : "Tell me about this buyer",
        "Are there similar contracts?",
        "What signals suggest active procurement?",
      ];
    default:
      return [
        "Find NHS trusts with high enrichment scores",
        "What are the latest procurement signals?",
        "Show me contracts expiring this month",
        "Which buyers have the highest budgets?",
      ];
  }
}

interface SuggestedActionsProps {
  onSend: (text: string) => void;
}

export function SuggestedActions({ onSend }: SuggestedActionsProps) {
  const { context } = useAgentContext();
  const prefersReducedMotion = useReducedMotion();
  const prompts = getPrompts(context);

  const baseMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col items-center justify-center h-full px-5 py-10 gap-8">
      {/* Hero */}
      <motion.div
        {...baseMotion}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-3 text-center"
      >
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <SculptorIcon size={28} animate />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">How can I help?</h3>
        <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
          Ask me anything about UK public sector procurement, buyers, contracts, or spending data.
        </p>
      </motion.div>

      {/* Suggestion cards */}
      <div className="w-full space-y-2">
        {prompts.map((prompt, index) => (
          <motion.button
            key={prompt}
            type="button"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.15, delay: 0.1 + index * 0.05, ease: "easeOut" }
            }
            onClick={() => onSend(prompt)}
            className="w-full text-left rounded-xl border bg-background px-4 py-3 text-sm text-foreground transition-colors duration-100 hover:bg-muted/60 active:scale-[0.99] min-h-[44px]"
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
