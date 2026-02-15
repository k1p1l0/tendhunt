"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Building2, FileText } from "lucide-react";
import { motion } from "motion/react";
import { CompetitorsListBreadcrumb } from "./breadcrumb";
import { CompetitorSearchBar } from "@/components/competitors/search-bar";
import { WatchlistSection } from "@/components/competitors/watchlist-section";
import { useAgentContext } from "@/components/agent/agent-provider";

import type { SupplierSearchResult } from "@/lib/competitors";

export default function CompetitorsPage() {
  const router = useRouter();
  const { setContext } = useAgentContext();

  useEffect(() => {
    setContext({ page: "competitors" });
    return () => setContext({ page: "dashboard" });
  }, [setContext]);

  const handleSelect = useCallback(
    (result: SupplierSearchResult) => {
      router.push(`/competitors/${encodeURIComponent(result.name)}`);
    },
    [router]
  );

  return (
    <div className="space-y-8">
      <CompetitorsListBreadcrumb />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center text-center pt-8 pb-4"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">
          Competitor Intelligence
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mb-8">
          Search any company to see their public sector contract history, buyer
          relationships, and spend footprint.
        </p>
        <CompetitorSearchBar onSelect={handleSelect} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
      >
        <HintCard
          icon={FileText}
          title="Contract History"
          description="See every awarded contract for any supplier across CF and FaT."
        />
        <HintCard
          icon={Building2}
          title="Buyer Relationships"
          description="Discover which government bodies work with a supplier."
        />
        <HintCard
          icon={TrendingUp}
          title="Spend Footprint"
          description="View actual payment data from buyer transparency reports."
        />
      </motion.div>

      <WatchlistSection />
    </div>
  );
}

function HintCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-left">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
