"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Search,
  Users,
  BarChart3,
  Bell,
  Brain,
} from "lucide-react";
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

const WELCOME_CAPABILITIES = [
  { icon: Search, text: "Search contracts by sector, region, and value" },
  { icon: Users, text: "Find buyers and key decision-makers" },
  { icon: Bell, text: "Track procurement signals from board meetings" },
  { icon: BarChart3, text: "Analyze spending patterns and budgets" },
  { icon: Brain, text: "Remembers your preferences across web and Slack" },
] as const;

interface SuggestedActionsProps {
  onSend: (text: string) => void;
}

export function SuggestedActions({ onSend }: SuggestedActionsProps) {
  const { context } = useAgentContext();
  const prefersReducedMotion = useReducedMotion();
  const prompts = getPrompts(context);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkFirstTime() {
      try {
        const res = await fetch("/api/agent/check-first-use");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setIsFirstTime(data.isFirstTime === true);
        }
      } catch {
        // Default to non-first-time on error
      } finally {
        if (!cancelled) setCheckedFirstTime(true);
      }
    }
    checkFirstTime();
    return () => { cancelled = true; };
  }, []);

  const baseMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  // Show skeleton until we know first-time status
  if (!checkedFirstTime) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5 py-10 gap-8">
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2 w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 w-full rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-5 py-10 gap-8">
      {/* Hero */}
      <motion.div
        {...baseMotion}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-3 text-center"
      >
        <div className="relative h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <span className="agent-trigger-orb !w-7 !h-7" aria-hidden="true" />
          {isFirstTime && (
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background"
            />
          )}
        </div>

        {isFirstTime ? (
          <>
            <h3 className="text-lg font-semibold tracking-tight">
              I&apos;m Sculptor
            </h3>
            <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              Your procurement research assistant. I can search contracts, find buyers,
              and analyze spending data across UK public sector procurement.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold tracking-tight">How can I help?</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
              Ask me anything about UK public sector procurement, buyers, contracts, or spending data.
            </p>
          </>
        )}
      </motion.div>

      {/* First-time: capabilities list */}
      {isFirstTime && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.15 }}
          className="w-full space-y-1.5"
        >
          {WELCOME_CAPABILITIES.map((cap, index) => (
            <motion.div
              key={cap.text}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.15, delay: 0.2 + index * 0.06, ease: "easeOut" }
              }
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <cap.icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>{cap.text}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

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
                : {
                    duration: 0.15,
                    delay: (isFirstTime ? 0.5 : 0.1) + index * 0.05,
                    ease: "easeOut",
                  }
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
