import Fuse from "fuse.js";
import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc, DataSourceDoc, BuyerDoc } from "../types";
import { getAllDataSources } from "../db/data-sources";
import { getBuyerBatch, bulkUpdateBuyerEnrichment } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

/**
 * Common words/phrases to strip from buyer names before fuzzy matching.
 * Order matters: longer phrases first to avoid partial stripping.
 */
const STRIP_PATTERNS = [
  /\bfoundation\s+trust\b/gi,
  /\bnhs\s+trust\b/gi,
  /\bnhs\b/gi,
  /\bborough\b/gi,
  /\bcouncil\b/gi,
  /\bcity\b/gi,
  /\broyal\b/gi,
  /\bthe\b/gi,
  /\bof\b/gi,
  /\bmetropolitan\b/gi,
  /\bdistrict\b/gi,
  /\bcounty\b/gi,
  /\bunitary\b/gi,
  /\bauthority\b/gi,
  /\bauthorities\b/gi,
  /\bcombined\b/gi,
];

/**
 * Normalize a buyer name for fuzzy matching.
 * Strips common institutional words, lowercases, trims whitespace.
 */
function normalizeName(name: string): string {
  let normalized = name;
  for (const pattern of STRIP_PATTERNS) {
    normalized = normalized.replace(pattern, "");
  }
  return normalized
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Stage 1: Classify buyers via Fuse.js fuzzy matching
// ---------------------------------------------------------------------------

/**
 * Stage 1: Fuzzy-match buyer names against the DataSource collection.
 *
 * For each buyer:
 * 1. Normalize the buyer name (strip common suffixes/prefixes)
 * 2. Search against DataSource names using Fuse.js
 * 3. If match found (score < 0.3): update buyer with orgType, dataSourceId,
 *    democracyPortalUrl, democracyPlatform, boardPapersUrl
 * 4. If no match: log for manual review
 *
 * Processes in batches of 100, saving cursor after each batch.
 */
export async function classifyBuyers(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  // Step 1: Load all DataSource documents into memory for Fuse.js
  const dataSources = await getAllDataSources(db);
  console.log(`Loaded ${dataSources.length} DataSource entries for fuzzy matching`);

  if (dataSources.length === 0) {
    console.warn("No DataSource entries found. Run seed script first.");
    return { processed: 0, errors: 0, done: true };
  }

  // Step 2: Create Fuse.js instance with tuned options
  const fuse = new Fuse(dataSources, {
    keys: ["name"],
    threshold: 0.3, // Strict but allows abbreviation differences
    ignoreLocation: true, // Don't penalize position in string
    includeScore: true,
    minMatchCharLength: 3,
  });

  // Step 3: Process buyers in batches
  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let matched = 0;
  let unmatched = 0;

  while (processed < maxItems) {
    // Fetch next batch
    const batch = await getBuyerBatch(db, currentCursor, job.batchSize);

    // No more buyers -- stage complete
    if (batch.length === 0) {
      console.log(
        `Classification complete: ${matched} matched, ${unmatched} unmatched out of ${processed} total`
      );
      return { processed, errors, done: true };
    }

    // Classify each buyer in the batch
    const updates: Array<{
      buyerId: import("mongodb").ObjectId;
      fields: Record<string, unknown>;
    }> = [];
    const errorMessages: string[] = [];
    const unmatchedNames: string[] = [];

    for (const buyer of batch) {
      try {
        const normalizedName = normalizeName(buyer.name);

        // Skip if already classified
        if (buyer.orgType && buyer.dataSourceId) {
          continue;
        }

        const matches = fuse.search(normalizedName);

        if (
          matches.length > 0 &&
          matches[0].score !== undefined &&
          matches[0].score < 0.3
        ) {
          // Match found -- extract enrichment fields from DataSource
          const ds = matches[0].item;
          const fields: Record<string, unknown> = {
            orgType: ds.orgType,
            dataSourceId: ds._id,
          };

          if (ds.democracyPortalUrl) {
            fields.democracyPortalUrl = ds.democracyPortalUrl;
          }
          if (ds.platform) {
            fields.democracyPlatform = ds.platform;
          }
          if (ds.boardPapersUrl) {
            fields.boardPapersUrl = ds.boardPapersUrl;
          }

          // Add to enrichment sources
          fields.enrichmentSources = ["data_source"];
          fields.lastEnrichedAt = new Date();

          updates.push({ buyerId: buyer._id!, fields });
          matched++;
        } else {
          // No match found -- log for review
          unmatchedNames.push(buyer.name);
          unmatched++;
        }
      } catch (err) {
        errors++;
        const msg = `Failed to classify buyer "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Bulk write enrichment updates
    if (updates.length > 0) {
      try {
        const modified = await bulkUpdateBuyerEnrichment(db, updates);
        console.log(`Batch: ${modified} buyers classified`);
      } catch (err) {
        errors++;
        const msg = `Bulk update failed: ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Log unmatched names for review
    if (unmatchedNames.length > 0) {
      console.log(
        `Unmatched buyers (${unmatchedNames.length}): ${unmatchedNames.slice(0, 10).join(", ")}${
          unmatchedNames.length > 10 ? ` ... and ${unmatchedNames.length - 10} more` : ""
        }`
      );
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
    `Classification paused (budget ${maxItems} reached): ${matched} matched, ${unmatched} unmatched out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
