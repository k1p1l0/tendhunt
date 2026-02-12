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
// Heuristic classification for unmatched buyers
// ---------------------------------------------------------------------------

/**
 * Name/sector keyword rules to assign orgType when Fuse.js finds no match.
 * Checked in order — first match wins.
 */
const HEURISTIC_RULES: Array<{
  test: (name: string, sector: string) => boolean;
  orgType: string;
}> = [
  // Central government
  { test: (n) => /\b(department for|department of|ministry of|hm treasury|cabinet office|home office|foreign|hmrc)\b/i.test(n), orgType: "central_government" },
  { test: (n) => /\b(government digital|crown commercial|government property|government legal)\b/i.test(n), orgType: "central_government" },
  // Devolved government
  { test: (n) => /\b(scottish government|welsh government|northern ireland|stormont)\b/i.test(n), orgType: "devolved_government" },
  // Scottish/Welsh/NI councils (not in England-focused DataSource)
  { test: (n) => /\bcouncil\b/i.test(n), orgType: "local_council_other" },
  // NHS bodies
  { test: (n) => /\bnhs\b/i.test(n), orgType: "nhs_other" },
  { test: (n, s) => s === "Health & Social" && /\b(trust|hospital|health)\b/i.test(n), orgType: "nhs_other" },
  // Universities
  { test: (n) => /\buniversity\b/i.test(n), orgType: "university" },
  // Academies / schools / MATs
  { test: (n) => /\b(academy|academies|trust|multi.?academy|MAT)\b/i.test(n) && /\b(school|learning|education|academy)\b/i.test(n), orgType: "mat" },
  // FE colleges
  { test: (n) => /\bcollege\b/i.test(n), orgType: "fe_college" },
  // Police
  { test: (n) => /\b(police|constabulary)\b/i.test(n), orgType: "police_pcc" },
  // Fire & rescue
  { test: (n) => /\b(fire|rescue)\b/i.test(n), orgType: "fire_rescue" },
  // Housing associations
  { test: (n) => /\b(housing|homes|habitation)\b/i.test(n), orgType: "housing_association" },
  // Regulators & ALBs
  { test: (n) => /\b(ofsted|ofcom|ofgem|ofwat|cqc|fca|hmcts|hse|environment agency)\b/i.test(n), orgType: "alb" },
  // Transport
  { test: (n) => /\b(transport for|network rail|highways|tfl)\b/i.test(n), orgType: "alb" },
  // Private companies — water, energy, defence
  { test: (n) => /\b(limited|ltd|plc|group|services|solutions)\b/i.test(n), orgType: "private_company" },
];

/**
 * Attempt to classify a buyer by name/sector heuristics.
 * Returns orgType string or null if no rule matches.
 */
function classifyByHeuristic(name: string, sector: string): string | null {
  for (const rule of HEURISTIC_RULES) {
    if (rule.test(name, sector)) return rule.orgType;
  }
  return null;
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
          if (ds.website) {
            fields.website = ds.website;
          }

          // Add to enrichment sources
          fields.enrichmentSources = ["data_source"];
          fields.lastEnrichedAt = new Date();

          updates.push({ buyerId: buyer._id!, fields });
          matched++;
        } else {
          // No DataSource match — try heuristic classification
          const heuristicType = classifyByHeuristic(buyer.name, buyer.sector ?? "");
          if (heuristicType) {
            const fields: Record<string, unknown> = {
              orgType: heuristicType,
              enrichmentSources: ["heuristic"],
              lastEnrichedAt: new Date(),
            };
            updates.push({ buyerId: buyer._id!, fields });
            matched++;
          } else {
            unmatchedNames.push(buyer.name);
            unmatched++;
          }
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
