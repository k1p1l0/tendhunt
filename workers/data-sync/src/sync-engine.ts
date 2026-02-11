import type { Db } from "mongodb";
import type { OcdsRelease, SyncJob } from "./types";
import { mapOcdsToContract } from "./mappers/ocds-mapper";
import { upsertContracts } from "./db/contracts";
import { autoExtractBuyers } from "./db/buyers";
import {
  getOrCreateSyncJob,
  updateSyncProgress,
  markSyncComplete,
  markSyncError,
} from "./db/sync-jobs";

// ---------------------------------------------------------------------------
// Types for dependency injection (API clients implement these)
// ---------------------------------------------------------------------------

/**
 * Result from fetching a single page of OCDS releases.
 */
export interface FetchPageResult {
  releases: OcdsRelease[];
  nextCursor: string | null; // null means no more pages
}

/**
 * Function signature that API clients must implement.
 * The sync engine calls this to fetch pages -- it is agnostic of API specifics.
 */
export type FetchPageFn = (params: {
  cursor: string | null;
  dateFrom?: string;
}) => Promise<FetchPageResult>;

// ---------------------------------------------------------------------------
// Core sync engine
// ---------------------------------------------------------------------------

/**
 * Process a sync job for a single data source.
 *
 * Handles two modes:
 * - Backfilling: cursor-based pagination through all historical data
 * - Syncing: date-filtered fetch for new/updated records since last sync
 *
 * Progress is saved to MongoDB after EVERY page for crash-safe resume.
 * Per-release try/catch ensures individual bad records don't kill the batch.
 * The engine is agnostic of API specifics via the FetchPageFn injection.
 */
export async function processSyncJob(
  db: Db,
  source: SyncJob["source"],
  fetchPage: FetchPageFn,
  backfillStartDate: string,
  maxItemsPerRun: number
): Promise<{ fetched: number; errors: number; done: boolean }> {
  // Step 1: Get or create the sync job
  const job = await getOrCreateSyncJob(db, source, backfillStartDate);

  // Step 2: Determine mode
  let isBackfill = job.status === "backfilling";

  // If in error state, recover: resume backfilling if cursor exists, else syncing
  if (job.status === "error") {
    isBackfill = job.cursor !== null;
  }

  let fetched = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let done = false;

  try {
    // Step 3: Page loop
    while (fetched < maxItemsPerRun) {
      // Fetch a page of releases
      const pageResult = await fetchPage({
        cursor: currentCursor,
        dateFrom: isBackfill ? undefined : (job.lastSyncedDate ?? undefined),
      });

      // No more data -- we are done
      if (pageResult.releases.length === 0) {
        done = true;
        break;
      }

      // Map releases with per-release error handling
      const batch = [];
      const errorMessages: string[] = [];

      for (const release of pageResult.releases) {
        try {
          const mapped = mapOcdsToContract(release, source);
          batch.push(mapped);
        } catch (err) {
          errors++;
          const msg = `Failed to map release ${release.id ?? "unknown"}: ${
            err instanceof Error ? err.message : String(err)
          }`;
          errorMessages.push(msg);
        }
      }

      // Upsert mapped contracts and extract buyers
      if (batch.length > 0) {
        await upsertContracts(db, batch);
        await autoExtractBuyers(db, batch);
      }

      fetched += pageResult.releases.length;
      currentCursor = pageResult.nextCursor;

      // CRITICAL: Save progress after EVERY page for crash-safe resume
      await updateSyncProgress(db, job._id!, {
        cursor: currentCursor,
        fetched,
        errors,
        totalFetched: job.totalFetched + fetched,
        errorMessages:
          errorMessages.length > 0 ? errorMessages : undefined,
      });

      // No next page -- done with this pass
      if (pageResult.nextCursor === null) {
        done = true;
        break;
      }
    }

    // Step 4: If backfill complete, transition to syncing mode
    if (done && isBackfill) {
      await markSyncComplete(db, job._id!);
    }
  } catch (err) {
    // Fatal error (e.g., DB connection loss) -- mark job as error and rethrow
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    await markSyncError(db, job._id!, errorMsg);
    throw err;
  }

  return { fetched, errors, done };
}
