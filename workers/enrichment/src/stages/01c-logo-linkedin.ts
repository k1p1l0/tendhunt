import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { getFilteredBuyerBatch, bulkUpdateBuyerEnrichment } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";
import { callApifyActor } from "../api-clients/apify";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";

// ---------------------------------------------------------------------------
// Stage 1c: Logo + LinkedIn enrichment
//
// Three-layer approach per buyer:
//   A. logo.dev CDN — instant URL from domain (no HTTP call)
//   B. LinkedIn company search — find org page + fallback logo
//   C. og:image fallback — scrape buyer website meta tags
// ---------------------------------------------------------------------------

/**
 * Extract domain from a website URL.
 * Returns null for invalid URLs.
 */
function extractDomain(website: string): string | null {
  try {
    return new URL(website).hostname;
  } catch {
    return null;
  }
}

/**
 * Construct a logo.dev CDN URL from a domain.
 * logo.dev returns a 128px PNG logo for most domains.
 */
function buildLogoDevUrl(domain: string, token: string): string {
  return `https://img.logo.dev/${domain}?token=${token}&size=128&format=png`;
}

/**
 * Extract logo URL from Apify LinkedIn company scraper results.
 * Tries multiple field names used by different scraper versions.
 */
function extractLinkedInLogo(
  company: Record<string, unknown>
): string | null {
  const candidateFields = [
    "logo",
    "companyLogo",
    "logoUrl",
    "profilePicture",
    "companyLogoUrl",
    "logoResolutionResult",
  ];

  for (const field of candidateFields) {
    const value = company[field];
    if (!value) continue;

    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }

    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.url === "string" && obj.url.startsWith("http")) {
        return obj.url;
      }
      if (
        typeof obj.rootUrl === "string" &&
        obj.rootUrl.startsWith("http")
      ) {
        return obj.rootUrl;
      }
    }
  }

  return null;
}

/**
 * Extract LinkedIn company URL from search results.
 * Returns the first result that looks like a LinkedIn company page.
 */
function extractLinkedInUrl(
  results: Record<string, unknown>[]
): string | null {
  for (const result of results) {
    const url = String(
      result.linkedInProfileUrl || result.url || result.profileUrl || ""
    );
    if (url.includes("linkedin.com/company/")) {
      return url;
    }
  }
  return null;
}

/**
 * Fetch og:image meta tag from a website.
 * Lightweight fetch — only reads first 50KB of HTML.
 */
async function fetchOgImage(website: string): Promise<string | null> {
  try {
    const response = await fetchWithDomainDelay(website, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TendHuntBot/1.0; +https://tendhunt.com)",
      },
    });

    if (!response.ok) return null;

    // Read only first 50KB to find meta tags
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 50_000;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    // Extract og:image content
    const match = html.match(
      /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (match?.[1] && match[1].startsWith("http")) {
      return match[1];
    }

    // Try reverse order (content before property)
    const matchAlt = html.match(
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );
    if (matchAlt?.[1] && matchAlt[1].startsWith("http")) {
      return matchAlt[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Stage 1c: Logo + LinkedIn Enrichment
 *
 * For each buyer, applies a 3-layer enrichment:
 *   A. logo.dev CDN URL (buyers with website, no logoUrl)
 *   B. LinkedIn company search (all buyers without linkedinUrl)
 *   C. og:image fallback (buyers with website, still no logoUrl)
 *
 * Batch size: 20 (external APIs).
 */
export async function enrichLogoLinkedin(
  db: Db,
  env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let logosFound = 0;
  let linkedInsFound = 0;

  const batchSize = Math.min(job.batchSize, 20);
  const hasApify = Boolean(env.APIFY_API_TOKEN);
  const hasLogoDev = Boolean(env.LOGO_DEV_TOKEN);

  // Only query buyers that still need logo or LinkedIn enrichment
  const stageFilter = {
    $or: [
      { logoUrl: null },
      { logoUrl: { $exists: false } },
      { linkedinUrl: null },
      { linkedinUrl: { $exists: false } },
    ],
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
        `Logo/LinkedIn enrichment complete: ${logosFound} logos, ${linkedInsFound} LinkedIns out of ${processed} processed`
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
        const fields: Record<string, unknown> = {};
        let logoUrl = buyer.logoUrl ?? null;
        let linkedinUrl = buyer.linkedinUrl ?? null;

        // --- Step A: logo.dev CDN ---
        if (!logoUrl && buyer.website && hasLogoDev) {
          const domain = extractDomain(buyer.website);
          if (domain) {
            logoUrl = buildLogoDevUrl(domain, env.LOGO_DEV_TOKEN);
            fields.logoUrl = logoUrl;
            logosFound++;
          }
        }

        // --- Step B: LinkedIn discovery ---
        if (!linkedinUrl && hasApify) {
          const searchResults = await callApifyActor(
            "curious_coder~linkedin-company-search",
            {
              keyword: buyer.name,
              location: "United Kingdom",
            },
            env.APIFY_API_TOKEN
          );

          const foundUrl = extractLinkedInUrl(
            searchResults as Record<string, unknown>[]
          );
          if (foundUrl) {
            linkedinUrl = foundUrl;
            fields.linkedinUrl = linkedinUrl;
            linkedInsFound++;

            // If no logo yet, scrape LinkedIn profile for logo
            if (!logoUrl) {
              const profileResults = await callApifyActor(
                "dev_fusion~Linkedin-Company-Scraper",
                { profileUrls: [linkedinUrl] },
                env.APIFY_API_TOKEN
              );

              if (profileResults.length > 0) {
                const extractedLogo = extractLinkedInLogo(
                  profileResults[0] as Record<string, unknown>
                );
                if (extractedLogo) {
                  logoUrl = extractedLogo;
                  fields.logoUrl = logoUrl;
                  logosFound++;
                }
              }
            }
          }
        }

        // --- Step C: og:image fallback ---
        if (!logoUrl && buyer.website) {
          const ogImage = await fetchOgImage(buyer.website);
          if (ogImage) {
            fields.logoUrl = ogImage;
            logosFound++;
          }
        }

        // Only update if we found something new
        if (Object.keys(fields).length > 0) {
          updates.push({ buyerId: buyer._id!, fields });
        }
      } catch (err) {
        errors++;
        const msg = `Logo/LinkedIn enrichment failed for "${buyer.name}": ${
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
        console.log(
          `Logo/LinkedIn batch: ${modified} buyers updated`
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

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Logo/LinkedIn paused (budget ${maxItems} reached): ${logosFound} logos, ${linkedInsFound} LinkedIns out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
