import { ObjectId, type Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";
import { getDataSourceById } from "../db/data-sources";

// ---------------------------------------------------------------------------
// Stage 2: Propagate governance URLs from DataSource to Buyer
// ---------------------------------------------------------------------------

/**
 * Stage 2: Copy governance portal URLs and metadata from linked DataSource
 * entries to Buyer documents.
 *
 * For each buyer:
 * 1. Must have dataSourceId set (matched in Stage 1) AND democracyPortalUrl NOT yet set
 * 2. Look up the linked DataSource by _id
 * 3. Copy: democracyPortalUrl, democracyPlatform, boardPapersUrl, website (if buyer lacks one)
 * 4. Add "data_source" to enrichmentSources via $addToSet
 *
 * Processes in batches of 100 with cursor-based resume.
 */
export async function mapGovernanceUrls(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 100;
  const collection = db.collection<BuyerDoc>("buyers");

  let processed = 0;
  let errors = 0;
  let enriched = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Build filter: buyers with dataSourceId set AND democracyPortalUrl not yet set
    const filter: Record<string, unknown> = {
      dataSourceId: { $exists: true, $ne: null },
      $or: [
        { democracyPortalUrl: { $exists: false } },
        { democracyPortalUrl: null },
        { democracyPortalUrl: "" },
      ],
    };

    // Cursor-based pagination
    if (currentCursor) {
      filter._id = { $gt: new ObjectId(currentCursor) };
    }

    const batch = await collection
      .find(filter)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    // No more buyers matching criteria -- stage complete
    if (batch.length === 0) {
      console.log(
        `Governance URL mapping complete: ${enriched} buyers enriched out of ${processed} processed`
      );
      return { processed, errors, done: true };
    }

    const bulkOps: Array<{
      updateOne: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
      };
    }> = [];
    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        if (!buyer.dataSourceId) continue;

        // Look up the linked DataSource
        const ds = await getDataSourceById(db, buyer.dataSourceId);
        if (!ds) {
          console.warn(
            `DataSource not found for buyer "${buyer.name}" (dataSourceId: ${buyer.dataSourceId})`
          );
          continue;
        }

        // Build update fields
        const setFields: Record<string, unknown> = {
          updatedAt: new Date(),
          lastEnrichedAt: new Date(),
        };

        if (ds.democracyPortalUrl) {
          setFields.democracyPortalUrl = ds.democracyPortalUrl;
        }
        if (ds.platform) {
          setFields.democracyPlatform = ds.platform;
        }
        if (ds.boardPapersUrl) {
          setFields.boardPapersUrl = ds.boardPapersUrl;
        }
        // Copy website only if buyer doesn't already have one
        if (ds.website && !buyer.website) {
          setFields.website = ds.website;
        }

        // Skip if DataSource has no governance data to copy
        if (
          !ds.democracyPortalUrl &&
          !ds.platform &&
          !ds.boardPapersUrl &&
          !ds.website
        ) {
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: buyer._id },
            update: {
              $set: setFields,
              $addToSet: { enrichmentSources: "data_source" },
            },
          },
        });
        enriched++;
      } catch (err) {
        errors++;
        const msg = `Failed to map governance URLs for buyer "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Execute bulk update
    if (bulkOps.length > 0) {
      try {
        const result = await collection.bulkWrite(bulkOps, { ordered: false });
        console.log(
          `Batch: ${result.modifiedCount} buyers enriched with governance URLs`
        );
      } catch (err) {
        errors++;
        const msg = `Bulk update failed: ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Update cursor and progress
    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    // Save progress after EVERY batch (crash-safe)
    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  // Budget reached, but more buyers may remain
  console.log(
    `Governance URL mapping paused (budget ${maxItems} reached): ${enriched} enriched out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
