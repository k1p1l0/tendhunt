import type { Db } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import type { Env, SpendJobDoc } from "../types";
import { getBuyerBatchForLinkExtraction, updateBuyerCsvLinks } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";

// ---------------------------------------------------------------------------
// Stage 2: Extract CSV/Excel download links from transparency pages
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;

/** File extension pattern for spending data files */
const FILE_EXT_PATTERN = /\.(?:csv|xls|xlsx)$/i;

/** URL pattern for download/export links with CSV context */
const DOWNLOAD_PATTERN = /(?:download|export).*csv|csv.*(?:download|export)/i;

/**
 * Extract CSV/Excel download links from HTML using regex.
 * Finds href attributes ending in common data file extensions.
 */
function extractLinksViaRegex(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];

    // Direct file extension match
    if (FILE_EXT_PATTERN.test(href)) {
      links.push(href);
      continue;
    }

    // Download/export URL with CSV context
    if (DOWNLOAD_PATTERN.test(href)) {
      links.push(href);
    }
  }

  // Resolve relative URLs and deduplicate
  return resolveAndDedup(links, baseUrl);
}

/**
 * Resolve relative URLs against base and deduplicate.
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
 * Stage 2: Extract CSV/Excel download links from transparency pages.
 *
 * For buyers with a transparencyPageUrl (not "none"), visits the page and
 * extracts all CSV download links via regex. If regex finds fewer than 3 links,
 * falls back to Claude Haiku for deeper extraction.
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
            console.warn(
              `Fetch failed for "${buyer.name}" transparency page (${transparencyUrl}): ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            // Mark as extracted with empty links so we don't retry
            await updateBuyerCsvLinks(db, buyer._id!, buyer.csvLinks ?? []);
            return { error: false, linksFound: 0 };
          }

          // Pass 1: Regex extraction
          let csvLinks = extractLinksViaRegex(html, transparencyUrl);

          // Pass 2: Claude Haiku fallback if regex found < 3 links
          if (csvLinks.length < 3) {
            try {
              const strippedHtml = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
                .slice(0, 15000);

              const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20250401",
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
                // Merge with regex links, deduplicate
                const allLinks = new Set([...csvLinks, ...resolvedAiLinks]);
                csvLinks = Array.from(allLinks);
              }
            } catch (err) {
              const msg = `Claude API error for link extraction "${buyer.name}": ${
                err instanceof Error ? err.message : String(err)
              }`;
              console.error(msg);
              errorMessages.push(msg);
              // Continue with regex-only links
            }
          }

          // Merge with existing csvLinks from Stage 1
          const existingLinks = buyer.csvLinks ?? [];
          const mergedLinks = Array.from(
            new Set([...existingLinks, ...csvLinks])
          );

          // Filter: keep only valid download links
          const filteredLinks = mergedLinks.filter((link) => {
            try {
              const url = new URL(link);
              const path = url.pathname.toLowerCase();
              return (
                FILE_EXT_PATTERN.test(path) ||
                path.includes("download") ||
                path.includes("export")
              );
            } catch {
              return false;
            }
          });

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
