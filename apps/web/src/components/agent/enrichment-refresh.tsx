"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/stores/agent-store";

export function EnrichmentRefresh({ buyerId }: { buyerId: string }) {
  const router = useRouter();
  const activeEnrichment = useAgentStore((s) => s.activeEnrichment);
  const lastRefreshRef = useRef(0);

  // Refresh when enrichment completes for this buyer
  useEffect(() => {
    if (!activeEnrichment) return;
    if (activeEnrichment.buyerId !== buyerId) return;
    if (!activeEnrichment.completedAt) return;

    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) return;
    lastRefreshRef.current = now;

    // Delay slightly to let DB writes propagate
    const timer = setTimeout(() => {
      router.refresh();
    }, 800);
    return () => clearTimeout(timer);
  }, [activeEnrichment, buyerId, router]);

  // Also listen for mid-enrichment refresh events (after key milestones)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { buyerId: string };
      if (detail.buyerId !== buyerId) return;

      const now = Date.now();
      if (now - lastRefreshRef.current < 3000) return;
      lastRefreshRef.current = now;

      setTimeout(() => router.refresh(), 500);
    };
    window.addEventListener("enrichment-complete", handler);
    return () => window.removeEventListener("enrichment-complete", handler);
  }, [buyerId, router]);

  return null;
}
