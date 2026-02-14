import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { getFilteredBuyerBatch } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";

// ---------------------------------------------------------------------------
// Parent name extraction patterns
// ---------------------------------------------------------------------------

const MIN_PARENT_NAME_LENGTH = 5;

/**
 * Extract a potential parent org name from a buyer name.
 * Returns null if no parent pattern detected or name too short.
 *
 * Patterns:
 * 1. Comma: "Ministry of Defence, Army" → "Ministry of Defence"
 * 2. Dash with spaces: "DIO - Ministry of Defence" → try both sides
 * 3. "hosted by": "NHS Wales Informatics as hosted by Velindre NHS Trust" → "Velindre NHS Trust"
 */
export function extractParentName(buyerName: string): string[] {
  const candidates: string[] = [];

  // Pattern 3: "hosted by" — most specific, check first
  const hostedMatch = buyerName.match(/\bas\s+hosted\s+by\s+(.+)/i);
  if (hostedMatch) {
    const name = hostedMatch[1].trim();
    if (name.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(name);
    }
  }

  // Pattern 1: Comma split (first comma only)
  const commaIdx = buyerName.indexOf(",");
  if (commaIdx > 0) {
    const left = buyerName.substring(0, commaIdx).trim();
    // Skip parenthetical abbreviations like "(NWSSP)"
    if (left.length >= MIN_PARENT_NAME_LENGTH && !/^\([A-Z]+\)$/.test(left)) {
      candidates.push(left);
    }
  }

  // Pattern 2: Dash with spaces " - " (first occurrence only)
  const dashIdx = buyerName.indexOf(" - ");
  if (dashIdx > 0) {
    const left = buyerName.substring(0, dashIdx).trim();
    const right = buyerName.substring(dashIdx + 3).trim();
    if (left.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(left);
    }
    if (right.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(right);
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Stage 0: Link parent buyers
// ---------------------------------------------------------------------------

/**
 * Stage 0: Detect and link parent-child relationships between buyers.
 *
 * For each buyer not yet processed by parent_link:
 * 1. Extract potential parent names using delimiter patterns
 * 2. Look up extracted name in buyers by nameLower
 * 3. If found AND parent ≠ self: set parentBuyerId, update parent's childBuyerIds
 * 4. Always mark with enrichmentSources "parent_link" to avoid reprocessing
 */
export async function linkParentBuyers(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const buyersCol = db.collection<BuyerDoc>("buyers");

  let processed = 0;
  let errors = 0;
  let linked = 0;
  let skipped = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    const batch = await getFilteredBuyerBatch(
      db,
      currentCursor,
      job.batchSize,
      { enrichmentSources: { $ne: "parent_link" } }
    );

    if (batch.length === 0) {
      console.log(
        `Parent linking complete: ${linked} linked, ${skipped} skipped out of ${processed} total`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        const buyerNameLower = buyer.name.toLowerCase();
        const candidates = extractParentName(buyer.name);

        let foundParent = false;

        for (const candidateName of candidates) {
          const candidateLower = candidateName.toLowerCase();

          // Skip if extracted parent = self
          if (candidateLower === buyerNameLower) continue;

          const parentBuyer = await buyersCol.findOne({
            nameLower: candidateLower,
          });

          if (parentBuyer && parentBuyer._id!.toString() !== buyer._id!.toString()) {
            // Link child → parent
            await buyersCol.updateOne(
              { _id: buyer._id },
              {
                $set: {
                  parentBuyerId: parentBuyer._id,
                  updatedAt: new Date(),
                },
                $addToSet: { enrichmentSources: "parent_link" as never },
              }
            );

            // Update parent: add child + mark as parent
            await buyersCol.updateOne(
              { _id: parentBuyer._id },
              {
                $addToSet: {
                  childBuyerIds: buyer._id as never,
                  enrichmentSources: "parent_link" as never,
                },
                $set: {
                  isParent: true,
                  updatedAt: new Date(),
                },
              }
            );

            linked++;
            foundParent = true;
            break;
          }
        }

        if (!foundParent) {
          // No parent found — mark as processed to avoid reprocessing
          await buyersCol.updateOne(
            { _id: buyer._id },
            {
              $addToSet: { enrichmentSources: "parent_link" as never },
              $set: { updatedAt: new Date() },
            }
          );
          skipped++;
        }
      } catch (err) {
        errors++;
        const msg = `Failed to link parent for "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Parent linking paused (budget ${maxItems} reached): ${linked} linked, ${skipped} skipped out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
