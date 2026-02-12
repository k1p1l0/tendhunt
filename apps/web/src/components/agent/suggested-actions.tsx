"use client";

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
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
  const prompts = getPrompts(context);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">How can I help?</h3>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          Ask me anything about UK public sector procurement, buyers, contracts, or spending data.
        </p>
      </div>
      <div className="w-full space-y-2">
        {prompts.map((prompt, index) => (
          <motion.div
            key={prompt}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Button
              variant="ghost"
              className="w-full justify-start text-left h-auto py-2.5 px-3 text-sm font-normal border hover:bg-muted/50 whitespace-normal"
              onClick={() => onSend(prompt)}
            >
              {prompt}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
