"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAgentStore } from "@/stores/agent-store";

export function EnrichmentRefresh({ buyerId }: { buyerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeEnrichment = useAgentStore((s) => s.activeEnrichment);
  const lastRefreshRef = useRef(0);

  const triggerRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) return;
    lastRefreshRef.current = now;

    setTimeout(() => {
      // Preserve existing search params (e.g. ?tab=contacts) + add cache bust
      const params = new URLSearchParams(searchParams.toString());
      params.set("_t", String(Date.now()));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 800);
  };

  // Refresh when enrichment completes for this buyer (via store)
  useEffect(() => {
    if (!activeEnrichment) return;
    if (activeEnrichment.buyerId !== buyerId) return;
    if (!activeEnrichment.completedAt) return;
    triggerRefresh();
  }, [activeEnrichment, buyerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also listen for mid-enrichment refresh events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { buyerId: string };
      if (detail.buyerId !== buyerId) return;
      triggerRefresh();
    };
    window.addEventListener("enrichment-complete", handler);
    return () => window.removeEventListener("enrichment-complete", handler);
  }, [buyerId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
