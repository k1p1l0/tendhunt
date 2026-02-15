"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SculptorIcon } from "@/components/sculptor/sculptor-icon";
import { SculptorHeroInput } from "@/components/sculptor/sculptor-hero-input";
import { RecentConversations } from "@/components/sculptor/recent-conversations";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";
import { AccountManagerCard } from "@/components/dashboard/account-manager-card";
import { CompetitorFeed } from "@/components/dashboard/competitor-feed";
import { useAgent } from "@/hooks/use-agent";
import { useAgentStore } from "@/stores/agent-store";

import type { RecentConversation } from "@/lib/dashboard";

const SUGGESTIONS = [
  "Find NHS trusts with high enrichment scores",
  "Show contracts expiring this month",
  "What are the latest procurement signals?",
  "Which buyers have the highest budgets?",
];

interface AccountManager {
  name: string;
  email: string;
  calendlyUrl: string;
  greeting: string;
}

interface SculptorHomepageProps {
  userName: string;
  recentConversations: RecentConversation[];
  accountManager: AccountManager;
}

export function SculptorHomepage({
  userName,
  recentConversations,
  accountManager,
}: SculptorHomepageProps) {
  const { sendMessage, isStreaming } = useAgent();
  const prefersReducedMotion = useReducedMotion();

  const handleHeroSend = useCallback(
    (content: string) => {
      useAgentStore.getState().setPanelOpen(true);
      sendMessage(content);
    },
    [sendMessage]
  );

  const iconMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } };

  const stagger1 = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.1 },
      };

  const stagger2 = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.2 },
      };

  const stagger3 = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.3 },
      };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-3.5rem)]">
      <AgentContextSetter context={{ page: "dashboard" }} />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-4 pt-8 pb-4">
        {/* Animated starburst icon */}
        <motion.div {...iconMotion} transition={{ duration: 0.4, ease: "easeOut" }}>
          <SculptorIcon size={64} animate />
        </motion.div>

        {/* Greeting */}
        <motion.div {...stagger1} className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mt-6">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground mt-2">
            What would you like to explore?
          </p>
        </motion.div>

        {/* Hero chat input */}
        <motion.div {...stagger2} className="w-full mt-8">
          <SculptorHeroInput onSend={handleHeroSend} isStreaming={isStreaming} />
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          {...stagger3}
          className="flex flex-wrap gap-2 mt-4 justify-center"
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleHeroSend(s)}
              className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors min-h-[44px]"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Below-the-fold content */}
      <div className="w-full max-w-5xl px-4 pb-8 space-y-8">
        <CompetitorFeed />

        {recentConversations.length > 0 && (
          <RecentConversations conversations={recentConversations} />
        )}

        <AccountManagerCard {...accountManager} />
      </div>
    </div>
  );
}
