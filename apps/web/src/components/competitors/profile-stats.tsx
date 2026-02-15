"use client";

import { FileText, PoundSterling, Building2, CalendarDays, Activity } from "lucide-react";
import { motion } from "motion/react";

import type { CompetitorProfile } from "@/lib/competitors";

interface ProfileStatsProps {
  profile: CompetitorProfile;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const stats = [
    {
      icon: FileText,
      label: "Contracts",
      value: profile.contractCount.toLocaleString(),
    },
    {
      icon: PoundSterling,
      label: "Total Value",
      value: `\u00A3${formatValue(profile.totalValue)}`,
    },
    {
      icon: Activity,
      label: "Active",
      value: profile.activeContracts.toLocaleString(),
    },
    {
      icon: Building2,
      label: "Buyers",
      value: profile.buyerCount.toLocaleString(),
    },
    {
      icon: CalendarDays,
      label: "Latest Award",
      value: profile.latestAwardDate
        ? formatDate(profile.latestAwardDate)
        : "N/A",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
            delay: 0.05 * i,
          }}
          className="rounded-lg border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <stat.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{stat.label}</span>
          </div>
          <p className="text-lg font-semibold">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
