"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { SpendMetrics, ProfileMatch } from "@/lib/spend-analytics";
import { TrendingUp, Users, Calendar, PoundSterling } from "lucide-react";

interface SpendingHeroProps {
  metrics: SpendMetrics;
  profileMatch: ProfileMatch | null;
}

const gbpFull = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatDateRange(earliest: string | null, latest: string | null) {
  if (!earliest || !latest) return "N/A";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  return `${fmt(earliest)} - ${fmt(latest)}`;
}

export function SpendingHero({ metrics, profileMatch }: SpendingHeroProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-blue-500/5 to-transparent p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: Key metrics grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricItem
                icon={<PoundSterling className="h-4 w-4" />}
                label="Total Spend"
                value={gbpFull.format(metrics.totalSpend)}
                large
              />
              <MetricItem
                icon={<TrendingUp className="h-4 w-4" />}
                label="Avg Monthly"
                value={gbpCompact.format(metrics.avgMonthlySpend)}
              />
              <MetricItem
                icon={<Users className="h-4 w-4" />}
                label="Unique Vendors"
                value={String(metrics.uniqueVendors)}
              />
              <MetricItem
                icon={<Calendar className="h-4 w-4" />}
                label="Date Range"
                value={formatDateRange(
                  metrics.dateRange.earliest,
                  metrics.dateRange.latest
                )}
              />
            </div>

            {/* Right: Profile match */}
            <div className="w-full lg:max-w-xs">
              {profileMatch && profileMatch.matchedCategories.length > 0 ? (
                <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-500/5 p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Profile Match
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {profileMatch.matchPercentage}%
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {gbpCompact.format(profileMatch.totalMatchedSpend)} spent in
                    your sectors
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profileMatch.matchedCategories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300"
                      >
                        {cat}
                      </span>
                    ))}
                    {profileMatch.matchedCategories.length > 3 && (
                      <span className="inline-block px-1 text-xs text-muted-foreground">
                        and {profileMatch.matchedCategories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Complete your company profile to see spend match
                  </div>
                  <a
                    href="/settings"
                    className="mt-2 inline-block text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                  >
                    Go to Settings
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({
  icon,
  label,
  value,
  large,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          large
            ? "text-xl font-bold tracking-tight"
            : "text-lg font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}
