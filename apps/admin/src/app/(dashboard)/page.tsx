"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { WorkerStatusCard } from "@/components/dashboard/worker-status-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";

import type { WorkerStatus } from "@/lib/workers";
import type { PlatformStats } from "@/lib/stats";

const POLL_INTERVAL = 15_000;

export default function OverviewPage() {
  const [workers, setWorkers] = useState<WorkerStatus[] | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);

    try {
      const [workersRes, statsRes] = await Promise.all([
        fetch("/api/workers/status"),
        fetch("/api/stats"),
      ]);

      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      setLastRefreshed(new Date());
    } catch (error) {
      console.error("[overview] Fetch error:", error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchData(true);
    intervalRef.current = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Overview
          </h1>
          {lastRefreshed && (
            <p className="mt-1 text-sm text-muted-foreground">
              Last refreshed{" "}
              {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <StatsCards counts={stats?.counts ?? null} loading={initialLoading} />

      {/* Worker status cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Worker Health</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {initialLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl border bg-muted"
                />
              ))
            : workers?.map((worker) => (
                <WorkerStatusCard key={worker.workerName} worker={worker} />
              ))}
        </div>
      </div>

      {/* Recent activity */}
      <RecentActivity
        items={stats?.recentItems ?? null}
        loading={initialLoading}
      />
    </div>
  );
}
