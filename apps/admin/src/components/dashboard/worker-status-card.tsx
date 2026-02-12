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

import type { WorkerStatus, WorkerStage } from "@/lib/workers";

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
          <StatusBadge status={worker.overallStatus} />
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
      </CardContent>
    </Card>
  );
}
