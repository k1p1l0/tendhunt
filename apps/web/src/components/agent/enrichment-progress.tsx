"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useAgentStore } from "@/stores/agent-store";

import type { EnrichmentStage } from "@/stores/agent-store";

function StageIcon({ status }: { status: EnrichmentStage["status"] }) {
  const prefersReducedMotion = useReducedMotion();

  switch (status) {
    case "active":
      return (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
          <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
        </svg>
      );
    case "complete":
      return (
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </motion.div>
      );
    case "failed":
      return (
        <div className="h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
          <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
        </div>
      );
    default:
      return <div className="h-4 w-4 rounded-full border border-border" />;
  }
}

function ElapsedTime({ startedAt, completedAt }: { startedAt: Date; completedAt?: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (completedAt) {
      requestAnimationFrame(() => {
        setElapsed(Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000));
      });
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return (
    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}

export function EnrichmentProgress() {
  const enrichment = useAgentStore((s) => s.activeEnrichment);
  const prefersReducedMotion = useReducedMotion();

  if (!enrichment || enrichment.stages.length === 0) return null;

  const isComplete = !!enrichment.completedAt;
  const activeStage = enrichment.stages.find((s) => s.status === "active");
  const completedCount = enrichment.stages.filter((s) => s.status === "complete").length;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-background/80 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
        {isComplete ? (
          <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Zap className="h-3 w-3 text-white" />
          </div>
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {isComplete
              ? `Enriched ${enrichment.buyerName}`
              : `Enriching ${enrichment.buyerName}...`}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isComplete
              ? `Score: ${enrichment.enrichmentScore ?? 0}/100`
              : activeStage?.label ?? "Starting..."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {completedCount}/{enrichment.stages.length}
          </span>
          <ElapsedTime startedAt={enrichment.startedAt} completedAt={enrichment.completedAt} />
        </div>
      </div>

      {/* Stages list */}
      <div className="px-4 py-2 space-y-0.5 max-h-[240px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {enrichment.stages.map((stage) => (
            <motion.div
              key={stage.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 py-1 transition-opacity ${
                stage.status === "pending" ? "opacity-40" : "opacity-100"
              }`}
            >
              <StageIcon status={stage.status} />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {stage.label}
              </span>
              {stage.detail && (
                <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">
                  {stage.detail}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${(completedCount / enrichment.stages.length) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
