import type { Db } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";

import type { Env, SpendJobDoc } from "../types";
import { getBuyerBatchForDiscovery, updateBuyerTransparencyInfo } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";
import { getPatternsForOrgType, getGovukDeptPaths } from "../patterns/transparency-urls";
import { validateTransparencyUrl } from "../patterns/url-validator";
import { extractNavAndFooter, extractMainContent, containsSpendKeywords } from "../patterns/html-extractor";
import { scoreLink } from "../patterns/csv-patterns";
import { decodeHtmlEntities } from "../patterns/html-extractor";

// ---------------------------------------------------------------------------
// Stage 1: Discover transparency pages — pattern-first, AI fallback
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;

// Common abbreviations for UK government departments (slug → full name patterns)
const DEPT_ABBREVIATION_MAP: Record<string, string[]> = {
  "ministry of defence": ["mod", "ministry-of-defence", "defence"],
  "hm revenue": ["hmrc", "hm-revenue", "revenue-customs"],
  "hm treasury": ["hmt", "hm-treasury", "treasury"],
  "home office": ["home-office"],
  "ministry of justice": ["moj", "ministry-of-justice", "justice"],
  "department for education": ["dfe", "department-for-education", "education"],
  "department of health": ["dhsc", "department-of-health", "health-social-care"],
  "department for transport": ["dft", "department-for-transport", "transport"],
  "department for work": ["dwp", "department-for-work", "work-pensions"],
  "department for environment": ["defra", "department-for-environment", "environment-food"],
  "department for business": ["dbt", "department-for-business", "business-trade"],
  "department for science": ["dsit", "department-for-science", "science-innovation"],
  "department for levelling up": ["dluhc", "department-for-levelling", "levelling-up"],
  "department for digital": ["dcms", "department-for-digital", "digital-culture"],
  "foreign commonwealth": ["fcdo", "foreign-commonwealth"],
  "cabinet office": ["cabinet-office"],
  "hm courts": ["hmcts", "hm-courts", "courts-tribunals"],
  "crown prosecution": ["cps", "crown-prosecution"],
  "nhs england": ["nhs-england", "nhse"],
};

/**
 * Filter GOV.UK collection page links to the current buyer's department.
 * Collection pages list ALL departments, so we filter to only keep
 * links relevant to this buyer.
 */
function filterLinksToBuyer(links: string[], buyerName: string): string[] {
  const nameLower = buyerName.toLowerCase();

  // Build keywords from buyer name
  const keywords: string[] = [];

  // Slugified full name parts
  const slug = nameLower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  keywords.push(slug);

  // Individual significant words (skip short/common ones)
  const skipWords = new Set(["the", "of", "and", "for", "in", "hm", "her", "his", "majesty"]);
  for (const word of nameLower.split(/\s+/)) {
    if (word.length > 2 && !skipWords.has(word)) {
      keywords.push(word);
    }
  }

  // Add known abbreviations
  for (const [pattern, abbrs] of Object.entries(DEPT_ABBREVIATION_MAP)) {
    if (nameLower.includes(pattern)) {
      keywords.push(...abbrs);
      break;
    }
  }

  const filtered = links.filter((url) => {
    const urlLower = url.toLowerCase();
    return keywords.some((kw) => urlLower.includes(kw));
  });

  // Fallback: if nothing matched, return all links (buyer name might not appear in URLs)
  if (filtered.length === 0) return links;
  return filtered;
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
 * Extract CSV links from HTML using all patterns. Reused when pattern
 * discovery already fetched the transparency page HTML.
 */
function extractCsvLinksFromHtml(html: string, baseUrl: string): string[] {
  const decoded = decodeHtmlEntities(html);
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(decoded)) !== null) {
    const href = match[1];
    const scored = scoreLink(href);
    if (scored) {
      try {
        const resolved = new URL(href, baseUrl).href;
        if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
          links.push(resolved);
        }
      } catch {
        // skip invalid URL
      }
    }
  }

  return [...new Set(links)];
}

