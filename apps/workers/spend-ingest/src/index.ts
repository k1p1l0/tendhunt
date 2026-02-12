import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, SpendIngestStage, SpendJobDoc, StageFn } from "./types";
import { STAGE_ORDER } from "./types";
import { getDb, closeDb } from "./db/client";
import { processSpendPipeline } from "./spend-engine";
import { discoverTransparencyPages } from "./stages/01-discover";
import { extractCsvLinks } from "./stages/02-extract-links";
import { downloadAndParseCsvs } from "./stages/03-download-parse";
import { aggregateSpendData } from "./stages/04-aggregate";

// ---------------------------------------------------------------------------
// Spend Ingest Worker entry point
//
// Runs weekly via cron trigger (Mondays at 3 AM UTC).
// Processes the spend ingest pipeline in 4 sequential stages:
//   1. discover        — Find transparency/spending pages on buyer websites
//   2. extract_links   — Extract CSV/Excel download links from pages
//   3. download_parse  — Download and parse spend data files
//   4. aggregate       — Compute per-buyer spend summaries
// ---------------------------------------------------------------------------

async function runPipeline(env: Env, maxItems = 200) {
  const db = await getDb(env.MONGODB_URI);

  try {
    console.log("--- Starting spend ingest pipeline ---");
    const result = await processSpendPipeline(db, env, maxItems);
    console.log(
      `Spend ingest: stage=${result.stage}, processed=${result.processed}, errors=${result.errors}, done=${result.done}`
    );
    if (result.stage === "all_complete") {
      console.log("All spend ingest stages complete. Pipeline finished.");
    }
    console.log("--- Spend ingest pipeline run complete ---");
    return result;
  } finally {
    await closeDb();
  }
}

function requireSecret(url: URL, env: Env): Response | null {
  if (!env.WORKER_SECRET) return null;
  if (url.searchParams.get("secret") !== env.WORKER_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Single-buyer spend ingest: GET /run-buyer?id=<ObjectId>
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

        const results = await runSingleBuyerSpend(db, env, oid);

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
      const denied = requireSecret(url, env);
      if (denied) return denied;
      const max = parseInt(url.searchParams.get("max") ?? "200", 10);
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
      const denied = requireSecret(url, env);
      if (denied) return denied;
      const db = await getDb(env.MONGODB_URI);
      try {
        const totalBuyers = await db.collection("buyers").countDocuments();
        const transactions = await db.collection("spendtransactions").countDocuments();
        const summaries = await db.collection("spendsummaries").countDocuments();
        const jobs = await db.collection("spendingestjobs").find({}).toArray();
        const collections = await db.listCollections().toArray();
        return Response.json({
          totalBuyers,
          transactions,
          summaries,
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
      return Response.json({ status: "ok", worker: "tendhunt-spend-ingest" });
    }

    return new Response("tendhunt-spend-ingest worker", { status: 200 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    try {
      await runPipeline(env);
    } catch (err) {
      console.error("Spend ingest pipeline failed:", err);
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// Single-buyer spend ingest — runs all 4 stages for one buyer
// ---------------------------------------------------------------------------

const SINGLE_BUYER_STAGES: Record<SpendIngestStage, StageFn> = {
  discover: discoverTransparencyPages,
  extract_links: extractCsvLinks,
  download_parse: downloadAndParseCsvs,
  aggregate: aggregateSpendData,
};

async function runSingleBuyerSpend(
  db: Db,
  env: Env,
  _buyerId: ObjectId
): Promise<Record<string, { processed: number; errors: number }>> {
  const results: Record<string, { processed: number; errors: number }> = {};

  const now = new Date();
  const fakeJob: SpendJobDoc = {
    _id: new ObjectId(),
    stage: "discover",
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
      console.error(`Single-buyer spend stage ${stage} failed: ${msg}`);
      results[stage] = { processed: 0, errors: 1 };
    }
  }

  return results;
}
