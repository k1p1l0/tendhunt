import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { getFilteredBuyerBatch, bulkUpdateBuyerEnrichment } from "../db/buyers";
import { updateJobProgress } from "../db/enrichment-jobs";
import { callApifyActor } from "../api-clients/apify";

// ---------------------------------------------------------------------------
// Stage 1c: Logo + LinkedIn enrichment via harvestapi/linkedin-company
//
// Single Apify call per batch returns: linkedinUrl, website, logo, employeeCount
// Fallback: logo.dev CDN URL from domain, og:image from website
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
 * Stage 1c: Logo + LinkedIn Enrichment
 *
 * Uses harvestapi/linkedin-company Apify actor with `searches` param.
 * One API call per batch of buyer names returns:
 *   - linkedinUrl
 *   - website (if buyer didn't have one)
 *   - logo (LinkedIn profile logo)
 *   - employeeCount (bonus: update staffCount)
 *
 * Then applies logo.dev CDN as logo fallback for buyers with websites.
 *
 * Batch size: 10 (Apify actor searches 6 concurrently internally).
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
  let websitesFound = 0;

  // Smaller batch — each buyer name triggers a LinkedIn search
  const batchSize = Math.min(job.batchSize, 10);
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
        `Logo/LinkedIn enrichment complete: ${logosFound} logos, ${linkedInsFound} LinkedIns, ${websitesFound} websites out of ${processed} processed`
      );
      return { processed, errors, done: true };
    }

    const updates: Array<{
      buyerId: import("mongodb").ObjectId;
      fields: Record<string, unknown>;
    }> = [];
    const errorMessages: string[] = [];

    // --- Step A: Bulk LinkedIn lookup via harvestapi/linkedin-company ---
    if (hasApify) {
      try {
        // Build name-to-buyer map for matching results back
        const nameMap = new Map<string, BuyerDoc>();
        const searchNames: string[] = [];
        for (const buyer of batch) {
          if (!buyer.linkedinUrl) {
            searchNames.push(buyer.name);
            nameMap.set(buyer.name.toLowerCase(), buyer);
          }
        }

        if (searchNames.length > 0) {
          const results = await callApifyActor(
            "harvestapi/linkedin-company",
            { searches: searchNames },
            env.APIFY_API_TOKEN
          );

          for (const result of results as Record<string, unknown>[]) {
            const resultName = String(result.name || "").toLowerCase();
            const linkedinUrl = String(result.linkedinUrl || "");
            const logo = String(result.logo || "");
            const website = String(result.website || "");
            const employeeCount = result.employeeCount as number | undefined;

            // Match result back to buyer by name (case-insensitive)
            // Try exact match first, then fuzzy
            let buyer = nameMap.get(resultName);
            if (!buyer) {
              // Try matching against search names
              for (const [key, val] of nameMap.entries()) {
                if (resultName.includes(key) || key.includes(resultName)) {
                  buyer = val;
                  break;
                }
              }
            }

            if (!buyer) continue;

            const fields: Record<string, unknown> = {};

            if (linkedinUrl.includes("linkedin.com/")) {
              fields.linkedinUrl = linkedinUrl;
              linkedInsFound++;
            }

            if (logo.startsWith("http")) {
              fields.logoUrl = logo;
              logosFound++;
            }

            // Fill in website if buyer didn't have one
            if (!buyer.website && website.startsWith("http")) {
              fields.website = website;
              websitesFound++;
            }

            // Bonus: update staffCount from LinkedIn employeeCount
            if (employeeCount && !buyer.staffCount) {
              fields.staffCount = employeeCount;
            }

            // Top-level convenience fields from LinkedIn
            const desc = String(result.description || "");
            if (desc && !buyer.description) {
              fields.description = desc;
            }

            const locations = result.locations as Array<Record<string, unknown>> | undefined;
            const hqLocation = locations?.find((l) => l.headquarter);
            const locText = (hqLocation?.parsed as Record<string, unknown>)?.text;
            if (locText && typeof locText === "string") {
              fields.address = locText;
            }

            const industries = result.industries as Array<Record<string, unknown>> | undefined;
            const primaryIndustry = industries?.[0];
            // Industry can be a string or an object with a name field
            const industryName = typeof primaryIndustry === "string"
              ? primaryIndustry
              : (primaryIndustry as Record<string, unknown>)?.name as string | undefined;
            if (industryName) {
              fields.industry = industryName;
            }

            // Full LinkedIn subdocument
            fields.linkedin = {
              id: String(result.id || ""),
              universalName: String(result.universalName || ""),
              tagline: String(result.tagline || ""),
              companyType: String(result.companyType || ""),
              foundedYear: (result.foundedOn as Record<string, unknown>)?.year ?? null,
              followerCount: result.followerCount ?? null,
              employeeCountRange: result.employeeCountRange ?? null,
              specialities: result.specialities ?? [],
              industries: industries ?? [],
              locations: locations ?? [],
              logos: result.logos ?? [],
              backgroundCovers: result.backgroundCovers ?? [],
              phone: result.phone ?? null,
              fundingData: result.fundingData ?? null,
              lastFetchedAt: new Date(),
            };

            // Mark for enrichmentSources $addToSet (handled in bulk write)
            fields.__addLinkedinSource = true;

            if (Object.keys(fields).length > 0) {
              updates.push({ buyerId: buyer._id!, fields });
              // Remove from nameMap so we don't double-process
              nameMap.delete(resultName);
            }
          }
        }
      } catch (err) {
        errors++;
        const msg = `LinkedIn batch lookup failed: ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // --- Step B: logo.dev CDN fallback for buyers with website but no logo ---
    if (hasLogoDev) {
      // Find buyers in this batch that got a website but no logo yet
      const updatedBuyerIds = new Set(updates.map((u) => u.buyerId.toString()));

      for (const buyer of batch) {
        const buyerIdStr = buyer._id!.toString();
        const existingUpdate = updates.find(
          (u) => u.buyerId.toString() === buyerIdStr
        );

        // Skip if already has logo from LinkedIn
        if (existingUpdate?.fields.logoUrl) continue;

        // Need website to construct logo.dev URL
        const website =
          (existingUpdate?.fields.website as string) || buyer.website;
        if (!website) continue;

        const domain = extractDomain(website);
        if (!domain) continue;

        const logoUrl = buildLogoDevUrl(domain, env.LOGO_DEV_TOKEN);

        if (existingUpdate) {
          // Add logo to existing update
          existingUpdate.fields.logoUrl = logoUrl;
        } else if (!updatedBuyerIds.has(buyerIdStr)) {
          updates.push({
            buyerId: buyer._id!,
            fields: { logoUrl },
          });
        }
        logosFound++;
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
    `Logo/LinkedIn paused (budget ${maxItems} reached): ${logosFound} logos, ${linkedInsFound} LinkedIns, ${websitesFound} websites out of ${processed} processed`
  );
  return { processed, errors, done: false };
}
