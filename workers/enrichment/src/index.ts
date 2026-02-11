import type { Env } from "./types";
import { getDb, closeDb } from "./db/client";
import { processEnrichmentPipeline } from "./enrichment-engine";

// ---------------------------------------------------------------------------
// Enrichment Worker entry point
//
// Runs daily at 2 AM UTC via cron trigger.
// Processes the enrichment pipeline in stages:
//   1. classify    — Fuzzy-match buyers to DataSource entries
//   2. governance  — Map democracy portal URLs (not yet implemented)
//   3. moderngov   — SOAP API calls for ModernGov councils (not yet implemented)
//   4. scrape      — HTML scraping for NHS trusts etc. (not yet implemented)
//   5. personnel   — Claude Haiku key personnel extraction (not yet implemented)
//   6. score       — Compute enrichment scores (not yet implemented)
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
        `Stage ${result.stage}: processed=${result.processed}, errors=${result.errors}, done=${result.done}`
      );
      console.log("--- Enrichment pipeline run complete ---");
    } catch (err) {
      console.error("Enrichment pipeline failed:", err);
      throw err; // Let Cloudflare log the error and trigger cron retry
    } finally {
      await closeDb();
    }
  },
} satisfies ExportedHandler<Env>;
