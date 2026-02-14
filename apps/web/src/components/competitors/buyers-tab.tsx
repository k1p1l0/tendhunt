"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Loader2, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";

import type { CompetitorBuyer } from "@/lib/competitors";

interface BuyersTabProps {
  supplierName: string;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `\u00A3${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}K`;
  if (value > 0) return `\u00A3${value.toFixed(0)}`;
  return "\u2014";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function relationshipDuration(
  first: string | null,
  latest: string | null
): string {
  if (!first || !latest) return "";
  const start = new Date(first);
  const end = new Date(latest);
  const diffMs = end.getTime() - start.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (diffYears < 0.08) return "< 1 month";
  if (diffYears < 1) return `${Math.round(diffYears * 12)} months`;
  if (diffYears < 2) return "1 year";
  return `${Math.round(diffYears)} years`;
}

export function BuyersTab({ supplierName }: BuyersTabProps) {
  const [buyers, setBuyers] = useState<CompetitorBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBuyers() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/competitors/${encodeURIComponent(supplierName)}/buyers`
        );
        if (!res.ok) throw new Error("Failed to fetch buyers");
        const data = await res.json();
        setBuyers(data.buyers ?? []);
      } catch {
        setBuyers([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBuyers();
  }, [supplierName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (buyers.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        No buyer relationships found
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        {buyers.length} buyer{buyers.length !== 1 ? "s" : ""} — sorted by total
        contract value
      </p>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {buyers.map((buyer, i) => (
            <motion.div
              key={buyer.buyerName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15,
                delay: Math.min(i * 0.03, 0.3),
              }}
              className="rounded-lg border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    {buyer.buyerId ? (
                      <Link
                        href={`/buyers/${buyer.buyerId}`}
                        className="font-medium hover:text-primary transition-colors truncate flex items-center gap-1 group"
                      >
                        {buyer.buyerName}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ) : (
                      <span className="font-medium truncate">
                        {buyer.buyerName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 ml-6">
                    {buyer.sectors.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {buyer.sectors[0]}
                      </Badge>
                    )}
                    {buyer.regions.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {buyer.regions[0]}
                      </Badge>
                    )}
                    {buyer.firstContract && buyer.latestContract && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(buyer.firstContract)} &mdash;{" "}
                        {formatDate(buyer.latestContract)}
                        <span className="ml-1 text-foreground/60">
                          ({relationshipDuration(
                            buyer.firstContract,
                            buyer.latestContract
                          )})
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatValue(buyer.totalValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {buyer.contractCount} contract
                    {buyer.contractCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
