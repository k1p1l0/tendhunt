import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { processSyncJob } from "./sync-engine";
import { createFatFetchPage } from "./api-clients/fat-client";
import { createCfFetchPage } from "./api-clients/cf-client";

// ---------------------------------------------------------------------------
// Default backfill start dates (safe starting points for each source)
// ---------------------------------------------------------------------------

/** Find a Tender launched ~2021; safe backfill origin */
const FAT_BACKFILL_START = "2021-01-01T00:00:00Z";

/** Contracts Finder OCDS data available from late 2016 */
const CF_BACKFILL_START = "2016-11-01T00:00:00Z";

// ---------------------------------------------------------------------------
// Per-invocation item budgets
//
// Runs every 10 minutes. Budget ~1500 items per run (smaller batches).
// Split 60/40 so higher-value FaT tenders get priority.
// ---------------------------------------------------------------------------

/** ~60% of per-invocation budget */
const FAT_MAX_ITEMS = 900;

/** ~40% of per-invocation budget */
const CF_MAX_ITEMS = 600;

// ---------------------------------------------------------------------------
// Sync pipeline runner
// ---------------------------------------------------------------------------

async function runSync(env: Env) {
  const backfillStart = env.BACKFILL_START_DATE;
  const fatStart = backfillStart || FAT_BACKFILL_START;
  const cfStart = backfillStart || CF_BACKFILL_START;

  const db = await getDb(env.MONGODB_URI);

  try {
    console.log("--- Starting Find a Tender sync ---");
    const fatFetchPage = createFatFetchPage(fatStart);
    const fatResult = await processSyncJob(
      db,
      "FIND_A_TENDER",
      fatFetchPage,
      fatStart,
      FAT_MAX_ITEMS,
      env.ENRICHMENT_WORKER_URL
    );
    console.log(
      `FaT: fetched=${fatResult.fetched}, errors=${fatResult.errors}, done=${fatResult.done}`
    );

    console.log("--- Starting Contracts Finder sync ---");
    const cfFetchPage = createCfFetchPage(cfStart);
    const cfResult = await processSyncJob(
      db,
      "CONTRACTS_FINDER",
      cfFetchPage,
      cfStart,
      CF_MAX_ITEMS,
      env.ENRICHMENT_WORKER_URL
    );
    console.log(
      `CF: fetched=${cfResult.fetched}, errors=${cfResult.errors}, done=${cfResult.done}`
    );

    console.log(
      `--- Sync complete: FaT=${fatResult.fetched}+CF=${cfResult.fetched} items, ` +
        `${fatResult.errors + cfResult.errors} errors ---`
    );

    return { fat: fatResult, cf: cfResult };
  } finally {
    await closeDb();
  }
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "tendhunt-data-sync" });
    }

    if (url.pathname === "/debug") {
      const db = await getDb(env.MONGODB_URI);
      try {
        const syncJobs = await db.collection("syncJobs").find({}).toArray();
        const contractCount = await db.collection("contracts").estimatedDocumentCount();
        const buyerCount = await db.collection("buyers").estimatedDocumentCount();
        return Response.json({
          contractCount,
          buyerCount,
          syncJobs: syncJobs.map((j) => ({
            source: j.source,
            status: j.status,
            totalFetched: j.totalFetched,
            lastSyncedDate: j.lastSyncedDate,
            lastRunAt: j.lastRunAt,
            lastRunFetched: j.lastRunFetched,
            lastRunErrors: j.lastRunErrors,
            errorLog: (j.errorLog as string[])?.slice(-5),
          })),
        });
      } finally {
        await closeDb();
      }
    }

    if (url.pathname === "/run") {
      try {
        const result = await runSync(env);
        return Response.json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 500 });
      }
    }

    return new Response("tendhunt-data-sync worker", { status: 200 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    try {
      await runSync(env);
    } catch (err) {
      console.error("Sync failed:", err);
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;
