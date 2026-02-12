"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-tables/data-table";
import { signalColumns } from "@/components/data-tables/columns";

import type { RecentSignal } from "@/lib/data";

const POLL_INTERVAL = 30_000;

export default function SignalsPage() {
  const [data, setData] = useState<RecentSignal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/data/signals");
      if (res.ok) {
        const json = await res.json();
        setData(json.items);
        setTotal(json.total);
      }
    } catch {
      // Silently fail on poll errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData(true);
    }

    const interval = setInterval(() => fetchData(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Recent Signals
          </h1>
          {!loading && (
            <Badge variant="secondary" className="tabular-nums">
              {total.toLocaleString()} total
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(false)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <DataTable columns={signalColumns} data={data} loading={loading} />
    </div>
  );
}
