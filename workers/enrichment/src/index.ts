import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { processEnrichmentPipeline } from "./enrichment-engine";

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
      console.log("All enrichment stages complete. Pipeline finished.");
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
