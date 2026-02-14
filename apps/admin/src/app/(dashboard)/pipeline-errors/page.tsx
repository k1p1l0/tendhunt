"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PipelineError {
  _id: string;
  worker: string;
  stage: string;
  buyerId: string | null;
  buyerName: string | null;
  errorType: string;
  message: string;
  url: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
}

interface PipelineErrorsResponse {
  errors: PipelineError[];
  total: number;
  unresolvedCount: number;
  page: number;
  pageSize: number;
}

const WORKERS = ["enrichment", "spend-ingest", "board-minutes", "data-sync"];
const ERROR_TYPES = ["api_403", "timeout", "unreachable", "no_data", "parse_error", "rate_limit", "other"];
const PAGE_SIZE = 50;
const POLL_INTERVAL = 30_000;

const renderErrorTypeBadge = (errorType: string) => {
  const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
    api_403: "destructive",
    timeout: "destructive",
    unreachable: "destructive",
    no_data: "secondary",
    parse_error: "default",
    rate_limit: "destructive",
    other: "outline",
  };
  return (
    <Badge variant={variants[errorType] ?? "outline"}>
      {errorType}
    </Badge>
  );
};

export default function PipelineErrorsPage() {
  const [data, setData] = useState<PipelineErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState(false);

  // Filters
  const [workerFilter, setWorkerFilter] = useState("");
  const [errorTypeFilter, setErrorTypeFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("false");
  const [page, setPage] = useState(1);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (workerFilter) params.set("worker", workerFilter);
        if (errorTypeFilter) params.set("errorType", errorTypeFilter);
        params.set("resolved", resolvedFilter);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const res = await fetch(`/api/pipeline-errors?${params.toString()}`);
        if (res.ok) {
          const json = (await res.json()) as PipelineErrorsResponse;
          setData(json);
        }
        setLastRefreshed(new Date());
      } catch (err) {
        console.error("[pipeline-errors] Fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workerFilter, errorTypeFilter, resolvedFilter, page]
  );

  useEffect(() => {
    setLoading(true);
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

  const handleResolve = async (ids: string[]) => {
    setResolving(true);
    try {
      const res = await fetch("/api/pipeline-errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchData();
      }
    } catch (err) {
      console.error("[pipeline-errors] Resolve error:", err);
    } finally {
      setResolving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const unresolvedIds = data.errors
      .filter((e) => !e.resolvedAt)
      .map((e) => e._id);

    if (unresolvedIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unresolvedIds));
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pipeline Errors
            {data && data.unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-3 text-sm">
                {data.unresolvedCount} unresolved
              </Badge>
            )}
          </h1>
          {lastRefreshed && (
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-refreshes every 30s. Last{" "}
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

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Worker
              </label>
              <select
                value={workerFilter}
                onChange={(e) => {
                  setWorkerFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">All Workers</option>
                {WORKERS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Error Type
              </label>
              <select
                value={errorTypeFilter}
                onChange={(e) => {
                  setErrorTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">All Types</option>
                {ERROR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                value={resolvedFilter}
                onChange={(e) => {
                  setResolvedFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="false">Unresolved</option>
                <option value="true">Resolved</option>
                <option value="">All</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleResolve(Array.from(selectedIds))}
            disabled={resolving}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Resolve Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : data && data.errors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={
                        data.errors.filter((e) => !e.resolvedAt).length > 0 &&
                        data.errors
                          .filter((e) => !e.resolvedAt)
                          .every((e) => selectedIds.has(e._id))
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="max-w-[300px]">Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.errors.map((error) => (
                  <TableRow
                    key={error._id}
                    className={error.resolvedAt ? "opacity-50" : ""}
                  >
                    <TableCell>
                      {!error.resolvedAt && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(error._id)}
                          onChange={() => toggleSelect(error._id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {error.buyerName ?? "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{error.worker}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {error.stage}
                    </TableCell>
                    <TableCell>{renderErrorTypeBadge(error.errorType)}</TableCell>
                    <TableCell
                      className="max-w-[300px] truncate text-muted-foreground"
                      title={error.message}
                    >
                      {error.message}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {error.createdAt
                        ? formatDistanceToNow(new Date(error.createdAt), {
                            addSuffix: true,
                          })
                        : "--"}
                    </TableCell>
                    <TableCell>
                      {error.resolvedAt ? (
                        <Badge variant="secondary">Resolved</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve([error._id])}
                          disabled={resolving}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="mb-3 h-8 w-8" />
              <p className="text-sm">No pipeline errors found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}--
            {Math.min(page * PAGE_SIZE, data?.total ?? 0)} of{" "}
            {data?.total ?? 0}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
