"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Loader2,
  PoundSterling,
  Receipt,
  CalendarDays,
  Info,
  ArrowRightLeft,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { CompetitorSpendResult, CompetitorSpendBuyer } from "@/lib/competitors";

interface SpendTabProps {
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

function renderStatCard(
  icon: React.ElementType,
  label: string,
  value: string,
  index: number
) {
  const Icon = icon;
  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 * index }}
      className="rounded-lg border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </motion.div>
  );
}

function renderBuyerCard(buyer: CompetitorSpendBuyer, index: number) {
  return (
    <motion.div
      key={buyer.buyerId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.15,
        delay: Math.min(index * 0.03, 0.3),
      }}
      className="rounded-lg border bg-card p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Link
              href={`/buyers/${buyer.buyerId}`}
              className="font-medium hover:text-primary transition-colors truncate flex items-center gap-1 group"
            >
              {buyer.buyerName}
              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            {buyer.hasContractRelationship && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] gap-0.5 shrink-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      <ArrowRightLeft className="h-2.5 w-2.5" />
                      Contract
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      Also has formal contract awards with this supplier
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-6">
            <span className="text-xs text-muted-foreground">
              {buyer.transactionCount.toLocaleString()} payment
              {buyer.transactionCount !== 1 ? "s" : ""}
            </span>
            {buyer.earliestPayment && buyer.latestPayment && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(buyer.earliestPayment)} &mdash;{" "}
                {formatDate(buyer.latestPayment)}
              </span>
            )}
            {buyer.categories.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Tag className="h-3 w-3" />
                {buyer.categories[0]}
                {buyer.categories.length > 1 && (
                  <span className="text-foreground/60">
                    +{buyer.categories.length - 1}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums">
            {formatValue(buyer.totalSpend)}
          </p>
          <p className="text-xs text-muted-foreground">total spend</p>
        </div>
      </div>
    </motion.div>
  );
}

export function SpendTab({ supplierName }: SpendTabProps) {
  const [spend, setSpend] = useState<CompetitorSpendResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSpend() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/competitors/${encodeURIComponent(supplierName)}/spend`
        );
        if (!res.ok) throw new Error("Failed to fetch spend data");
        const data = await res.json();
        setSpend(data.spend ?? null);
      } catch {
        setSpend(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSpend();
  }, [supplierName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!spend || spend.transactionCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            No spend data available for this supplier
          </p>
          <p className="text-xs text-muted-foreground/70">
            Transparency payment data is sourced from UK government spending reports (25k+ or 500+ payments).
            Not all buyers have published spend data for this vendor.
          </p>
        </div>
        <DataSourceBanner />
      </motion.div>
    );
  }

  const stats = [
    {
      icon: PoundSterling,
      label: "Total Spend",
      value: formatValue(spend.totalSpend),
    },
    {
      icon: Receipt,
      label: "Payments",
      value: spend.transactionCount.toLocaleString(),
    },
    {
      icon: Building2,
      label: "Paying Buyers",
      value: spend.buyerCount.toLocaleString(),
    },
    {
      icon: ArrowRightLeft,
      label: "Also in Contracts",
      value: `${spend.contractBuyerOverlap} of ${spend.buyerCount}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => renderStatCard(stat.icon, stat.label, stat.value, i))}
      </div>

      {/* Data source indicator — SPND-04 */}
      <DataSourceBanner />

      {/* Buyer breakdown — SPND-03 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {spend.buyerCount} buyer{spend.buyerCount !== 1 ? "s" : ""} — sorted
            by total spend
          </p>
          {spend.earliestPayment && spend.latestPayment && (
            <p className="text-xs text-muted-foreground">
              {formatDate(spend.earliestPayment)} &mdash;{" "}
              {formatDate(spend.latestPayment)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {spend.buyers.map((buyer, i) => renderBuyerCard(buyer, i))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function DataSourceBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.15 }}
      className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-4 py-3"
    >
      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground/80">Spend data</span> comes from
          UK government transparency CSV reports — actual payments to vendors above
          the disclosure threshold (typically 25k+ or 500+).
        </p>
        <p>
          <span className="font-medium text-foreground/80">Contract data</span> comes
          from Contracts Finder and Find a Tender — formal procurement awards.
          These are separate data sources and may not fully overlap.
        </p>
      </div>
    </motion.div>
  );
}
