"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkerStatusCard } from "@/components/dashboard/worker-status-card";

import type { WorkerStatus } from "@/lib/workers";

const POLL_INTERVAL = 15_000;

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerStatus[] | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);

    try {
      const res = await fetch("/api/workers/status");

      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }

      setLastRefreshed(new Date());
    } catch (error) {
      console.error("[workers] Fetch error:", error);
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

  // Derive health banner state (includes HTTP health check)
  const allHealthy =
    workers?.length &&
    workers.every(
      (w) =>
        (w.overallStatus === "complete" || w.overallStatus === "idle" || w.overallStatus === "running") &&
        (w.health?.reachable !== false)
    );
  const hasErrors = workers?.some((w) => w.overallStatus === "error" || w.health?.reachable === false);
  const errorWorkerNames = workers
    ?.filter((w) => w.overallStatus === "error" || w.health?.reachable === false)
    .map((w) => {
      const issues: string[] = [];
      if (w.overallStatus === "error") issues.push("job errors");
      if (w.health?.reachable === false) issues.push("unreachable");
      return `${w.displayName} (${issues.join(", ")})`;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Worker Health</h1>
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

      {/* Health banner */}
      {!initialLoading && allHealthy && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-600">
            All Healthy -- All workers are operational
          </p>
        </div>
      )}

      {!initialLoading && hasErrors && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 animate-in fade-in duration-300">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-600">
            Attention Required -- {errorWorkerNames?.join(", ")}{" "}
            {errorWorkerNames?.length === 1 ? "has" : "have"} errors
          </p>
        </div>
      )}

      {/* Worker cards */}
      <div className="space-y-4">
        {initialLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xl border bg-muted"
              />
            ))
          : workers?.map((worker) => (
              <WorkerStatusCard
                key={worker.workerName}
                worker={worker}
                detailed
              />
            ))}
      </div>
    </div>
  );
}
