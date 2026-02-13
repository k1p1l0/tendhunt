import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, SignalIngestStage, SignalJobDoc, StageFn } from "./types";
import { STAGE_ORDER } from "./types";
import { getDb, closeDb } from "./db/client";
import { processSignalPipeline } from "./signal-engine";
import { extractSignals } from "./stages/01-extract-signals";
import { deduplicateSignals } from "./stages/02-deduplicate";

// ---------------------------------------------------------------------------
// Board Minutes Signal Worker entry point
//
// Runs hourly via cron trigger (at :30, offset from enrichment).
// Processes the signal extraction pipeline in 2 sequential stages:
//   1. extract_signals  -- Claude Haiku extracts buying signals from board docs
//   2. deduplicate      -- Remove duplicate signals across documents
// ---------------------------------------------------------------------------

async function runPipeline(env: Env, maxItems = 100) {
  const db = await getDb(env.MONGODB_URI);

  try {
    console.log("--- Starting board-minutes signal pipeline ---");
    const result = await processSignalPipeline(db, env, maxItems);
    console.log(
      `Signal ingest: stage=${result.stage}, processed=${result.processed}, errors=${result.errors}, done=${result.done}`
    );
    if (result.stage === "all_complete") {
      console.log("All signal ingest stages complete. Pipeline finished.");
    }
    console.log("--- Board-minutes signal pipeline run complete ---");
    return result;
  } finally {
    await closeDb();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Single-buyer signal extraction: GET /run-buyer?id=<ObjectId>
    if (url.pathname === "/run-buyer") {
      const buyerId = url.searchParams.get("id");
      if (!buyerId) {
        return Response.json({ error: "Missing ?id= parameter" }, { status: 400 });
      }

      let oid: ObjectId;
      try {
        oid = new ObjectId(buyerId);
      } catch {
        return Response.json({ error: "Invalid ObjectId" }, { status: 400 });
      }

      const db = await getDb(env.MONGODB_URI);
      try {
        const buyer = await db.collection("buyers").findOne({ _id: oid });
        if (!buyer) {
          return Response.json({ error: "Buyer not found" }, { status: 404 });
        }

        // Temporarily boost priority so this buyer is picked up first
        await db.collection("buyers").updateOne(
          { _id: oid },
          { $set: { enrichmentPriority: 10, updatedAt: new Date() } }
        );

        const results = await runSingleBuyerSignals(db, env, oid);

        // Reset priority
        const tierPriority = buyer.dataSourceId ? 1 : 0;
        await db.collection("buyers").updateOne(
          { _id: oid },
          { $set: { enrichmentPriority: tierPriority, updatedAt: new Date() } }
        );

        return Response.json({ buyerId, buyerName: buyer.name, stages: results });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 500 });
      } finally {
        await closeDb();
      }
    }

    // Manual trigger: GET /run or /run?max=100
    if (url.pathname === "/run") {
      const max = parseInt(url.searchParams.get("max") ?? "100", 10);
      try {
        const result = await runPipeline(env, max);
        return Response.json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 500 });
      }
    }

    // Debug: collection stats
    if (url.pathname === "/debug") {
      const db = await getDb(env.MONGODB_URI);
      try {
        const totalBuyers = await db.collection("buyers").countDocuments();
        const signals = await db.collection("signals").countDocuments();
        const boardDocs = await db.collection("boarddocuments").countDocuments();
        const jobs = await db.collection("signalingestjobs").find({}).toArray();
        const collections = await db.listCollections().toArray();
        return Response.json({
          totalBuyers,
          signals,
          boardDocs,
          dbName: db.databaseName,
          collections: collections.map((c) => c.name),
          jobs: jobs.map((j) => ({
            stage: j.stage,
            status: j.status,
            processed: j.totalProcessed,
            cursor: j.cursor,
          })),
        });
      } finally {
        await closeDb();
      }
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "tendhunt-board-minutes" });
    }

    return new Response("tendhunt-board-minutes worker", { status: 200 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    try {
      await runPipeline(env);
    } catch (err) {
      console.error("Board-minutes signal pipeline failed:", err);
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// Single-buyer signal extraction -- runs all stages for one buyer
// ---------------------------------------------------------------------------

const SINGLE_BUYER_STAGES: Record<SignalIngestStage, StageFn> = {
  extract_signals: extractSignals,
  deduplicate: deduplicateSignals,
};

async function runSingleBuyerSignals(
  db: Db,
  env: Env,
  _buyerId: ObjectId
): Promise<Record<string, { processed: number; errors: number }>> {
  const results: Record<string, { processed: number; errors: number }> = {};

  const now = new Date();
  const fakeJob: SignalJobDoc = {
    _id: new ObjectId(),
    stage: "extract_signals",
    status: "running",
    cursor: null,
    batchSize: 1,
    totalProcessed: 0,
    totalErrors: 0,
    errorLog: [],
    startedAt: now,
    lastRunAt: now,
    updatedAt: now,
  };

  for (const stage of STAGE_ORDER) {
    try {
      const stageJob = { ...fakeJob, stage, cursor: null };
      const result = await SINGLE_BUYER_STAGES[stage](db, env, stageJob, 1);
      results[stage] = { processed: result.processed, errors: result.errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Single-buyer signal stage ${stage} failed: ${msg}`);
      results[stage] = { processed: 0, errors: 1 };
    }
  }

  return results;
}
