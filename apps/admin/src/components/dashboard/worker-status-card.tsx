"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Bug,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { WorkerStatus, WorkerStage, WorkerHealthCheck } from "@/lib/workers";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  running: {
    label: "Running",
    variant: "default",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 animate-pulse",
  },
  backfilling: {
    label: "Backfilling",
    variant: "default",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 animate-pulse",
  },
  syncing: {
    label: "Syncing",
    variant: "default",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 animate-pulse",
  },
  complete: {
    label: "Complete",
    variant: "default",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  error: {
    label: "Error",
    variant: "destructive",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  paused: {
    label: "Paused",
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
  },
  idle: {
    label: "Idle",
    variant: "outline",
    className: "bg-muted text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.idle;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-yellow-500",
    backfilling: "bg-yellow-500",
    syncing: "bg-yellow-500",
    complete: "bg-green-500",
    error: "bg-red-500",
    paused: "bg-muted-foreground",
  };

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-muted-foreground"}`}
    />
  );
}

// ---------------------------------------------------------------------------
// HTTP health indicator
// ---------------------------------------------------------------------------

function HealthIndicator({ health }: { health?: WorkerHealthCheck }) {
  if (!health) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          health.reachable ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className={health.reachable ? "text-green-600" : "text-red-500"}>
        {health.reachable ? `${health.latencyMs}ms` : health.error ?? "Unreachable"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage row
// ---------------------------------------------------------------------------

function StageRow({ stage }: { stage: WorkerStage }) {
  const formattedName = stage.name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <StatusDot status={stage.status} />
        <span className="text-foreground">{formattedName}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{stage.processed.toLocaleString()} processed</span>
        {stage.errors > 0 && (
          <span className="text-red-500">{stage.errors} errors</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface WorkerStatusCardProps {
  worker: WorkerStatus;
  detailed?: boolean;
}

export function WorkerStatusCard({
  worker,
  detailed = false,
}: WorkerStatusCardProps) {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [debugData, setDebugData] = useState<unknown>(null);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function handleRun() {
    setRunLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/workers/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerName: worker.workerName }),
      });
      const data = await res.json();
      setActionMessage(data.ok ? "Run triggered successfully" : `Error: ${data.error ?? "Unknown"}`);
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunLoading(false);
    }
  }

  async function handleDebug() {
    if (debugExpanded) { setDebugExpanded(false); return; }
    try {
      const res = await fetch(`/api/workers/debug?worker=${worker.workerName}`);
      const result = await res.json();
      setDebugData(result.data ?? result);
      setDebugExpanded(true);
    } catch {
      setDebugData({ error: "Failed to fetch debug info" });
      setDebugExpanded(true);
    }
  }

  const overallIcon =
    worker.overallStatus === "complete" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : worker.overallStatus === "error" ? (
      <AlertCircle className="h-4 w-4 text-red-500" />
    ) : worker.overallStatus === "running" ? (
      <Activity className="h-4 w-4 text-yellow-500" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overallIcon}
            <CardTitle className="text-base">{worker.displayName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <HealthIndicator health={worker.health} />
            <StatusBadge status={worker.overallStatus} />
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-xs">
          <span>
            {worker.lastRunAt
              ? `Last run ${formatDistanceToNow(new Date(worker.lastRunAt), { addSuffix: true })}`
              : "Never run"}
          </span>
          <span>{worker.totalProcessed.toLocaleString()} total processed</span>
          {worker.totalErrors > 0 && (
            <span className="text-red-500">
              {worker.totalErrors.toLocaleString()} errors
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stage breakdown */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {worker.workerName === "data-sync" ? "Sources" : "Stages"}
          </p>

          {worker.stages.length > 0 ? (
            <div className="space-y-0.5">
              {worker.stages.map((stage) => (
                <StageRow key={stage.name} stage={stage} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No stage data available</p>
          )}
        </div>

        {/* Detailed view: stage last run times */}
        {detailed && worker.stages.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stage Timing
              </p>
              <div className="space-y-1">
                {worker.stages.map((stage) => {
                  const formattedName = stage.name
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                  return (
                    <div
                      key={stage.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{formattedName}</span>
                      <span className="text-foreground">
                        {stage.lastRunAt
                          ? formatDistanceToNow(new Date(stage.lastRunAt), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Error log (collapsible) */}
        {detailed && worker.errorLog.length > 0 && (
          <>
            <Separator />
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-0 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-transparent"
                onClick={() => setErrorsExpanded(!errorsExpanded)}
              >
                <span>Recent Errors ({worker.errorLog.length})</span>
                {errorsExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>

              {errorsExpanded && (
                <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  {worker.errorLog.map((err, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-red-500/5 border border-red-500/10 px-3 py-2 text-xs text-red-600 font-mono break-all"
                    >
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {/* Action buttons + debug panel (detailed view only) */}
        {detailed && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRun}
                disabled={runLoading}
              >
                {runLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Run Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDebug}
              >
                <Bug className="h-3 w-3" />
                {debugExpanded ? "Hide Debug" : "Debug"}
              </Button>
              {actionMessage && (
                <span className={`text-xs ${actionMessage.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                  {actionMessage}
                </span>
              )}
            </div>

            {debugExpanded && debugData && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs font-mono animate-in slide-in-from-top-2 duration-200">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
