import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, EnrichmentJobDoc } from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";

// ---------------------------------------------------------------------------
// ProActis / ProContract Advert Attachment Scraper
//
// Many UK contracts point to ProActis (procontract.due-north.com) advert pages.
// These pages are publicly accessible and some contain downloadable attachments
// at /FileUploads/ViewAttachment URLs. This stage:
//   1. Finds contracts with ProActis advert URLs in their documents
//   2. Fetches the public advert HTML page
//   3. Parses attachment links from the HTML
//   4. Updates contract documents[] with discovered attachment URLs
// ---------------------------------------------------------------------------

const PROACTIS_ADVERT_PATTERN = /procontract\.due-north\.com\/.*Advert/i;
const ATTACHMENT_URL_REGEX =
  /\/FileUploads\/ViewAttachment\?attachmentId=[^"'\s]+/gi;
const PROACTIS_HOST_PATTERN = /procontract\.due-north\.com/i;

interface ContractForEnrichment {
  _id: ObjectId;
  title: string;
  documents: Array<{
    id?: string;
    documentType?: string;
    title?: string;
    description?: string;
    url?: string;
    datePublished?: string;
    format?: string;
  }>;
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function extractAttachmentUrls(
  html: string,
  baseUrl: string
): Array<{ url: string; title: string }> {
  const matches = html.matchAll(ATTACHMENT_URL_REGEX);
  const seen = new Set<string>();
  const results: Array<{ url: string; title: string }> = [];

  const base = new URL(baseUrl);

  for (const match of matches) {
    let rawUrl = match[0];
    // Decode HTML entities
    rawUrl = rawUrl
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const fullUrl = new URL(rawUrl, base.origin).toString();

    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);

    // Try to extract a title from the surrounding HTML
    const idx = html.indexOf(match[0]);
    const surrounding = html.slice(Math.max(0, idx - 300), idx + match[0].length + 200);

    // Prefer link text (filename) over title attribute (often generic "Open attachment")
    const linkTextMatch = surrounding.match(/>([^<]{3,80})<\/a>/);
    const titleAttrMatch = surrounding.match(/title="([^"]+)"/);
    const altMatch = surrounding.match(/alt="([^"]+)"/);

    const linkText = linkTextMatch?.[1]?.trim();
    const titleAttr = titleAttrMatch?.[1]?.trim();
    const altText = altMatch?.[1]?.trim();

    const rawTitle =
      (linkText && linkText !== "Open attachment" ? linkText : null) ??
      (titleAttr && titleAttr !== "Open attachment" ? titleAttr : null) ??
      altText ??
      linkText ??
      "Attachment";

    results.push({ url: fullUrl, title: stripHtmlTags(rawTitle) });
  }

  return results;
}

function guessFormat(url: string, title?: string): string | undefined {
  const lower = `${url} ${title ?? ""}`.toLowerCase();
  if (lower.includes(".pdf")) return "application/pdf";
  if (lower.includes(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.includes(".doc")) return "application/msword";
  if (lower.includes(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.includes(".xls")) return "application/vnd.ms-excel";
  if (lower.includes(".zip")) return "application/zip";
  return undefined;
}

export async function enrichProactisDocuments(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const contracts = db.collection<ContractForEnrichment>("contracts");

  // Find contracts with ProActis advert URLs that haven't been enriched
  // Use $and to avoid key collision (both conditions reference "documents.url")
  const query: Record<string, unknown> = {
    $and: [
      {
        $or: [
          { "documents.url": { $regex: PROACTIS_ADVERT_PATTERN } },
          { submissionPortalUrl: { $regex: PROACTIS_ADVERT_PATTERN } },
        ],
      },
      // Exclude already-enriched: contracts that already have ViewAttachment URLs
      { "documents.url": { $not: { $regex: /ViewAttachment/i } } },
    ],
  };

  // Resume from cursor (last processed contract _id)
  if (job.cursor) {
    try {
      query._id = { $gt: new ObjectId(job.cursor) };
    } catch {
      console.warn(`Invalid cursor ObjectId: ${job.cursor}, starting from beginning`);
    }
  }

  const candidateDocs = await contracts
    .find(query, {
      projection: {
        _id: 1,
        title: 1,
        documents: 1,
        submissionPortalUrl: 1,
      },
    })
    .sort({ _id: 1 })
    .limit(maxItems)
    .toArray();

  if (candidateDocs.length === 0) {
    return { processed: job.totalProcessed, errors: job.totalErrors, done: true };
  }

  console.log(`ProActis docs: found ${candidateDocs.length} contracts to check`);

  let processed = job.totalProcessed;
  let errors = job.totalErrors;
  const errorMessages: string[] = [];

  for (const contract of candidateDocs) {
    try {
      // Find the ProActis advert URL from documents or submissionPortalUrl
      let advertUrl: string | null = null;

      for (const doc of contract.documents ?? []) {
        if (doc.url && PROACTIS_ADVERT_PATTERN.test(doc.url)) {
          advertUrl = doc.url;
          break;
        }
      }

      if (!advertUrl) {
        const portal = (contract as unknown as { submissionPortalUrl?: string }).submissionPortalUrl;
        if (portal && PROACTIS_ADVERT_PATTERN.test(portal)) {
          advertUrl = portal;
        }
      }

      if (!advertUrl) {
        processed++;
        continue;
      }

      // Fetch the advert page
      let html: string;
      try {
        const res = await fetchWithDomainDelay(advertUrl);
        if (!res.ok) {
          console.warn(`ProActis ${res.status} for ${advertUrl}`);
          processed++;
          continue;
        }
        html = await res.text();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`ProActis fetch error for ${advertUrl}: ${msg}`);
        errorMessages.push(`Fetch ${contract._id}: ${msg}`);
        errors++;
        processed++;
        continue;
      }

      // Extract attachment URLs
      const attachments = extractAttachmentUrls(html, advertUrl);
      if (attachments.length === 0) {
        processed++;
        continue;
      }

      // Build new document entries for discovered attachments
      const existingDocs = contract.documents ?? [];
      const existingUrlSet = new Set(existingDocs.filter((d) => d.url).map((d) => d.url));

      const newDocs = attachments
        .filter((a) => !existingUrlSet.has(a.url))
        .map((a) => ({
          id: undefined,
          documentType: "biddingDocuments" as const,
          title: a.title,
          description: undefined,
          url: a.url,
          datePublished: undefined,
          format: guessFormat(a.url, a.title),
        }));

      if (newDocs.length === 0) {
        processed++;
        continue;
      }

      await contracts.updateOne(
        { _id: contract._id },
        {
          $set: {
            documents: [...existingDocs, ...newDocs],
            updatedAt: new Date(),
          },
        }
      );

      console.log(`ProActis: added ${newDocs.length} attachments to contract ${contract._id}`);
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`ProActis error for contract ${contract._id}: ${msg}`);
      errorMessages.push(`Contract ${contract._id}: ${msg}`);
      errors++;
    }

    // Save progress after each contract
    if (processed % 50 === 0) {
      await updateJobProgress(db, job._id!, {
        cursor: String(contract._id),
        totalProcessed: processed,
        totalErrors: errors,
        errorMessages: errorMessages.splice(0),
      });
    }
  }

  // Final progress save
  const lastContract = candidateDocs[candidateDocs.length - 1];
  await updateJobProgress(db, job._id!, {
    cursor: String(lastContract._id),
    totalProcessed: processed,
    totalErrors: errors,
    errorMessages: errorMessages.splice(0),
  });

  // If we got fewer than maxItems, we're done
  const done = candidateDocs.length < maxItems;
  return { processed, errors, done };
}
