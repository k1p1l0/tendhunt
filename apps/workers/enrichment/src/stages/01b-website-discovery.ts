import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { getFilteredBuyerBatch, bulkUpdateBuyerEnrichment } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";
import { callApifyActor } from "../api-clients/apify";

// ---------------------------------------------------------------------------
// Stage 1b: Discover missing websites via Google Search (Apify)
// ---------------------------------------------------------------------------

/** Domains to exclude from search results (not official org websites) */
const EXCLUDED_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "companies-house.gov.uk",
  "find-and-update.company-information",
  "moderngov.co.uk",
];

/**
 * Extract a clean URL from Google Search results.
 * Returns the first result whose domain isn't in the exclusion list.
 */
function extractOfficialWebsite(
  results: Record<string, unknown>[]
): string | null {
  for (const result of results) {
    const url = String(result.url || result.link || "");
    if (!url || !url.startsWith("http")) continue;

    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const isExcluded = EXCLUDED_DOMAINS.some((d) => hostname.includes(d));
      if (!isExcluded) {
        // Return just the origin (protocol + host) for cleanliness
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}`;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Stage 1b: Website Discovery
 *
 * For buyers with orgType set but no website, use Google Search via Apify
 * to discover their official website domain.
 *
 * Search query targets UK public sector TLDs (.gov.uk, .nhs.uk, .ac.uk, .org.uk).
 * Batch size: 20 (external API calls are slow).
 */
export async function discoverWebsites(
  db: Db,
  env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  if (!env.APIFY_API_TOKEN) {
    console.warn("APIFY_API_TOKEN not set — skipping website discovery");
    return { processed: 0, errors: 0, done: true };
  }

  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let discovered = 0;

  // Use smaller batch size since each item triggers an external API call
  const batchSize = Math.min(job.batchSize, 20);

  // Only query buyers that need website discovery
  const stageFilter = {
    orgType: { $ne: null },
    $or: [{ website: null }, { website: { $exists: false } }],
  };

  while (processed < maxItems) {
    const batch = await getFilteredBuyerBatch(
      db,
      currentCursor,
      batchSize,
      stageFilter
    );

    if (batch.length === 0) {
      console.log(
        `Website discovery complete: ${discovered} websites found out of ${processed} processed`
      );
      return { processed, errors, done: true };
    }

    const updates: Array<{
      buyerId: import("mongodb").ObjectId;
      fields: Record<string, unknown>;
    }> = [];
    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        const query = `"${buyer.name}" official website site:*.gov.uk OR site:*.nhs.uk OR site:*.ac.uk OR site:*.org.uk`;

        const pageResults = await callApifyActor(
          "apify/google-search-scraper",
          {
            queries: query,
            maxPagesPerQuery: 1,
            resultsPerPage: 5,
          },
          env.APIFY_API_TOKEN
        );

        // Google Search actor returns page objects with nested organicResults
        const organicResults: Record<string, unknown>[] = [];
        for (const page of pageResults as Record<string, unknown>[]) {
          const organic = page.organicResults;
          if (Array.isArray(organic)) {
            organicResults.push(...organic as Record<string, unknown>[]);
          }
        }

        const website = extractOfficialWebsite(organicResults);

        if (website) {
          updates.push({
            buyerId: buyer._id!,
            fields: { website },
          });
          discovered++;
        }
      } catch (err) {
        errors++;
        const msg = `Website discovery failed for "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Bulk write updates
    if (updates.length > 0) {
      try {
        const modified = await bulkUpdateBuyerEnrichment(db, updates);
        console.log(`Website discovery batch: ${modified} websites found`);
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

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Website discovery paused (budget ${maxItems} reached): ${discovered} found out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
