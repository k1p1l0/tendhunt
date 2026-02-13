"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function EnrichmentRefresh({ buyerId }: { buyerId: string }) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { buyerId: string };
      if (detail.buyerId === buyerId) {
        router.refresh();
      }
    };
    window.addEventListener("enrichment-complete", handler);
    return () => window.removeEventListener("enrichment-complete", handler);
  }, [buyerId, router]);

  return null;
}
