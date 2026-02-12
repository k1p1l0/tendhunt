"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Building2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import type { RecentItem } from "@/lib/stats";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const typeConfig: Record<
  RecentItem["type"],
  { icon: typeof FileText; label: string; className: string }
> = {
  contract: {
    icon: FileText,
    label: "Contract",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  buyer: {
    icon: Building2,
    label: "Buyer",
    className: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  },
  signal: {
    icon: Zap,
    label: "Signal",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RecentActivityProps {
  items: RecentItem[] | null;
  loading?: boolean;
}

export function RecentActivity({ items, loading }: RecentActivityProps) {
  if (loading || !items) {
    return <RecentActivitySkeleton />;
  }

  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
