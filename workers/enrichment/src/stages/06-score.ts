import { ObjectId, type Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { getBuyerBatch, bulkUpdateBuyerEnrichment } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";

// ---------------------------------------------------------------------------
// Stage 6: Compute enrichment scores
// ---------------------------------------------------------------------------

/**
 * Stage 6: Compute a weighted enrichment score (0-100) for every buyer based
 * on data completeness.
 *
 * Scores reflect how much intelligence is available for each buyer:
 * - orgType classification:     12 pts
 * - Website:                     8 pts
 * - Logo URL:                    5 pts
 * - LinkedIn URL:                5 pts
 * - Democracy portal URL:        8 pts
 * - Board papers URL:            8 pts
 * - Description:                 5 pts
 * - Staff count:                 8 pts
 * - Annual budget:               8 pts
 * - Key personnel (up to 5):    18 pts
 * - Board documents (up to 10): 15 pts
 *                         Total: 100 pts
 *
 * Processes ALL buyers (no orgType filter) in batches of 100 with cursor-based
 * resume. Uses aggregation pipelines for efficient batch count lookups.
 */
export async function computeEnrichmentScores(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Fetch next batch of buyers
    const batch = await getBuyerBatch(db, currentCursor, job.batchSize);

    // No more buyers -- stage complete
    if (batch.length === 0) {
      console.log(
        `Enrichment scoring complete: ${processed} buyers scored, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    // Collect batch IDs for aggregation queries
    const batchIds = batch.map((b) => b._id!);

    // Batch count lookups via aggregation (O(1) per buyer vs individual queries)
    const [personnelCountsRaw, docCountsRaw] = await Promise.all([
      db
        .collection("keypersonnel")
        .aggregate<{ _id: ObjectId; count: number }>([
          { $match: { buyerId: { $in: batchIds } } },
          { $group: { _id: "$buyerId", count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection("boarddocuments")
        .aggregate<{ _id: ObjectId; count: number }>([
          { $match: { buyerId: { $in: batchIds } } },
          { $group: { _id: "$buyerId", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    // Convert to Maps for O(1) lookup
    const personnelCounts = new Map<string, number>(
      personnelCountsRaw.map((r) => [r._id.toString(), r.count])
    );
    const docCounts = new Map<string, number>(
      docCountsRaw.map((r) => [r._id.toString(), r.count])
    );

    // Compute scores and build update operations
    const updates: Array<{
      buyerId: ObjectId;
      fields: Record<string, unknown>;
    }> = [];
    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        const buyerIdStr = buyer._id!.toString();
        const personnelCount = personnelCounts.get(buyerIdStr) ?? 0;
        const docCount = docCounts.get(buyerIdStr) ?? 0;

        const score = computeScore(buyer, personnelCount, docCount);

        updates.push({
          buyerId: buyer._id!,
          fields: {
            enrichmentScore: score,
            enrichmentVersion: (buyer.enrichmentVersion ?? 0) + 1,
            lastEnrichedAt: new Date(),
          },
        });
      } catch (err) {
        errors++;
        const msg = `Failed to score buyer "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Bulk write score updates
    if (updates.length > 0) {
      try {
        const modified = await bulkUpdateBuyerEnrichment(db, updates);
        console.log(`Scoring batch: ${modified} buyers scored`);
      } catch (err) {
        errors++;
        const msg = `Bulk score update failed: ${
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
    `Enrichment scoring paused (budget ${maxItems} reached): ${processed} scored, ${errors} errors`
  );
  return { processed, errors, done: false };
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

/**
 * Compute enrichment score (0-100) based on weighted data completeness.
 *
 * Weights sum to exactly 100:
 *   orgType(12) + website(8) + logoUrl(5) + linkedinUrl(5) +
 *   democracyPortalUrl(8) + boardPapersUrl(8) + description(5) +
 *   staffCount(8) + annualBudget(8) + personnel(18) + documents(15) = 100
 */
function computeScore(
  buyer: BuyerDoc,
  personnelCount: number,
  docCount: number
): number {
  let score = 0;

  // Binary presence fields
  if (buyer.orgType) score += 12;
  if (buyer.website) score += 8;
  if (buyer.logoUrl) score += 5;
  if (buyer.linkedinUrl) score += 5;
  if (buyer.democracyPortalUrl) score += 8;
  if (buyer.boardPapersUrl) score += 8;
  if (buyer.description) score += 5;
  if (buyer.staffCount) score += 8;
  if (buyer.annualBudget) score += 8;

  // Graduated fields (proportional to count, capped)
  score += (Math.min(personnelCount, 5) / 5) * 18; // 0-18 pts
  score += (Math.min(docCount, 10) / 10) * 15; // 0-15 pts

  return Math.round(score);
}
