import type { Db, ObjectId } from "mongodb";
import type { Env, EnrichmentJobDoc } from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";

// ---------------------------------------------------------------------------
// PCS (Public Contracts Scotland) Document Enrichment
//
// Scottish contracts are dual-published on FaT and PCS. FaT provides metadata
// but no document download URLs. PCS has a free OCDS API where document URLs
// (DownloadDocument.aspx) are publicly accessible. This stage:
//   1. Finds contracts pointing to PCS with no download URLs
//   2. Fetches PCS OCDS releases month-by-month
//   3. Matches by normalized title
//   4. Updates contract documents[] with real download URLs
// ---------------------------------------------------------------------------

interface PcsRelease {
  ocid?: string;
  id?: string;
  date?: string;
  tender?: {
    title?: string;
    documents?: Array<{
      id?: string;
      documentType?: string;
      title?: string;
      description?: string;
      url?: string;
      datePublished?: string;
      format?: string;
    }>;
  };
  parties?: Array<{
    name?: string;
    roles?: string[];
  }>;
}

interface PcsReleasePackage {
  releases?: PcsRelease[];
}

interface ContractForEnrichment {
  _id: ObjectId;
  title: string;
  publishedDate: Date | null;
  submissionPortalUrl: string | null;
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

const PCS_API_BASE = "https://api.publiccontractsscotland.gov.uk/v1/Notices";
const PCS_PORTAL_PATTERN = /publiccontractsscotland\.gov\.uk/i;
const PCS_DOWNLOAD_PATTERN = /DownloadDocument\.aspx/i;
const REQUEST_DELAY_MS = 1500;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMonthParam(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}-${y}`;
}

async function fetchPcsReleases(monthParam: string): Promise<PcsRelease[]> {
  const url = `${PCS_API_BASE}?dateFrom=${monthParam}&noticeType=2&outputType=0`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`PCS API returned ${res.status} for month ${monthParam}`);
    return [];
  }
  const data = (await res.json()) as PcsReleasePackage;
  return data.releases ?? [];
}

function extractPcsDocumentsWithUrls(
  release: PcsRelease
): Array<{
  id?: string;
  documentType?: string;
  title?: string;
  description?: string;
  url: string;
  datePublished?: string;
  format?: string;
}> {
  const docs = release.tender?.documents;
  if (!docs || !Array.isArray(docs)) return [];
  return docs
    .filter((d) => d.url && PCS_DOWNLOAD_PATTERN.test(d.url))
    .map((d) => ({
      id: d.id ?? undefined,
      documentType: d.documentType ?? undefined,
      title: d.title ?? undefined,
      description: d.description ?? undefined,
      url: d.url!,
      datePublished: d.datePublished ?? undefined,
      format: d.format ?? undefined,
    }));
}

function getDistinctMonths(contracts: ContractForEnrichment[]): Date[] {
  const monthSet = new Set<string>();
  const months: Date[] = [];

  for (const c of contracts) {
    if (!c.publishedDate) continue;
    const d = new Date(c.publishedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthSet.has(key)) {
      monthSet.add(key);
      months.push(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  months.sort((a, b) => a.getTime() - b.getTime());
  return months;
}

export async function enrichPcsDocuments(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const contracts = db.collection<ContractForEnrichment>("contracts");

  // Find contracts pointing to PCS without download URLs
  const query: Record<string, unknown> = {
    submissionPortalUrl: { $regex: PCS_PORTAL_PATTERN },
    $or: [
      { documents: { $size: 0 } },
      { documents: { $exists: false } },
      {
        "documents.url": {
          $not: { $regex: PCS_DOWNLOAD_PATTERN },
        },
      },
    ],
  };

  // Resume from cursor (lastProcessedMonth)
  if (job.cursor) {
    const [year, month] = job.cursor.split("-").map(Number);
    query.publishedDate = { $gt: new Date(year, month - 1, 28) };
  }

  const candidateDocs = await contracts
    .find(query, {
      projection: {
        _id: 1,
        title: 1,
        publishedDate: 1,
        submissionPortalUrl: 1,
        documents: 1,
      },
    })
    .sort({ publishedDate: 1 })
    .limit(maxItems)
    .toArray();

  if (candidateDocs.length === 0) {
    return { processed: job.totalProcessed, errors: job.totalErrors, done: true };
  }

  console.log(`PCS docs: found ${candidateDocs.length} contracts needing document URLs`);

  const months = getDistinctMonths(candidateDocs);
  let processed = job.totalProcessed;
  let errors = job.totalErrors;
  const errorMessages: string[] = [];

  for (const monthDate of months) {
    const monthParam = formatMonthParam(monthDate);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    console.log(`PCS docs: fetching releases for ${monthParam}`);

    let pcsReleases: PcsRelease[];
    try {
      pcsReleases = await fetchPcsReleases(monthParam);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`PCS API error for ${monthParam}: ${msg}`);
      errorMessages.push(`PCS API ${monthParam}: ${msg}`);
      errors++;
      continue;
    }

    if (pcsReleases.length === 0) {
      console.log(`PCS docs: no releases for ${monthParam}`);
      await updateJobProgress(db, job._id!, {
        cursor: monthKey,
        totalProcessed: processed,
        totalErrors: errors,
        errorMessages: errorMessages.splice(0),
      });
      continue;
    }

    // Build a lookup map: normalized title -> PCS release
    const pcsMap = new Map<string, PcsRelease>();
    for (const rel of pcsReleases) {
      const title = rel.tender?.title;
      if (!title) continue;
      pcsMap.set(normalizeTitle(title), rel);
    }

    // Match contracts in this month
    const monthContracts = candidateDocs.filter((c) => {
      if (!c.publishedDate) return false;
      const d = new Date(c.publishedDate);
      return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
    });

    let matched = 0;
    for (const contract of monthContracts) {
      try {
        const normalized = normalizeTitle(contract.title);
        const pcsRelease = pcsMap.get(normalized);

        if (!pcsRelease) continue;

        const pcsDocsWithUrls = extractPcsDocumentsWithUrls(pcsRelease);
        if (pcsDocsWithUrls.length === 0) continue;

        // Merge: keep existing metadata-only docs, add PCS docs with URLs
        const existingDocs = contract.documents ?? [];
        const existingUrlSet = new Set(existingDocs.filter((d) => d.url).map((d) => d.url));
        const newDocs = pcsDocsWithUrls.filter((d) => !existingUrlSet.has(d.url));

        if (newDocs.length === 0) continue;

        // Replace metadata-only docs that match by documentType with PCS versions
        const mergedDocs = [...existingDocs];
        for (const newDoc of newDocs) {
          const existingIdx = mergedDocs.findIndex(
            (d) => !d.url && d.documentType === newDoc.documentType
          );
          if (existingIdx >= 0) {
            mergedDocs[existingIdx] = newDoc;
          } else {
            mergedDocs.push(newDoc);
          }
        }

        await contracts.updateOne(
          { _id: contract._id },
          {
            $set: {
              documents: mergedDocs,
              updatedAt: new Date(),
            },
          }
        );

        matched++;
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`PCS match error for contract ${contract._id}: ${msg}`);
        errorMessages.push(`Contract ${contract._id}: ${msg}`);
        errors++;
      }
    }

    console.log(
      `PCS docs: ${monthParam} — ${pcsReleases.length} PCS releases, ${monthContracts.length} candidates, ${matched} matched`
    );

    await updateJobProgress(db, job._id!, {
      cursor: monthKey,
      totalProcessed: processed,
      totalErrors: errors,
      errorMessages: errorMessages.splice(0),
    });

    // Rate limit between months
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  return { processed, errors, done: true };
}
