"use client";

import { motion } from "motion/react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { SpendMetrics, ProfileMatch } from "@/lib/spend-analytics";
import { TrendingUp, TrendingDown, Users, Calendar, PoundSterling, BarChart3 } from "lucide-react";

interface MonthlyTotal {
  year: number;
  month: number;
  total: number;
}

interface SpendingHeroProps {
  metrics: SpendMetrics;
  profileMatch: ProfileMatch | null;
  monthlyTotals?: MonthlyTotal[];
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
  return `${fmt(earliest)} – ${fmt(latest)}`;
}

function computeTrendPercent(monthlyTotals?: MonthlyTotal[]): number | null {
  if (!monthlyTotals || monthlyTotals.length < 4) return null;

  const sorted = [...monthlyTotals].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  const recent = sorted.slice(-3);
  const prior = sorted.slice(-6, -3);
  if (prior.length === 0) return null;

  const recentAvg = recent.reduce((s, m) => s + m.total, 0) / recent.length;
  const priorAvg = prior.reduce((s, m) => s + m.total, 0) / prior.length;

  if (priorAvg === 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

const ACCENT_COLORS = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
} as const;

export function SpendingHero({ metrics, profileMatch, monthlyTotals }: SpendingHeroProps) {
  const trendPercent = computeTrendPercent(monthlyTotals);

  const statCards: {
    label: string;
    value: string;
    accent: keyof typeof ACCENT_COLORS;
    icon: React.ReactNode;
    trend?: number | null;
  }[] = [
    {
      label: "Total Spend",
      value: gbpFull.format(metrics.totalSpend),
      accent: "blue",
      icon: <PoundSterling className="h-3.5 w-3.5" />,
      trend: trendPercent,
    },
    {
      label: "Avg Monthly",
      value: gbpCompact.format(metrics.avgMonthlySpend),
      accent: "green",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
    },
    {
      label: "Unique Vendors",
      value: String(metrics.uniqueVendors),
      accent: "violet",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      label: "Date Range",
      value: formatDateRange(metrics.dateRange.earliest, metrics.dateRange.latest),
      accent: "amber",
      icon: <Calendar className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {statCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05, ease: "easeOut" }}
        >
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${ACCENT_COLORS[card.accent]}`} />
                {card.icon}
                {card.label}
              </div>
              <div className="mt-2 text-xl font-bold tracking-tight">
                {card.value}
              </div>
              {card.trend != null && (
                <TrendBadge value={card.trend} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Profile match card — spans remaining column on lg */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: statCards.length * 0.05, ease: "easeOut" }}
      >
        <ProfileMatchCard profileMatch={profileMatch} />
      </motion.div>
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  const formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {formatted}
    </span>
  );
}

function ProfileMatchCard({ profileMatch }: { profileMatch: ProfileMatch | null }) {
  if (profileMatch && profileMatch.matchedCategories.length > 0) {
    return (
      <Card className="h-full border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Profile Match
          </div>
          <div className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {profileMatch.matchPercentage}%
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {gbpCompact.format(profileMatch.totalMatchedSpend)} in your sectors
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
                +{profileMatch.matchedCategories.length - 3} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profileMatch) {
    return (
      <Card className="h-full border-l-4 border-l-muted">
        <CardContent className="p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Profile Match
          </div>
          <div className="mt-1 text-3xl font-bold text-muted-foreground">0%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            No category overlap with this buyer&apos;s spend
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full items-center justify-center border-dashed">
      <CardContent className="p-4 text-center">
        <div className="text-sm text-muted-foreground">
          Complete your company profile to see spend match
        </div>
        <a
          href="/settings"
          className="mt-2 inline-block text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
        >
          Go to Settings
        </a>
      </CardContent>
    </Card>
  );
}
