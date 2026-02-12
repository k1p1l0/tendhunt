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
// Total budget ~9 000 items per hourly cron (90 pages * 100 items).
// Split 60/40 so higher-value FaT tenders get priority.
// ---------------------------------------------------------------------------

/** ~60% of per-invocation budget (90 pages * 60%) */
const FAT_MAX_ITEMS = 5400;

/** ~40% of per-invocation budget (90 pages * 40%) */
const CF_MAX_ITEMS = 3600;

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    // Optional override for both sources (limits initial backfill depth)
    const backfillStart = env.BACKFILL_START_DATE;
    const fatStart = backfillStart || FAT_BACKFILL_START;
    const cfStart = backfillStart || CF_BACKFILL_START;

    const db = await getDb(env.MONGODB_URI);

    try {
      // Process Find a Tender (allocate ~60% of budget)
      console.log("--- Starting Find a Tender sync ---");
      const fatFetchPage = createFatFetchPage(fatStart);
      const fatResult = await processSyncJob(
        db,
        "FIND_A_TENDER",
        fatFetchPage,
        fatStart,
        FAT_MAX_ITEMS
      );
      console.log(
        `FaT: fetched=${fatResult.fetched}, errors=${fatResult.errors}, done=${fatResult.done}`
      );

      // Process Contracts Finder (allocate ~40% of budget)
      console.log("--- Starting Contracts Finder sync ---");
      const cfFetchPage = createCfFetchPage(cfStart);
      const cfResult = await processSyncJob(
        db,
        "CONTRACTS_FINDER",
        cfFetchPage,
        cfStart,
        CF_MAX_ITEMS
      );
      console.log(
        `CF: fetched=${cfResult.fetched}, errors=${cfResult.errors}, done=${cfResult.done}`
      );

      console.log(
        `--- Sync complete: FaT=${fatResult.fetched}+CF=${cfResult.fetched} items, ` +
          `${fatResult.errors + cfResult.errors} errors ---`
      );
    } catch (err) {
      console.error("Sync failed:", err);
      throw err; // Let Cloudflare log the error and trigger cron retry
    } finally {
      await closeDb();
    }
  },
} satisfies ExportedHandler<Env>;
