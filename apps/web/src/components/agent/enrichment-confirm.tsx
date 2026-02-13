"use client";

import { useState, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agent-store";
import { useAgentContext } from "./agent-provider";

import type { AgentMessage } from "@/stores/agent-store";
import type { EnrichmentStage } from "@/stores/agent-store";

const ENRICHMENT_PATTERNS = [
  /enrichment/i,
  /enrich\s+(this\s+)?buyer/i,
  /trigger\s+.*enrichment/i,
  /pull\s+in\s+board\s+members/i,
  /hasn't\s+been\s+enriched/i,
  /not\s+been\s+enriched/i,
  /enrichment\s+gaps/i,
  /run\s+(a\s+)?full\s+enrichment/i,
  /worth\s+(doing|running)/i,
  /want\s+me\s+to\s+(run|trigger|start)/i,
];

const INITIAL_STAGES: EnrichmentStage[] = [
  { name: "classify", label: "Classifying organisation", status: "pending" },
  { name: "website_discovery", label: "Finding website", status: "pending" },
  { name: "logo_linkedin", label: "Fetching LinkedIn & logo", status: "pending" },
  { name: "governance_urls", label: "Mapping governance portals", status: "pending" },
  { name: "moderngov", label: "Pulling board meeting data", status: "pending" },
  { name: "scrape", label: "Scraping governance pages", status: "pending" },
  { name: "personnel", label: "Extracting key personnel", status: "pending" },
  { name: "score", label: "Calculating enrichment score", status: "pending" },
  { name: "spend_discover", label: "Discovering spending pages", status: "pending" },
  { name: "spend_extract", label: "Extracting download links", status: "pending" },
  { name: "spend_parse", label: "Parsing spend data", status: "pending" },
  { name: "spend_aggregate", label: "Building spend summary", status: "pending" },
];

function detectEnrichmentSuggestion(message: AgentMessage): boolean {
  if (message.role !== "assistant" || !message.content) return false;
  return ENRICHMENT_PATTERNS.some((re) => re.test(message.content));
}

async function startEnrichmentDirect(buyerId: string, buyerName: string) {
  const store = useAgentStore.getState();
  store.setActiveEnrichment({
    buyerId,
    buyerName,
    messageId: "",
    stages: [...INITIAL_STAGES],
    startedAt: new Date(),
  });

  try {
    const response = await fetch(`/api/enrichment/${buyerId}/progress`);
    if (!response.ok || !response.body) {
      store.completeEnrichment();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          const s = useAgentStore.getState();

          switch (data.type) {
            case "stage_active":
              s.updateEnrichmentStage(data.stage as string, "active");
              break;
            case "stage_complete":
              s.updateEnrichmentStage(data.stage as string, "complete");
              // Trigger page refresh at key milestones
              if (["logo_linkedin", "personnel", "score", "spend_aggregate"].includes(data.stage as string)) {
                window.dispatchEvent(
                  new CustomEvent("enrichment-complete", { detail: { buyerId } })
                );
              }
              break;
            case "done":
              s.completeEnrichment(data.enrichmentScore as number);
              window.dispatchEvent(
                new CustomEvent("enrichment-complete", { detail: { buyerId } })
              );
              break;
          }
        } catch {
          // skip
        }
      }
    }

    const final = useAgentStore.getState();
    if (final.activeEnrichment && !final.activeEnrichment.completedAt) {
      final.completeEnrichment();
      window.dispatchEvent(
        new CustomEvent("enrichment-complete", { detail: { buyerId } })
      );
    }
  } catch {
    useAgentStore.getState().completeEnrichment();
  }
}

interface EnrichmentConfirmProps {
  lastMessage: AgentMessage | undefined;
  isStreaming: boolean;
}

export function EnrichmentConfirm({ lastMessage, isStreaming }: EnrichmentConfirmProps) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const confirmation = useAgentStore((s) => s.enrichmentConfirmation);
  const activeEnrichment = useAgentStore((s) => s.activeEnrichment);
  const { context } = useAgentContext();
  const prefersReducedMotion = useReducedMotion();

  const handleConfirm = useCallback(() => {
    const id = confirmation?.buyerId ?? context.buyerId;
    const name = confirmation?.buyerName ?? context.buyerName ?? "this buyer";
    if (confirmation) {
      useAgentStore.getState().setEnrichmentConfirmation(null);
    }
    if (lastMessage) {
      setDismissed(lastMessage.id);
    }
    if (id) {
      startEnrichmentDirect(id, name);
    }
  }, [confirmation, context.buyerId, context.buyerName, lastMessage]);

  const handleCancel = useCallback(() => {
    if (confirmation) {
      useAgentStore.getState().setEnrichmentConfirmation(null);
    }
    if (lastMessage) {
      setDismissed(lastMessage.id);
    }
  }, [confirmation, lastMessage]);

  if (isStreaming || activeEnrichment) return null;

  const fromStore = !!confirmation;
  const fromText = !fromStore && lastMessage
    && dismissed !== lastMessage.id
    && detectEnrichmentSuggestion(lastMessage);

  if (!fromStore && !fromText) return null;

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
