"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Search,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  ArrowRight,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MeetSculptorProps {
  onContinue: () => void;
  onConnectSlack: () => void;
  onSkip: () => void;
}

const CAPABILITIES = [
  {
    icon: Search,
    text: "Search contracts by sector, region, value",
    delay: 0,
  },
  {
    icon: Users,
    text: "Find buyers and key decision-makers",
    delay: 0.08,
  },
  {
    icon: Bell,
    text: "Track procurement signals from board meetings",
    delay: 0.16,
  },
  {
    icon: BarChart3,
    text: "Analyze spending patterns",
    delay: 0.24,
  },
  {
    icon: MessageSquare,
    text: "Available in web chat (Cmd+K) and Slack",
    delay: 0.32,
  },
] as const;

export function MeetSculptor({
  onContinue,
  onConnectSlack,
  onSkip,
}: MeetSculptorProps) {
  const prefersReducedMotion = useReducedMotion();
  const [trialQuery, setTrialQuery] = useState("");
  const [trialResponse, setTrialResponse] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSent, setTrialSent] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to response when it appears
  useEffect(() => {
    if (trialResponse && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [trialResponse]);

  const handleTrialSend = useCallback(async () => {
    if (!trialQuery.trim() || trialLoading) return;
    setTrialLoading(true);
    setTrialSent(true);
    setTrialResponse(null);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: trialQuery }],
          context: { page: "dashboard" },
        }),
      });

      if (!res.ok || !res.body) {
        setTrialResponse(
          "Sorry, I could not process that right now. You can try again from the dashboard."
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text_delta" && event.content) {
              accumulated += event.content;
              setTrialResponse(accumulated);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      if (!accumulated) {
        setTrialResponse(
          "I processed your request but had no text to show. Try asking me something from the dashboard!"
        );
      }
    } catch {
      setTrialResponse(
        "Connection error. You can chat with me anytime from the dashboard using Cmd+K."
      );
    } finally {
      setTrialLoading(false);
    }
  }, [trialQuery, trialLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleTrialSend();
      }
    },
    [handleTrialSend]
  );

  const baseMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      {/* Sculptor avatar + intro */}
      <motion.div
        {...baseMotion}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/20">
            <span className="agent-trigger-orb !w-9 !h-9" aria-hidden="true" />
          </div>
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: 0.3,
            }}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center"
          >
            <span className="text-[10px] text-white font-bold">AI</span>
          </motion.div>
        </div>

        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            Meet Sculptor
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Your AI procurement research assistant. Sculptor remembers your
            preferences and past searches across web and Slack.
          </p>
        </div>
      </motion.div>

      {/* Capabilities list */}
      <div className="space-y-2">
        {CAPABILITIES.map((cap) => (
          <motion.div
            key={cap.text}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.2, delay: 0.2 + cap.delay, ease: "easeOut" }
            }
            className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"
          >
            <cap.icon className="h-4 w-4 shrink-0 text-primary" />
            <span>{cap.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Interactive trial */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.25, delay: 0.6 }
        }
        className="space-y-3"
      >
        <p className="text-sm font-medium">Try asking Sculptor something:</p>
        <div className="flex items-center gap-2">
          <Input
            value={trialQuery}
            onChange={(e) => setTrialQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Find NHS trusts in London"
            disabled={trialLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleTrialSend}
            disabled={!trialQuery.trim() || trialLoading}
            className="shrink-0"
            aria-label="Send message"
          >
            {trialLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <AnimatePresence>
          {trialSent && (
            <motion.div
              ref={responseRef}
              initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-lg border bg-muted/50 p-3"
            >
              {trialLoading && !trialResponse ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sculptor is thinking...</span>
                </div>
              ) : trialResponse ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {trialResponse}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.2, delay: 0.8 }
        }
        className="flex items-center justify-between pt-2"
      >
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onConnectSlack}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Connect Slack
          </Button>
          <Button onClick={onContinue}>
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
