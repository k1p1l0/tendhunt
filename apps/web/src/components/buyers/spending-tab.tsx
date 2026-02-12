"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SpendingHero } from "@/components/buyers/spending-hero";
import { SpendCategoriesChart } from "@/components/buyers/spend-categories-chart";
import { SpendTimelineChart } from "@/components/buyers/spend-timeline-chart";
import { SpendRecurringCard } from "@/components/buyers/spend-recurring-card";
import { SpendVendorsTable } from "@/components/buyers/spend-vendors-table";
import { SpendBreakdownTable } from "@/components/buyers/spend-breakdown-table";
import type { SpendMetrics, ProfileMatch, SpendOpportunities as SpendOpportunitiesType } from "@/lib/spend-analytics";
import { Info } from "lucide-react";

interface SpendingTabProps {
  buyerId: string;
  buyerName: string;
}

interface SpendAPIResponse {
  hasSpendData: boolean;
  summary?: {
    categoryBreakdown: Array<{ category: string; total: number; count: number }>;
    monthlyTotals: Array<{ year: number; month: number; total: number }>;
    vendorBreakdown: Array<{ vendor: string; total: number; count: number }>;
  };
  metrics?: SpendMetrics;
  opportunities?: SpendOpportunitiesType;
}

export function SpendingTab({ buyerId, buyerName }: SpendingTabProps) {
  const [data, setData] = useState<SpendAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedVendor, setSelectedVendor] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpendData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/buyers/${buyerId}/spending`);
        if (!res.ok) {
          throw new Error(`Failed to load spending data (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load spending data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSpendData();
    return () => {
      cancelled = true;
    };
  }, [buyerId]);

  if (loading) {
    return <SpendingTabSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasSpendData || !data.summary || !data.metrics) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Info className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                No spending data available for {buyerName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Spend data is sourced from UK transparency reports and may not be
                available for all organisations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profileMatch: ProfileMatch | null =
    data.opportunities?.profileMatch ?? null;

  const opportunities = data.opportunities ?? {
    profileMatch: null,
    recurringPatterns: [],
    vendorConcentration: [],
    spendGrowthSignals: [],
  };

  const categories = data.summary.categoryBreakdown.map((c) => c.category);
  const vendors = data.summary.vendorBreakdown.map((v) => v.vendor);

  const handleVendorClick = (vendor: string) => {
    setSelectedVendor((prev) => (prev === vendor ? undefined : vendor));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <SpendingHero
          metrics={data.metrics}
          profileMatch={profileMatch}
          monthlyTotals={data.summary.monthlyTotals}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <SpendCategoriesChart
          data={data.summary.categoryBreakdown}
          onCategoryClick={(category) => setSelectedCategory(category)}
        />
        <SpendTimelineChart data={data.summary.monthlyTotals} />
        <SpendRecurringCard recurringPatterns={opportunities.recurringPatterns} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <SpendVendorsTable
          data={data.summary.vendorBreakdown}
          totalSpend={data.metrics.totalSpend}
          selectedVendor={selectedVendor}
          onVendorClick={handleVendorClick}
        />
        <SpendBreakdownTable
          buyerId={buyerId}
          initialCategory={selectedCategory}
          initialVendor={selectedVendor}
          categories={categories}
          vendors={vendors}
        />
      </motion.div>
    </div>
  );
}

function SpendingTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton — 5 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="mt-3 h-6 w-24" />
              {i === 0 && <Skeleton className="mt-2 h-5 w-16 rounded-full" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-5 w-36" />
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
