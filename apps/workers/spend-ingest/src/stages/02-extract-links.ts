import type { Db } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";

import type { Env, SpendJobDoc } from "../types";
import { getBuyerBatchForLinkExtraction, updateBuyerCsvLinks } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";
import { scoreLink, FILE_EXT_PATTERN } from "../patterns/csv-patterns";
import type { ScoredLink } from "../patterns/csv-patterns";
import { decodeHtmlEntities } from "../patterns/html-extractor";
import { reportPipelineError } from "../db/pipeline-errors";

// ---------------------------------------------------------------------------
// Stage 2: Extract CSV/Excel download links from transparency pages
// Enhanced with 12+ patterns, anchor text scoring, HTML entity decoding
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
const MAX_PUBLICATION_PAGES = 24;

/**
 * Follow GOV.UK publication pages to resolve actual download URLs.
 * GOV.UK collection pages link to /government/publications/ HTML pages,
 * which in turn contain the actual ODS/CSV download links on
 * assets.publishing.service.gov.uk/media/.
 */
async function followGovukPublicationPages(
  csvLinks: string[]
): Promise<string[]> {
  const publicationUrls = csvLinks.filter((url) =>
    url.includes("/government/publications/")
  );
  const nonPublicationUrls = csvLinks.filter(
    (url) => !url.includes("/government/publications/")
  );

  if (publicationUrls.length === 0) return csvLinks;

  console.log(
    `Following ${Math.min(publicationUrls.length, MAX_PUBLICATION_PAGES)} GOV.UK publication pages...`
  );

  const resolvedDownloads: string[] = [];

  for (const pubUrl of publicationUrls.slice(0, MAX_PUBLICATION_PAGES)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetchWithDomainDelay(pubUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; TendHunt/1.0; link-extraction)",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const html = await response.text();
      const decoded = decodeHtmlEntities(html);

      // Extract download URLs from the publication page
      const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;

      while ((match = hrefRegex.exec(decoded)) !== null) {
        const href = match[1];
        // Match assets.publishing.service.gov.uk/media/ or /government/uploads/
        if (
          href.includes("assets.publishing.service.gov.uk/media/") ||
          href.includes("/government/uploads/")
        ) {
          try {
            const resolved = new URL(href, pubUrl).href;
            if (
              resolved.startsWith("http://") ||
              resolved.startsWith("https://")
            ) {
              resolvedDownloads.push(resolved);
            }
          } catch {
            // skip invalid URL
          }
        }
      }
    } catch (err) {
      console.warn(
        `Failed to follow publication page ${pubUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Deduplicate
  const allLinks = Array.from(
    new Set([...nonPublicationUrls, ...resolvedDownloads])
  );

  console.log(
    `Resolved ${resolvedDownloads.length} download URLs from ${Math.min(publicationUrls.length, MAX_PUBLICATION_PAGES)} publication pages`
  );

  return allLinks;
}

/**
 * Enhanced link extraction using all 12+ patterns with scoring.
 * Extracts full <a> tags to capture anchor text for keyword scoring.
 */
function extractLinksEnhanced(html: string, baseUrl: string): ScoredLink[] {
  const decoded = decodeHtmlEntities(html);
  const scored: ScoredLink[] = [];
  const seen = new Set<string>();

  // Extract full <a> tags with anchor text
  const anchorRegex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(decoded)) !== null) {
    const href = match[1];
    const anchorText = match[2].replace(/<[^>]*>/g, "").trim();

    const result = scoreLink(href, anchorText);
    if (result) {
      try {
        const resolved = new URL(href, baseUrl).href;
        if (
          (resolved.startsWith("http://") || resolved.startsWith("https://")) &&
          !seen.has(resolved)
        ) {
          seen.add(resolved);
          scored.push({ ...result, url: resolved });
        }
      } catch {
        // skip invalid URL
      }
    }
  }

  // Also check bare hrefs not captured by anchor regex (e.g., in <link>, <area>)
  const bareHrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  while ((match = bareHrefRegex.exec(decoded)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, baseUrl).href;
      if (seen.has(resolved)) continue;

      const result = scoreLink(href);
      if (result) {
        if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
          seen.add(resolved);
          scored.push({ ...result, url: resolved });
        }
      }
    } catch {
      // skip
    }
  }

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Resolve relative URLs and deduplicate.
 */
function resolveAndDedup(urls: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    try {
      const resolved = new URL(url, baseUrl).href;
      if (
        (resolved.startsWith("http://") || resolved.startsWith("https://")) &&
        !seen.has(resolved)
      ) {
        seen.add(resolved);
        result.push(resolved);
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return result;
}

/**
 * Parse Claude's JSON response for CSV link extraction.
 */
function parseLinkExtractionResponse(text: string): string[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.csvLinks)) {
      return parsed.csvLinks.filter(
        (link: unknown): link is string => typeof link === "string" && link.length > 0
      );
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Transform Google Sheets/Drive URLs into direct CSV download URLs.
 * Google Sheets: append /export?format=csv
 * Google Drive files: use /uc?export=download&id=FILE_ID
 */
function transformGoogleUrls(urls: string[]): string[] {
  const transformed: string[] = [];

  for (const url of urls) {
    // Google Sheets: docs.google.com/spreadsheets/d/SHEET_ID/...
    const sheetsMatch = url.match(
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
    );
    if (sheetsMatch) {
      transformed.push(
        `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`
      );
      continue;
    }

    // Google Drive: drive.google.com/file/d/FILE_ID/...
    const driveMatch = url.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
    );
    if (driveMatch) {
      transformed.push(
        `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`
      );
      continue;
    }

    // Google Drive open: drive.google.com/open?id=FILE_ID
    const driveOpenMatch = url.match(
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
    );
    if (driveOpenMatch) {
      transformed.push(
        `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`
      );
      continue;
    }

    // Not a Google URL — keep as-is
    transformed.push(url);
  }

  return transformed;
}

/**
 * Extract Google Sheets/Drive links from HTML that the regex patterns miss.
 * These links don't match standard CSV patterns but are valid data sources.
 */
function extractGoogleLinks(html: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  // Match Google Sheets links
  const sheetsRegex = /href\s*=\s*["'](https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = sheetsRegex.exec(html)) !== null) {
    const url = match[1];
    if (!seen.has(url)) { seen.add(url); links.push(url); }
  }

  // Match Google Drive file links
  const driveRegex = /href\s*=\s*["'](https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  while ((match = driveRegex.exec(html)) !== null) {
    const url = match[1];
    if (!seen.has(url)) { seen.add(url); links.push(url); }
  }

  // Match Google Drive open links
  const driveOpenRegex = /href\s*=\s*["'](https?:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  while ((match = driveOpenRegex.exec(html)) !== null) {
    const url = match[1];
    if (!seen.has(url)) { seen.add(url); links.push(url); }
  }

  return links;
}

/**
 * Check if a URL looks like a valid download/data link.
 * Enhanced to accept any pattern-matched URL, not just file extensions.
 */
function isValidDownloadLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const full = parsed.href.toLowerCase();

    // Direct file extension
    if (FILE_EXT_PATTERN.regex.test(path)) return true;

    // Score the full URL — if any pattern matches, it's valid
    const result = scoreLink(full);
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Stage 2: Extract CSV/Excel download links from transparency pages.
 *
 * Enhanced extraction:
 * 1. Decode HTML entities before matching
 * 2. Use all 12+ patterns with weight scoring
 * 3. Extract anchor text for keyword scoring
 * 4. AI fallback when < 3 links found
 * 5. Merge, dedup, filter
 */
export async function extractCsvLinks(
  db: Db,
  env: Env,
  job: SpendJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const limit = pLimit(3);

  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let totalLinksFound = 0;

  while (processed < maxItems) {
    const batch = await getBuyerBatchForLinkExtraction(db, currentCursor, BATCH_SIZE);

    if (batch.length === 0) {
      console.log(
        `Extract links complete: ${totalLinksFound} CSV links found across ${processed} buyers`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          const transparencyUrl = buyer.transparencyPageUrl!;

          // Follow GOV.UK publication pages → resolve to actual download URLs
          if (buyer.csvLinks && buyer.csvLinks.length > 0) {
            const hasPublicationUrls = buyer.csvLinks.some((url: string) =>
              url.includes("/government/publications/")
            );
            if (hasPublicationUrls) {
              buyer.csvLinks = await followGovukPublicationPages(
                buyer.csvLinks
              );
            }
          }

          // Fetch the transparency page
          let html: string;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetchWithDomainDelay(transparencyUrl, {
              signal: controller.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (compatible; TendHunt/1.0; link-extraction)",
              },
            });
            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            html = await response.text();
          } catch (err) {
            const fetchMsg = `Fetch failed for "${buyer.name}" transparency page (${transparencyUrl}): ${
              err instanceof Error ? err.message : String(err)
            }`;
            console.warn(fetchMsg);
            await updateBuyerCsvLinks(db, buyer._id!, buyer.csvLinks ?? []);
            await reportPipelineError(db, {
              worker: "spend-ingest",
              stage: "extract_links",
              buyerId: buyer._id!,
              buyerName: buyer.name,
              errorType: "unreachable",
              message: fetchMsg,
              url: transparencyUrl,
            });
            return { error: false, linksFound: 0 };
          }

          // Enhanced extraction with all 12+ patterns
          const scoredLinks = extractLinksEnhanced(html, transparencyUrl);
          let csvLinks = scoredLinks.map((s) => s.url);

          // AI fallback if enhanced regex found < 3 links
          if (csvLinks.length < 3) {
            try {
              const strippedHtml = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
                .slice(0, 15000);

              const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                messages: [
                  {
                    role: "user",
                    content: `You are extracting CSV/Excel download links from a UK public sector transparency page.

Organization: ${buyer.name}
Page URL: ${transparencyUrl}

HTML:
<html>${strippedHtml}</html>

Find ALL download links for spending/payment CSV or Excel files. These are typically monthly or quarterly reports titled like "Payments over 500 - January 2024" or "Expenditure 2023-24 Q1".

Return ONLY valid JSON:
{
  "csvLinks": ["array of full download URLs"]
}`,
                  },
                ],
              });

              const responseText =
                response.content[0]?.type === "text"
                  ? response.content[0].text
                  : "";

              const aiLinks = parseLinkExtractionResponse(responseText);
              if (aiLinks.length > 0) {
                const resolvedAiLinks = resolveAndDedup(aiLinks, transparencyUrl);
                const allLinks = new Set([...csvLinks, ...resolvedAiLinks]);
                csvLinks = Array.from(allLinks);
              }
            } catch (err) {
              const msg = `Claude API error for link extraction "${buyer.name}": ${
                err instanceof Error ? err.message : String(err)
              }`;
              console.error(msg);
              errorMessages.push(msg);
            }
          }

          // Extract Google Sheets/Drive links (not caught by standard patterns)
          const googleLinks = extractGoogleLinks(html);
          if (googleLinks.length > 0) {
            const transformedGoogle = transformGoogleUrls(googleLinks);
            csvLinks = [...csvLinks, ...transformedGoogle];
          }

          // Merge with existing csvLinks from Stage 1
          const existingLinks = buyer.csvLinks ?? [];
          const mergedLinks = Array.from(
            new Set([...existingLinks, ...csvLinks])
          );

          // Transform any Google URLs in the merged set
          const transformedLinks = transformGoogleUrls(mergedLinks);

          // Filter: keep only valid download links (enhanced check)
          // Google download URLs always pass through
          const filteredLinks = transformedLinks.filter(
            (url) => isValidDownloadLink(url) || url.includes("docs.google.com") || url.includes("drive.google.com")
          );

          await updateBuyerCsvLinks(db, buyer._id!, filteredLinks);
          totalLinksFound += filteredLinks.length;
          return { error: false, linksFound: filteredLinks.length };
        })
      )
    );

    // Count errors
    for (const result of results) {
      if (result.status === "rejected") {
        errors++;
        errorMessages.push(result.reason?.message ?? String(result.reason));
      } else if (result.value.error) {
        errors++;
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
    `Extract links paused (budget ${maxItems} reached): ${totalLinksFound} links from ${processed} buyers`
  );
  return { processed, errors, done: false };
}
