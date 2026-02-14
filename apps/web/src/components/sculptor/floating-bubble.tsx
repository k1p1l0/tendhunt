"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import { useAgentContext } from "@/components/agent/agent-provider";
import { SculptorIcon } from "./sculptor-icon";

import type { AgentPageContext } from "@/components/agent/agent-provider";

function getNudges(context: AgentPageContext): string[] {
  switch (context.page) {
    case "buyer_detail":
      return [
        context.buyerName
          ? `Want me to check signals for ${context.buyerName}?`
          : "Want me to check buying signals?",
        "I can find the key decision-makers",
        context.buyerName
          ? `I can analyse ${context.buyerName}'s spend`
          : "Want me to analyse their spend?",
        "I can find similar buyers for you",
      ];
    case "scanner":
      return [
        "I can summarise the top opportunities",
        "Want me to find contracts with upcoming deadlines?",
        "I can compare spending patterns here",
      ];
    case "contract_detail":
      return [
        "Want me to find similar contracts?",
        "I can check procurement signals for this buyer",
        context.contractBuyerName
          ? `I can tell you about ${context.contractBuyerName}`
          : "Want to know more about this buyer?",
      ];
    case "contracts":
      return [
        "I can help you find the best contracts",
        "Want me to filter by sector or region?",
      ];
    case "buyers":
      return [
        "I can help you find the right buyers",
        "Want me to find high-scoring buyers?",
      ];
    default:
      return [
        "Need help finding opportunities?",
        "I can search contracts and buyers for you",
      ];
  }
}

const NUDGE_DELAY_MS = 10_000;
const NUDGE_VISIBLE_MS = 8_000;

export function FloatingBubble() {
  const pathname = usePathname();
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const prefersReducedMotion = useReducedMotion();
  const { context } = useAgentContext();

  const [nudge, setNudge] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isOnDashboard = pathname === "/dashboard";
  const shouldShow = !isOnDashboard && !panelOpen;

  // Reset dismissed state when page changes
  useEffect(() => {
    requestAnimationFrame(() => {
      setNudge(null);
      setDismissed(false);
    });
  }, [pathname]);

  // Show a nudge after a delay
  useEffect(() => {
    if (!shouldShow || dismissed || panelOpen) return;

    const showTimer = setTimeout(() => {
      const nudges = getNudges(context);
      const pick = nudges[Math.floor(Math.random() * nudges.length)];
      setNudge(pick);
    }, NUDGE_DELAY_MS);

    return () => clearTimeout(showTimer);
  }, [shouldShow, dismissed, panelOpen, context]);

  // Auto-dismiss after visible duration
  useEffect(() => {
    if (!nudge) return;

    const hideTimer = setTimeout(() => {
      setNudge(null);
      setDismissed(true);
    }, NUDGE_VISIBLE_MS);

    return () => clearTimeout(hideTimer);
  }, [nudge]);

  const handleNudgeClick = useCallback(() => {
    setNudge(null);
    setDismissed(true);
    useAgentStore.getState().setPanelOpen(true);
  }, []);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNudge(null);
    setDismissed(true);
  }, []);

  return (
    <AnimatePresence>
      {shouldShow && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
          {/* Nudge tooltip */}
          <AnimatePresence>
            {nudge && (
              <motion.button
                type="button"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.97 }}
                transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
                onClick={handleNudgeClick}
                className="group relative max-w-[260px] rounded-2xl rounded-br-md bg-background border shadow-lg px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/60 cursor-pointer"
              >
                <span>{nudge}</span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Bubble */}
          <motion.button
            type="button"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }}
            onClick={() => useAgentStore.getState().setPanelOpen(true)}
            aria-label="Open Sculptor assistant"
            className="sculptor-bubble-pulse h-14 w-14 rounded-full bg-background border shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow min-h-[44px] min-w-[44px]"
          >
            <SculptorIcon size={28} />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
