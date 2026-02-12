import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { processSpendPipeline } from "./spend-engine";

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manual trigger: GET /run or /run?max=100
    if (url.pathname === "/run") {
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
