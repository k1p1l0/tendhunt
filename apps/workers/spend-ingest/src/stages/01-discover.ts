import type { Db } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import type { Env, SpendJobDoc } from "../types";
import { getBuyerBatchForDiscovery, updateBuyerTransparencyInfo } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";

// ---------------------------------------------------------------------------
// Stage 1: Discover transparency pages on buyer websites
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;

/**
 * Strip script, style, and noscript tags from HTML.
 * Keeps <a> tags with href attributes for link discovery.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

/**
 * Parse Claude's JSON response for transparency page discovery.
 */
function parseDiscoveryResponse(
  text: string
): { transparencyUrl: string | null; csvLinks: string[]; confidence: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    return {
      transparencyUrl: parsed.transparencyUrl ?? null,
      csvLinks: Array.isArray(parsed.csvLinks) ? parsed.csvLinks : [],
      confidence: parsed.confidence ?? "NONE",
    };
  } catch {
    return null;
  }
}

/**
 * Stage 1: Discover transparency pages on buyer websites.
 *
 * For each buyer with a website but no transparencyPageUrl, fetches the homepage,
 * sends the HTML to Claude Haiku to identify transparency/spending pages,
 * and stores the discovered URL and any direct CSV links.
 */
export async function discoverTransparencyPages(
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
  let discovered = 0;

  while (processed < maxItems) {
    const batch = await getBuyerBatchForDiscovery(db, currentCursor, BATCH_SIZE);

    if (batch.length === 0) {
      console.log(
        `Discover complete: ${discovered} transparency pages found out of ${processed} processed`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          const websiteUrl = buyer.website!;

          // Fetch the homepage
          let html: string;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetchWithDomainDelay(websiteUrl, {
              signal: controller.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (compatible; TendHunt/1.0; transparency-discovery)",
              },
            });
            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            html = await response.text();
          } catch (err) {
            // Network/timeout error — mark as "none" to skip in future
            console.warn(
              `Fetch failed for "${buyer.name}" (${websiteUrl}): ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            await updateBuyerTransparencyInfo(db, buyer._id!, {
              transparencyPageUrl: "none",
            });
            return { error: false, found: false };
          }

          // Strip scripts/styles, truncate to 12000 chars
          const strippedHtml = stripHtml(html).slice(0, 12000);

          // Call Claude Haiku for analysis
          try {
            const response = await anthropic.messages.create({
              model: "claude-haiku-4-5-20250401",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `You are analyzing a UK public sector website to find spending transparency data.

Organization: ${buyer.name}
Website: ${websiteUrl}
Organization type: ${buyer.orgType ?? "unknown"}

HTML content:
<html>${strippedHtml}</html>

Find links to:
1. "transparency", "spending", "payments over 500", "expenditure", "open data" pages
2. Direct CSV/Excel file download links containing spending/payment data
3. Links to external open data portals (data.gov.uk, etc.)

Look in navigation menus, footer links, and body content. UK councils typically have these under "Your Council" > "Transparency" or "About Us" > "Spending".

Return ONLY valid JSON (no markdown):
{
  "transparencyUrl": "full URL or null if not found",
  "csvLinks": ["array of direct CSV/XLS download URLs found, empty if none"],
  "confidence": "HIGH|MEDIUM|LOW|NONE"
}`,
                },
              ],
            });

            const responseText =
              response.content[0]?.type === "text"
                ? response.content[0].text
                : "";

            const parsed = parseDiscoveryResponse(responseText);

            if (!parsed || parsed.confidence === "NONE" || !parsed.transparencyUrl) {
              await updateBuyerTransparencyInfo(db, buyer._id!, {
                transparencyPageUrl: "none",
              });
              return { error: false, found: false };
            }

            // Resolve relative URL
            let resolvedUrl = parsed.transparencyUrl;
            try {
              resolvedUrl = new URL(parsed.transparencyUrl, websiteUrl).href;
            } catch {
              // Use as-is if URL resolution fails
            }

            // Filter valid CSV links
            const validCsvLinks = parsed.csvLinks
              .map((link) => {
                try {
                  return new URL(link, websiteUrl).href;
                } catch {
                  return null;
                }
              })
              .filter((link): link is string =>
                link !== null && (link.startsWith("http://") || link.startsWith("https://"))
              );

            await updateBuyerTransparencyInfo(db, buyer._id!, {
              transparencyPageUrl: resolvedUrl,
              csvLinks: validCsvLinks,
            });

            discovered++;
            return { error: false, found: true };
          } catch (err) {
            // Claude API error — skip buyer, don't mark as "none" (retryable)
            const msg = `Claude API error for "${buyer.name}": ${
              err instanceof Error ? err.message : String(err)
            }`;
            console.error(msg);
            errorMessages.push(msg);
            return { error: true, found: false };
          }
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
    `Discover paused (budget ${maxItems} reached): ${discovered} found out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
