"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agent-store";
import { useAgentContext } from "./agent-provider";

import type { AgentMessage } from "@/stores/agent-store";

const ENRICHMENT_PATTERNS = [
  /enrichment/i,
  /enrich\s+(this\s+)?buyer/i,
  /trigger\s+.*enrichment/i,
  /pull\s+in\s+board\s+members/i,
  /hasn't\s+been\s+enriched/i,
  /not\s+been\s+enriched/i,
  /enrichment\s+gaps/i,
  /run\s+(a\s+)?full\s+enrichment/i,
  /worth\s+doing/i,
  /want\s+me\s+to\s+(run|trigger|start)/i,
];

function detectEnrichmentSuggestion(message: AgentMessage): boolean {
  if (message.role !== "assistant" || !message.content) return false;
  return ENRICHMENT_PATTERNS.some((re) => re.test(message.content));
}

interface EnrichmentConfirmProps {
  onConfirm: (text: string) => void;
  lastMessage: AgentMessage | undefined;
  isStreaming: boolean;
}

export function EnrichmentConfirm({ onConfirm, lastMessage, isStreaming }: EnrichmentConfirmProps) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const confirmation = useAgentStore((s) => s.enrichmentConfirmation);
  const activeEnrichment = useAgentStore((s) => s.activeEnrichment);
  const { context } = useAgentContext();
  const prefersReducedMotion = useReducedMotion();

  // Don't show if streaming, enrichment already active, or dismissed for this message
  if (isStreaming || activeEnrichment) return null;

  // Show from store state (tool-triggered) OR from text detection
  const fromStore = !!confirmation;
  const fromText = !fromStore && lastMessage && !dismissed
    && dismissed !== lastMessage.id
    && detectEnrichmentSuggestion(lastMessage);

  if (!fromStore && !fromText) return null;

  const buyerName = confirmation?.buyerName
    ?? context.buyerName
    ?? "this buyer";

  const buyerId = confirmation?.buyerId ?? context.buyerId;

  const handleConfirm = () => {
    if (confirmation) {
      useAgentStore.getState().setEnrichmentConfirmation(null);
    }
    if (buyerId) {
      onConfirm(`Yes, enrich ${buyerName}. Use buyerId: ${buyerId}`);
    } else {
      onConfirm(`Yes, enrich ${buyerName}`);
    }
  };

  const handleCancel = () => {
    if (confirmation) {
      useAgentStore.getState().setEnrichmentConfirmation(null);
    }
    if (lastMessage) {
      setDismissed(lastMessage.id);
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <Button
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs"
        onClick={handleConfirm}
      >
        <Zap className="h-3.5 w-3.5" />
        Yes, enrich
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs text-muted-foreground"
        onClick={handleCancel}
      >
        <X className="h-3.5 w-3.5" />
        Skip
      </Button>
    </motion.div>
  );
}
