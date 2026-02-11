import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { processEnrichmentPipeline } from "./enrichment-engine";

// ---------------------------------------------------------------------------
// Enrichment Worker entry point
//
// Runs daily at 2 AM UTC via cron trigger.
// Processes the enrichment pipeline in 6 sequential stages:
//   1. classify         — Fuzzy-match buyers to DataSource entries
//   2. governance_urls  — Map democracy portal URLs from DataSource
//   3. moderngov        — SOAP API calls for ModernGov councils
//   4. scrape           — HTML scraping for NHS trusts, ICBs, etc.
//   5. personnel        — Claude Haiku key personnel extraction
//   6. score            — Compute enrichment scores (0-100)
// ---------------------------------------------------------------------------

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const db = await getDb(env.MONGODB_URI);

    try {
      console.log("--- Starting enrichment pipeline ---");
      const result = await processEnrichmentPipeline(db, env, 500);
      console.log(
        `Enrichment: stage=${result.stage}, processed=${result.processed}, errors=${result.errors}, done=${result.done}`
      );
      if (result.stage === "all_complete") {
        console.log("All enrichment stages complete. Pipeline finished.");
      }
      console.log("--- Enrichment pipeline run complete ---");
    } catch (err) {
      console.error("Enrichment pipeline failed:", err);
      throw err; // Let Cloudflare log the error and trigger cron retry
    } finally {
      await closeDb();
    }
  },
} satisfies ExportedHandler<Env>;
