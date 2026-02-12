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

export interface WorkerStatus {
  workerName: string;
  displayName: string;
  overallStatus: "running" | "complete" | "error" | "idle";
  lastRunAt: string | null;
  totalProcessed: number;
  totalErrors: number;
  stages: WorkerStage[];
  errorLog: string[];
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
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchAllWorkerStatus(): Promise<WorkerStatus[]> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const [syncJobs, enrichmentJobs, spendJobs] = await Promise.all([
    db
      .collection("syncjobs")
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
  };

  return [dataSyncWorker, enrichmentWorker, spendIngestWorker];
}
