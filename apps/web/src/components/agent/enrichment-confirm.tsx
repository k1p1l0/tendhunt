"use client";

import { motion, useReducedMotion } from "motion/react";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/agent-store";

interface EnrichmentConfirmProps {
  onConfirm: (text: string) => void;
}

export function EnrichmentConfirm({ onConfirm }: EnrichmentConfirmProps) {
  const confirmation = useAgentStore((s) => s.enrichmentConfirmation);
  const prefersReducedMotion = useReducedMotion();

  if (!confirmation) return null;

  const handleConfirm = () => {
    onConfirm(`Yes, enrich ${confirmation.buyerName}`);
  };

  const handleCancel = () => {
    useAgentStore.getState().setEnrichmentConfirmation(null);
    onConfirm("No, skip enrichment for now");
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