/**
 * Stage 1: Discover transparency pages on buyer websites.
 *
 * New flow per buyer:
 * 1. Look up patterns for buyer.orgType
 * 2. PATTERN PHASE: probe known URL paths, validate with spend keywords
 * 3. AI FALLBACK: if no pattern matched, fetch homepage + Claude Haiku
 * 4. Store result with discoveryMethod tag
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
  let patternMatches = 0;
  let aiMatches = 0;

  while (processed < maxItems) {
    const batch = await getBuyerBatchForDiscovery(db, currentCursor, BATCH_SIZE);

    if (batch.length === 0) {
      console.log(
        `Discover complete: ${discovered} found (${patternMatches} pattern, ${aiMatches} AI) out of ${processed} processed`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          const websiteUrl = buyer.website!;

          // ---------------------------------------------------------------
          // GOV.UK DEPT-SPECIFIC: try department publication page first
          // ---------------------------------------------------------------
          const deptPaths = getGovukDeptPaths(buyer.name);
          if (deptPaths.length > 0) {
            for (const path of deptPaths) {
              let candidateUrl: string;
              try {
                candidateUrl = new URL(path, "https://www.gov.uk").href;
              } catch {
                continue;
              }

              const result = await validateTransparencyUrl(candidateUrl);
              if (result.valid && result.html) {
                const csvLinks = extractCsvLinksFromHtml(
                  result.html,
                  candidateUrl
                );

                await updateBuyerTransparencyInfo(db, buyer._id!, {
                  transparencyPageUrl: candidateUrl,
                  csvLinks: csvLinks.length > 0 ? csvLinks : undefined,
                  discoveryMethod: "pattern_match",
                });

                discovered++;
                patternMatches++;
                return { error: false, found: true };
              }
            }
          }

          // ---------------------------------------------------------------
          // PATTERN PHASE: probe known URL paths for this org type
          // ---------------------------------------------------------------
          const patterns = getPatternsForOrgType(buyer.orgType);

          if (patterns.length > 0) {
            // Sort by priority (lower = first)
            const sorted = [...patterns].sort((a, b) => a.priority - b.priority);

            for (const pattern of sorted) {
              for (const path of pattern.paths) {
                let candidateUrl: string;
                try {
                  candidateUrl = new URL(path, websiteUrl).href;
                } catch {
                  continue;
                }

                const result = await validateTransparencyUrl(candidateUrl);
                if (result.valid && result.html) {
                  // Extract CSV links from the validated page
                  let csvLinks = extractCsvLinksFromHtml(
                    result.html,
                    candidateUrl
                  );

                  // Filter GOV.UK collection links to this buyer's department
                  if (candidateUrl.includes("gov.uk/government/")) {
                    csvLinks = filterLinksToBuyer(csvLinks, buyer.name);
                  }

                  await updateBuyerTransparencyInfo(db, buyer._id!, {
                    transparencyPageUrl: candidateUrl,
                    csvLinks: csvLinks.length > 0 ? csvLinks : undefined,
                    discoveryMethod: "pattern_match",
                  });

                  discovered++;
                  patternMatches++;
                  return { error: false, found: true };
                }
              }
            }
          }

          // ---------------------------------------------------------------
          // AI FALLBACK: fetch homepage, extract nav/footer, ask Claude
          // ---------------------------------------------------------------
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
            console.warn(
              `Fetch failed for "${buyer.name}" (${websiteUrl}): ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            await updateBuyerTransparencyInfo(db, buyer._id!, {
              transparencyPageUrl: "none",
              discoveryMethod: "none",
            });
            return { error: false, found: false };
          }

          // Smart content extraction: try nav/footer first, fall back to main content
          const navFooterHtml = extractNavAndFooter(html, 15000);
          const hasSpendInNav = containsSpendKeywords(navFooterHtml);
          const hasSpendInBody = containsSpendKeywords(html);

          let extractedHtml: string;
          if (hasSpendInNav) {
            extractedHtml = navFooterHtml;
          } else if (hasSpendInBody) {
            // Nav/footer missed it — use main content extraction
            const mainContent = extractMainContent(html, 20000);
            extractedHtml = navFooterHtml.slice(0, 10000) + "\n<!-- main content -->\n" + mainContent;
            extractedHtml = extractedHtml.slice(0, 30000);
          } else {
            // No keywords anywhere — still try with combined content
            const mainContent = extractMainContent(html, 15000);
            extractedHtml = navFooterHtml.slice(0, 10000) + "\n" + mainContent;
            extractedHtml = extractedHtml.slice(0, 30000);
          }

          try {
            const response = await anthropic.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `You are analyzing a UK public sector website to find their spending/transparency data page.

Organization: ${buyer.name}
Website: ${websiteUrl}
Organization type: ${buyer.orgType ?? "unknown"}

HTML content (navigation + main body):
<html>${extractedHtml}</html>

Find links to pages about:
1. Spending data, transparency reports, payments over £500/£25,000
2. "Publication scheme", "What we spend", "Financial transparency"
3. Direct CSV/Excel file download links for spending/payment data
4. External open data portals (data.gov.uk, etc.)

IMPORTANT: UK public sector sites often use deep CMS paths like:
- /about-the-council/finance-and-budget/spending
- /your-council/budgets-and-spending
- /about-us/freedom-of-information/spending-over-25000
- /council-and-mayor/council-spending-and-performance
- /performance-and-spending/our-financial-plans

Look for ANY link containing words like: spending, transparency, payments, expenditure, invoices, financial, budget, procurement, open data.

Return ONLY valid JSON (no markdown):
{
  "transparencyUrl": "full URL to spending/transparency page, or null if not found",
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
                discoveryMethod: "none",
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
              discoveryMethod: "ai_discovery",
            });

            discovered++;
            aiMatches++;
            return { error: false, found: true };
          } catch (err) {
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
    `Discover paused (budget ${maxItems} reached): ${discovered} found (${patternMatches} pattern, ${aiMatches} AI) out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
