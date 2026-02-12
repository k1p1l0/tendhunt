import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

import type { Collection, Document, WithId } from "mongodb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncJobDoc {
  source: string;
  status: string;
  totalFetched: number;
  lastRunAt: Date | null;
  lastRunFetched: number;
  lastRunErrors: number;
  errorLog: string[];
}

interface EnrichmentJobDoc {
  stage: string;
  status: string;
  totalProcessed: number;
  totalErrors: number;
  lastRunAt: Date | null;
  errorLog: string[];
}

interface SpendJobDoc {
  stage: string;
  status: string;
  totalProcessed: number;
  totalErrors: number;
  lastRunAt: Date | null;
  errorLog: string[];
}

export interface WorkerStage {
  name: string;
  status: string;
  processed: number;
  errors: number;
  lastRunAt: string | null;
}

export interface WorkerHealthCheck {
  reachable: boolean;
  latencyMs: number;
  url: string;
  error?: string;
}

export interface WorkerStatus {
  workerName: string;
  displayName: string;
  overallStatus: "running" | "complete" | "error" | "idle";
  lastRunAt: string | null;
  totalProcessed: number;
  totalErrors: number;
  stages: WorkerStage[];
  errorLog: string[];
  health?: WorkerHealthCheck;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveOverallStatus(
  statuses: string[]
): "running" | "complete" | "error" | "idle" {
  if (statuses.length === 0) return "idle";
  if (statuses.some((s) => s === "running" || s === "backfilling" || s === "syncing"))
    return "running";
  if (statuses.some((s) => s === "error")) return "error";
  if (statuses.every((s) => s === "complete")) return "complete";
  return "idle";
}

function latestDate(dates: (Date | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is Date => d instanceof Date);
  if (valid.length === 0) return null;
  return valid
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString();
}

function collectErrors(docs: { errorLog?: string[] }[], limit = 5): string[] {
  const all: string[] = [];
  for (const doc of docs) {
    if (doc.errorLog) all.push(...doc.errorLog);
  }
  return all.slice(-limit);
}

// ---------------------------------------------------------------------------
// Worker HTTP health checks
// ---------------------------------------------------------------------------

const WORKER_URLS: Record<string, string> = {
  "data-sync": process.env.DATA_SYNC_WORKER_URL ?? "https://tendhunt-data-sync.kozak-74d.workers.dev",
  "enrichment": process.env.ENRICHMENT_WORKER_URL ?? "https://tendhunt-enrichment.kozak-74d.workers.dev",
  "spend-ingest": process.env.SPEND_INGEST_WORKER_URL ?? "https://tendhunt-spend-ingest.kozak-74d.workers.dev",
};

async function checkWorkerHealth(workerName: string): Promise<WorkerHealthCheck> {
  const url = WORKER_URLS[workerName];
  if (!url) return { reachable: false, latencyMs: 0, url: "", error: "No URL configured" };

  const healthUrl = `${url}/health`;
  const start = Date.now();
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { reachable: false, latencyMs, url: healthUrl, error: `HTTP ${res.status}` };
    return { reachable: true, latencyMs, url: healthUrl };
  } catch (err) {
    return {
      reachable: false,
      latencyMs: Date.now() - start,
      url: healthUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchAllWorkerStatus(): Promise<WorkerStatus[]> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const [syncJobs, enrichmentJobs, spendJobs, dataSyncHealth, enrichmentHealth, spendHealth] = await Promise.all([
    db
      .collection("syncJobs")
      .find({})
      .project<SyncJobDoc>({
        source: 1,
        status: 1,
        totalFetched: 1,
        lastRunAt: 1,
        lastRunFetched: 1,
        lastRunErrors: 1,
        errorLog: { $slice: -5 },
      })
      .toArray(),
    db
      .collection("enrichmentjobs")
      .find({})
      .project<EnrichmentJobDoc>({
        stage: 1,
        status: 1,
        totalProcessed: 1,
        totalErrors: 1,
        lastRunAt: 1,
        errorLog: { $slice: -5 },
      })
      .toArray(),
    db
      .collection("spendingestjobs")
      .find({})
      .project<SpendJobDoc>({
        stage: 1,
        status: 1,
        totalProcessed: 1,
        totalErrors: 1,
        lastRunAt: 1,
        errorLog: { $slice: -5 },
      })
      .toArray(),
    checkWorkerHealth("data-sync"),
    checkWorkerHealth("enrichment"),
    checkWorkerHealth("spend-ingest"),
  ]);

  const dataSyncWorker: WorkerStatus = {
    workerName: "data-sync",
    displayName: "Data Sync",
    overallStatus: deriveOverallStatus(syncJobs.map((j) => j.status)),
    lastRunAt: latestDate(syncJobs.map((j) => j.lastRunAt)),
    totalProcessed: syncJobs.reduce((sum, j) => sum + (j.totalFetched || 0), 0),
    totalErrors: syncJobs.reduce((sum, j) => sum + (j.lastRunErrors || 0), 0),
    stages: syncJobs.map((j) => ({
      name: j.source,
      status: j.status,
      processed: j.totalFetched || 0,
      errors: j.lastRunErrors || 0,
      lastRunAt: j.lastRunAt ? new Date(j.lastRunAt).toISOString() : null,
    })),
    errorLog: collectErrors(syncJobs),
    health: dataSyncHealth,
  };

  const enrichmentWorker: WorkerStatus = {
    workerName: "enrichment",
    displayName: "Enrichment",
    overallStatus: deriveOverallStatus(enrichmentJobs.map((j) => j.status)),
    lastRunAt: latestDate(enrichmentJobs.map((j) => j.lastRunAt)),
    totalProcessed: enrichmentJobs.reduce(
      (sum, j) => sum + (j.totalProcessed || 0),
      0
    ),
    totalErrors: enrichmentJobs.reduce(
      (sum, j) => sum + (j.totalErrors || 0),
      0
    ),
    stages: enrichmentJobs.map((j) => ({
      name: j.stage,
      status: j.status,
      processed: j.totalProcessed || 0,
      errors: j.totalErrors || 0,
      lastRunAt: j.lastRunAt ? new Date(j.lastRunAt).toISOString() : null,
    })),
    errorLog: collectErrors(enrichmentJobs),
    health: enrichmentHealth,
  };

  const spendIngestWorker: WorkerStatus = {
    workerName: "spend-ingest",
    displayName: "Spend Ingest",
    overallStatus: deriveOverallStatus(spendJobs.map((j) => j.status)),
    lastRunAt: latestDate(spendJobs.map((j) => j.lastRunAt)),
    totalProcessed: spendJobs.reduce(
      (sum, j) => sum + (j.totalProcessed || 0),
      0
    ),
    totalErrors: spendJobs.reduce((sum, j) => sum + (j.totalErrors || 0), 0),
    stages: spendJobs.map((j) => ({
      name: j.stage,
      status: j.status,
      processed: j.totalProcessed || 0,
      errors: j.totalErrors || 0,
      lastRunAt: j.lastRunAt ? new Date(j.lastRunAt).toISOString() : null,
    })),
    errorLog: collectErrors(spendJobs),
    health: spendHealth,
  };

  return [dataSyncWorker, enrichmentWorker, spendIngestWorker];
}
