import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, EnrichmentStage, EnrichmentJobDoc, StageFn } from "./types";
import { STAGE_ORDER } from "./types";
import { getDb, closeDb } from "./db/client";
import { processEnrichmentPipeline } from "./enrichment-engine";
import { classifyBuyers } from "./stages/01-classify";
import { discoverWebsites } from "./stages/01b-website-discovery";
import { enrichLogoLinkedin } from "./stages/01c-logo-linkedin";
import { mapGovernanceUrls } from "./stages/02-governance-urls";
import { fetchModernGovData } from "./stages/03-moderngov";
import { scrapeGovernancePages } from "./stages/04-scrape";
import { extractKeyPersonnel } from "./stages/05-personnel";
import { computeEnrichmentScores } from "./stages/06-score";

// ---------------------------------------------------------------------------
// Enrichment Worker entry point
//
// Runs hourly via cron trigger.
// Processes the enrichment pipeline in 8 sequential stages:
//   1. classify            — Fuzzy-match buyers to DataSource entries
//   2. website_discovery   — Google Search via Apify to find missing websites
//   3. logo_linkedin       — logo.dev CDN + LinkedIn company search + og:image
//   4. governance_urls     — Map democracy portal URLs from DataSource
//   5. moderngov           — SOAP API calls for ModernGov councils
//   6. scrape              — HTML scraping for NHS trusts, ICBs, etc.
//   7. personnel           — Claude Haiku key personnel extraction
//   8. score               — Compute enrichment scores (0-100)
// ---------------------------------------------------------------------------

async function runPipeline(env: Env, maxItems = 500) {
  const db = await getDb(env.MONGODB_URI);

  try {
    console.log("--- Starting enrichment pipeline ---");
    const result = await processEnrichmentPipeline(db, env, maxItems);
    console.log(
      `Enrichment: stage=${result.stage}, processed=${result.processed}, errors=${result.errors}, done=${result.done}`
    );
    if (result.stage === "all_complete") {
      console.log("All enrichment stages complete. Triggering spend ingest...");
      try {
        const spendRes = await fetch(`${env.SPEND_INGEST_WORKER_URL}/run`);
        const spendResult = await spendRes.json();
        console.log("Spend ingest result:", JSON.stringify(spendResult));
      } catch (err) {
        console.error("Spend ingest trigger failed:", err);
      }

      try {
        const bmRes = await fetch(`${env.BOARD_MINUTES_WORKER_URL}/run`);
        const bmResult = await bmRes.json();
        console.log("Board-minutes signal extraction result:", JSON.stringify(bmResult));
      } catch (err) {
        console.error("Board-minutes trigger failed:", err);
      }
    }
    console.log("--- Enrichment pipeline run complete ---");
    return result;
  } finally {
    await closeDb();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Single-buyer enrichment: GET /run-buyer?id=<ObjectId>
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

        // Mark as manually triggered (highest priority)
        await db.collection("buyers").updateOne(
          { _id: oid },
          { $set: { enrichmentPriority: 10, updatedAt: new Date() } }
        );

        const results = await runSingleBuyerEnrichment(db, env, oid);

        // Reset priority back to tier-based value after processing
        const updated = await db.collection("buyers").findOne({ _id: oid });
        const tierPriority = updated?.dataSourceId ? 1 : 0;
        await db.collection("buyers").updateOne(
          { _id: oid },
          { $set: { enrichmentPriority: tierPriority, updatedAt: new Date() } }
        );

        let spendResults = {};
        try {
          const spendRes = await fetch(`${env.SPEND_INGEST_WORKER_URL}/run-buyer?id=${buyerId}`);
          spendResults = await spendRes.json();
        } catch (err) {
          spendResults = { error: err instanceof Error ? err.message : String(err) };
        }

        let boardMinutesResults = {};
        try {
          const bmRes = await fetch(`${env.BOARD_MINUTES_WORKER_URL}/run-buyer?id=${buyerId}`);
          boardMinutesResults = await bmRes.json();
        } catch (err) {
          boardMinutesResults = { error: err instanceof Error ? err.message : String(err) };
        }

        return Response.json({
          buyerId,
          buyerName: buyer.name,
          enrichment: results,
          spend: spendResults,
          boardMinutes: boardMinutesResults,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 500 });
      } finally {
        await closeDb();
      }
    }

    // Manual trigger: GET /run or /run?max=100
    if (url.pathname === "/run") {
      const max = parseInt(url.searchParams.get("max") ?? "500", 10);
      try {
        const result = await runPipeline(env, max);
        return Response.json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return Response.json({ error: msg }, { status: 500 });
      }
    }

    // Debug: test filtered buyer query
    if (url.pathname === "/debug") {
      const db = await getDb(env.MONGODB_URI);
      try {
        const total = await db.collection("buyers").countDocuments();
        const noWebsite = await db.collection("buyers").countDocuments({
          orgType: { $ne: null },
          $or: [{ website: null }, { website: { $exists: false } }],
        });
        const noLogo = await db.collection("buyers").countDocuments({
          $or: [{ logoUrl: null }, { logoUrl: { $exists: false } }],
        });
        const jobs = await db.collection("enrichmentjobs").find({}).toArray();
        const collections = await db.listCollections().toArray();
        return Response.json({
          total,
          noWebsite,
          noLogo,
          dbName: db.databaseName,
          uriHost: env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@").split("?")[0],
          collections: collections.map((c) => c.name),
          hasApify: Boolean(env.APIFY_API_TOKEN),
          hasLogoDev: Boolean(env.LOGO_DEV_TOKEN),
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
      return Response.json({ status: "ok", worker: "tendhunt-enrichment" });
    }

    return new Response("tendhunt-enrichment worker", { status: 200 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    try {
      await runPipeline(env);
    } catch (err) {
      console.error("Enrichment pipeline failed:", err);
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// Single-buyer enrichment — runs all 8 stages for one buyer
// ---------------------------------------------------------------------------

const SINGLE_BUYER_STAGES: Record<EnrichmentStage, StageFn> = {
  classify: classifyBuyers,
  website_discovery: discoverWebsites,
  logo_linkedin: enrichLogoLinkedin,
  governance_urls: mapGovernanceUrls,
  moderngov: fetchModernGovData,
  scrape: scrapeGovernancePages,
  personnel: extractKeyPersonnel,
  score: computeEnrichmentScores,
};

async function runSingleBuyerEnrichment(
  db: Db,
  env: Env,
  _buyerId: ObjectId
): Promise<Record<string, { processed: number; errors: number; skipped?: boolean }>> {
  const results: Record<string, { processed: number; errors: number; skipped?: boolean }> = {};

  // Create a synthetic job that starts from the very beginning (cursor: null)
  // with batchSize: 1. Since this buyer has enrichmentPriority: 10, it will
  // be the first result in priority-sorted queries.
  const now = new Date();
  const fakeJob: EnrichmentJobDoc = {
    _id: new ObjectId(),
    stage: "classify",
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
      console.error(`Single-buyer stage ${stage} failed: ${msg}`);
      results[stage] = { processed: 0, errors: 1 };
    }
  }

  return results;
}
