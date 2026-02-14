import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Worker budget settings — stored in `adminsettings` collection
// ---------------------------------------------------------------------------

export interface WorkerBudgetConfig {
  enabled: boolean;
  limit: number;
}

export interface WorkerBudgets {
  enrichment: WorkerBudgetConfig;
  "data-sync": WorkerBudgetConfig;
  "spend-ingest": WorkerBudgetConfig;
  "board-minutes": WorkerBudgetConfig;
}

export interface AdminSettings {
  workerBudgets: WorkerBudgets;
}

const DEFAULT_BUDGETS: WorkerBudgets = {
  enrichment: { enabled: true, limit: 500 },
  "data-sync": { enabled: true, limit: 9000 },
  "spend-ingest": { enabled: true, limit: 200 },
  "board-minutes": { enabled: true, limit: 100 },
};

const SETTINGS_KEY = "worker_budgets";

export async function getWorkerBudgets(): Promise<WorkerBudgets> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const doc = await db.collection("adminsettings").findOne({ key: SETTINGS_KEY });
  if (!doc) return DEFAULT_BUDGETS;

  return {
    enrichment: doc.enrichment ?? DEFAULT_BUDGETS.enrichment,
    "data-sync": doc["data-sync"] ?? DEFAULT_BUDGETS["data-sync"],
    "spend-ingest": doc["spend-ingest"] ?? DEFAULT_BUDGETS["spend-ingest"],
    "board-minutes": doc["board-minutes"] ?? DEFAULT_BUDGETS["board-minutes"],
  };
}

export async function updateWorkerBudgets(
  updates: Partial<WorkerBudgets>
): Promise<WorkerBudgets> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  for (const [worker, config] of Object.entries(updates)) {
    if (config && typeof config.enabled === "boolean" && typeof config.limit === "number") {
      setFields[worker] = { enabled: config.enabled, limit: config.limit };
    }
  }

  await db.collection("adminsettings").updateOne(
    { key: SETTINGS_KEY },
    { $set: setFields, $setOnInsert: { key: SETTINGS_KEY, createdAt: new Date() } },
    { upsert: true }
  );

  return getWorkerBudgets();
}

export function getBudgetMaxItems(
  budgets: WorkerBudgets,
  workerName: string
): number | null {
  const config = budgets[workerName as keyof WorkerBudgets];
  if (!config) return null;
  return config.enabled ? config.limit : null;
}
