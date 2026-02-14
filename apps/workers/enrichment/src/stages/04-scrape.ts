import { ObjectId, type Db, type Collection } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc, BoardDocumentDoc } from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";
import { upsertBoardDocuments } from "../db/board-documents";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";
import { reportPipelineError } from "../db/pipeline-errors";

// ---------------------------------------------------------------------------
// Stage 4: Scrape governance pages for non-ModernGov organisations
// ---------------------------------------------------------------------------

/**
 * Org types that should be scraped (not served by ModernGov).
 * NHS trusts, ICBs, emergency services, combined authorities, national parks.
 */
const SCRAPE_ORG_TYPES = [
  "nhs_trust_acute",
  "nhs_trust_mental_health",
  "nhs_trust_community",
  "nhs_trust_ambulance",
  "nhs_icb",
  "fire_rescue",
  "police_pcc",
  "combined_authority",
  "national_park",
];

/**
 * Democracy platforms for local councils that are NOT ModernGov
 * (and therefore need website scraping instead of SOAP API).
 */
const NON_MODERNGOV_PLATFORMS = ["CMIS", "Custom", "Jadu", "None"];

/**
 * Stage 4: Scrape governance pages for NHS trusts, ICBs, and non-ModernGov
 * councils. Extracts text content from HTML pages and stores as BoardDocuments
 * for downstream Claude Haiku personnel extraction (Stage 5).
 *
 * Targets:
 * - All NHS trusts (acute, mental health, community, ambulance)
 * - All ICBs (Integrated Care Boards)
 * - Fire & rescue, police PCCs, combined authorities, national parks
 * - Local councils with non-ModernGov platforms (CMIS, Custom, Jadu, None)
 */
export async function scrapeGovernancePages(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 20;
  const collection = db.collection<BuyerDoc>("buyers");

  let processed = 0;
  let errors = 0;
  let totalDocsSaved = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Build filter: non-ModernGov orgs not yet scraped, with a URL to try.
    // Uses $and to combine org-type filter with URL requirement
    // (MongoDB doesn't allow two $or at the same level).
    const filter: Record<string, unknown> = {
      $and: [
        {
          $or: [
            // NHS trusts, ICBs, emergency services, etc.
            { orgType: { $in: SCRAPE_ORG_TYPES } },
            // Local councils on non-ModernGov platforms
            {
              orgType: { $regex: /^local_council/ },
              democracyPlatform: { $in: NON_MODERNGOV_PLATFORMS },
            },
          ],
        },
        {
          $or: [
            { boardPapersUrl: { $exists: true, $nin: [null, ""] } },
            { website: { $exists: true, $nin: [null, ""] } },
          ],
        },
      ],
      enrichmentSources: { $nin: ["scrape"] },
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
        `Scrape stage complete: ${processed} buyers processed, ${totalDocsSaved} docs saved, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        // Determine URLs to try in priority order
        const urlsToTry = buildScrapeUrls(buyer);

        if (urlsToTry.length === 0) {
          // No URLs available -- mark as processed and skip
          await markBuyerScraped(collection, buyer._id!);
          continue;
        }

        let pageFound = false;

        for (const url of urlsToTry) {
          try {
            // Fetch with 10-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10_000);

            const response = await fetchWithDomainDelay(url, {
              signal: controller.signal,
              headers: {
                "User-Agent":
                  "TendHunt-Enrichment/1.0 (UK public procurement research)",
                Accept: "text/html,application/xhtml+xml",
              },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              console.warn(
                `HTTP ${response.status} for "${buyer.name}" at ${url}`
              );
              if (response.status === 403 || response.status === 404) {
                await reportPipelineError(db, {
                  worker: "enrichment",
                  stage: "scrape",
                  buyerId: buyer._id!,
                  buyerName: buyer.name,
                  errorType: response.status === 403 ? "api_403" : "unreachable",
                  message: `HTTP ${response.status} scraping governance page`,
                  url,
                });
              }
              continue;
            }

            const html = await response.text();
            const text = extractTextFromHtml(html);

            // Only store if substantial content found (>500 chars)
            if (text.length > 500) {
              const boardDoc: Partial<BoardDocumentDoc> & {
                buyerId: ObjectId;
                sourceUrl: string;
              } = {
                buyerId: buyer._id!,
                dataSourceName: buyer.name,
                title: `Governance page - ${buyer.name}`,
                documentType: "board_pack",
                sourceUrl: url,
                textContent: text.slice(0, 10_000), // Truncate for MongoDB
                textLength: text.length,
                extractionStatus: "extracted",
              };

              const saved = await upsertBoardDocuments(db, [boardDoc]);
              totalDocsSaved += saved;
              pageFound = true;

              console.log(
                `Scraped "${buyer.name}": ${text.length} chars from ${url}`
              );
              break; // Stop trying more URLs once we have content
            }
          } catch (err) {
            // Individual URL failure -- try next URL
            const msg =
              err instanceof Error ? err.message : String(err);
            if (msg.includes("abort")) {
              console.warn(`Timeout scraping "${buyer.name}" at ${url}`);
            } else {
              console.warn(
                `Failed to scrape "${buyer.name}" at ${url}: ${msg}`
              );
            }
          }
        }

        if (!pageFound) {
          console.log(
            `No substantial governance page found for "${buyer.name}"`
          );
        }

        // Mark buyer as processed by this stage regardless of success
        await markBuyerScraped(collection, buyer._id!);
      } catch (err) {
        errors++;
        const msg = `Scrape failed for "${buyer.name}": ${
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
    `Scrape paused (budget ${maxItems} reached): ${processed} processed, ${totalDocsSaved} docs, ${errors} errors`
  );
  return { processed, errors, done: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a priority-ordered list of URLs to try scraping for a buyer.
 */
function buildScrapeUrls(buyer: BuyerDoc): string[] {
  const urls: string[] = [];

  // Priority 1: Direct governance/board papers URL
  if (buyer.boardPapersUrl) {
    urls.push(buyer.boardPapersUrl);
  }

  // Priority 2: Democracy portal URL (for non-MG councils)
  if (buyer.democracyPortalUrl) {
    urls.push(buyer.democracyPortalUrl);
  }

  // Priority 3-4: Common governance page patterns on the main website
  if (buyer.website) {
    const base = buyer.website.replace(/\/$/, "");
    urls.push(`${base}/about/board`);
    urls.push(`${base}/about/governance`);
  }

  return urls;
}

/**
 * Extract text from HTML by stripping script/style blocks, HTML tags,
 * and collapsing whitespace.
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Mark a buyer as processed by the scrape stage.
 */
async function markBuyerScraped(
  collection: Collection<BuyerDoc>,
  buyerId: ObjectId
): Promise<void> {
  await collection.updateOne(
    { _id: buyerId },
    {
      $set: {
        lastEnrichedAt: new Date(),
        updatedAt: new Date(),
      },
      $addToSet: { enrichmentSources: "scrape" },
    }
  );
}
