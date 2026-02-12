"use client";

import {
  FileText,
  Building2,
  Zap,
  Users,
  CreditCard,
  Receipt,
  FileStack,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { CollectionCounts } from "@/lib/stats";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  key: keyof CollectionCounts;
  icon: LucideIcon;
  primary?: boolean;
}

const statItems: StatItem[] = [
  { label: "Contracts", key: "contracts", icon: FileText, primary: true },
  { label: "Buyers", key: "buyers", icon: Building2, primary: true },
  { label: "Signals", key: "signals", icon: Zap, primary: true },
  { label: "Users", key: "users", icon: Users, primary: true },
  { label: "Spend Txns", key: "spendTransactions", icon: Receipt },
  { label: "Board Docs", key: "boardDocuments", icon: FileStack },
  { label: "Key Personnel", key: "keyPersonnel", icon: UserCheck },
  { label: "Company Profiles", key: "companyProfiles", icon: Briefcase },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-0">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface StatsCardsProps {
  counts: CollectionCounts | null;
  loading?: boolean;
}

export function StatsCards({ counts, loading }: StatsCardsProps) {
  if (loading || !counts) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const primaryItems = statItems.filter((item) => item.primary);
  const secondaryItems = statItems.filter((item) => !item.primary);

  return (
    <div className="space-y-4">
      {/* Primary stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryItems.map((item) => (
          <Card key={item.key} className="animate-in fade-in duration-300">
            <CardContent className="flex items-center gap-3 pt-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold tabular-nums">
                  {counts[item.key].toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryItems.map((item) => (
          <Card key={item.key} className="animate-in fade-in duration-300">
            <CardContent className="flex items-center gap-3 pt-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold tabular-nums">
                  {counts[item.key].toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
