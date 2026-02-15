"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Swords, MapPin, Tag, ExternalLink, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeedNotification {
  _id: string;
  type: "NEW_CONTRACT" | "NEW_REGION" | "NEW_SECTOR";
  title: string;
  body: string;
  entityLink?: string;
  supplierName?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Swords> = {
  NEW_CONTRACT: Swords,
  NEW_REGION: MapPin,
  NEW_SECTOR: Tag,
};

const TYPE_LABELS: Record<string, string> = {
  NEW_CONTRACT: "New contract",
  NEW_REGION: "New region",
  NEW_SECTOR: "New sector",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  NEW_CONTRACT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  NEW_REGION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  NEW_SECTOR: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function CompetitorFeed() {
  const [items, setItems] = useState<FeedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setHasMore((data.total ?? 0) > 8);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Don't render the card if user has zero notifications
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Competitor Activity
          </CardTitle>
          {items.length > 0 && (
            <Link href="/competitors" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-md bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {items.map((item, index) => {
                const Icon = TYPE_ICONS[item.type] ?? Swords;
                const badgeColor = TYPE_BADGE_COLORS[item.type] ?? "";

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                  >
                    <Link
                      href={
                        item.entityLink ??
                        (item.supplierName
                          ? `/competitors/${encodeURIComponent(item.supplierName)}`
                          : "#")
                      }
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/50 transition-colors group"
                    >
                      <div
                        className={`shrink-0 mt-0.5 rounded-md p-1.5 ${badgeColor} border`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm leading-snug ${
                              !item.read ? "font-medium" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badgeColor} border`}>
                            {TYPE_LABELS[item.type] ?? item.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hasMore && (
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/competitors">View all activity</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
