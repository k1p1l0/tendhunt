"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  ExternalLink,
  Bell,
  BellOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WatchlistItem {
  _id: string;
  supplierName: string;
  normalizedName: string;
  notifyEmail: boolean;
  createdAt: string;
  recentNotifications: number;
  latestNotification?: {
    type: string;
    title: string;
    createdAt: string;
  };
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function WatchlistSection() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.entries ?? []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleRemove = useCallback(
    async (supplierName: string, id: string) => {
      setRemovingId(id);
      try {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierName }),
        });
        if (res.ok) {
          setItems((prev) => prev.filter((item) => item._id !== id));
        }
      } catch {
        // silent
      } finally {
        setRemovingId(null);
      }
    },
    []
  );

  const handleToggleEmail = useCallback(
    async (supplierName: string, currentValue: boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.supplierName === supplierName
            ? { ...item, notifyEmail: !currentValue }
            : item
        )
      );
      try {
        await fetch("/api/watchlist", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName,
            notifyEmail: !currentValue,
          }),
        });
      } catch {
        setItems((prev) =>
          prev.map((item) =>
            item.supplierName === supplierName
              ? { ...item, notifyEmail: currentValue }
              : item
          )
        );
      }
    },
    []
  );

  // Don't show section if not loading and empty
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Watchlist
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                ({items.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/30 transition-colors group"
                  >
                    <Link
                      href={`/competitors/${encodeURIComponent(item.supplierName)}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {item.supplierName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {item.supplierName}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.recentNotifications > 0 ? (
                            <span className="text-primary font-medium">
                              {item.recentNotifications} new{" "}
                              {item.recentNotifications === 1 ? "alert" : "alerts"}
                            </span>
                          ) : (
                            <span>No recent activity</span>
                          )}
                          {item.latestNotification && (
                            <>
                              <span className="text-muted-foreground/40">
                                ·
                              </span>
                              <span className="truncate">
                                {formatTimeAgo(item.latestNotification.createdAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          handleToggleEmail(
                            item.supplierName,
                            item.notifyEmail
                          )
                        }
                        aria-label={
                          item.notifyEmail
                            ? "Disable email alerts"
                            : "Enable email alerts"
                        }
                      >
                        {item.notifyEmail ? (
                          <Bell className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-destructive"
                        onClick={() => handleRemove(item.supplierName, item._id)}
                        disabled={removingId === item._id}
                        aria-label="Remove from watchlist"
                      >
                        {removingId === item._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
