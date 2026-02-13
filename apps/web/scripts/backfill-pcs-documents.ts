/**
 * Backfill script: enriches Scottish contracts with PCS document download URLs.
 *
 * Finds contracts with submissionPortalUrl pointing to PCS that lack download URLs,
 * fetches matching releases from the PCS OCDS API, and updates contract documents[].
 *
 * Processes month-by-month to keep PCS API responses manageable.
 * Supports --resume-after-month=YYYY-MM for crash recovery.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-pcs-documents.ts
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-pcs-documents.ts --resume-after-month=2025-06
 */
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/mongodb";
import Contract from "../src/models/contract";

const PCS_API_BASE = "https://api.publiccontractsscotland.gov.uk/v1/Notices";
const PCS_PORTAL_PATTERN = /publiccontractsscotland\.gov\.uk/i;
const PCS_DOWNLOAD_PATTERN = /DownloadDocument\.aspx/i;
const REQUEST_DELAY_MS = 1500;

interface PcsRelease {
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
}

interface PcsReleasePackage {
  releases?: PcsRelease[];
}

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
    console.warn(`  PCS API returned ${res.status} for month ${monthParam}`);
    return [];
  }
  const data = (await res.json()) as PcsReleasePackage;
  return data.releases ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const resumeArg = process.argv.find((a) => a.startsWith("--resume-after-month="));
  const resumeMonth = resumeArg ? resumeArg.split("=")[1] : null;

  await dbConnect();
  console.log("Connected to MongoDB");

  // Find all PCS-linked contracts needing document URLs
  const query: Record<string, unknown> = {
    submissionPortalUrl: { $regex: PCS_PORTAL_PATTERN },
    $or: [
      { documents: { $size: 0 } },
      { documents: { $exists: false } },
      { "documents.url": { $not: { $regex: PCS_DOWNLOAD_PATTERN } } },
    ],
  };

  const totalCount = await Contract.countDocuments(query);
  console.log(`Found ${totalCount} PCS-linked contracts needing document URLs`);

  if (totalCount === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Get distinct months from candidate contracts
  const contracts = await Contract.find(query, {
    _id: 1,
    title: 1,
    publishedDate: 1,
    documents: 1,
  })
    .sort({ publishedDate: 1 })
    .lean();

  const monthMap = new Map<string, typeof contracts>();
  for (const c of contracts) {
    if (!c.publishedDate) continue;
    const d = new Date(c.publishedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(c);
  }

  const sortedMonths = [...monthMap.keys()].sort();
  console.log(`Processing ${sortedMonths.length} months of contracts`);

  let totalMatched = 0;
  let totalProcessed = 0;

  for (const monthKey of sortedMonths) {
    // Resume support
    if (resumeMonth && monthKey <= resumeMonth) {
      console.log(`  Skipping ${monthKey} (resuming after ${resumeMonth})`);
      continue;
    }

    const monthContracts = monthMap.get(monthKey)!;
    const monthDate = new Date(`${monthKey}-01`);
    const monthParam = formatMonthParam(monthDate);

    console.log(`\n--- Month ${monthKey}: ${monthContracts.length} contracts ---`);

    let pcsReleases: PcsRelease[];
    try {
      pcsReleases = await fetchPcsReleases(monthParam);
    } catch (err) {
      console.error(`  PCS API error for ${monthParam}:`, err);
      continue;
    }

    if (pcsReleases.length === 0) {
      console.log(`  No PCS releases for ${monthParam}`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    console.log(`  PCS releases: ${pcsReleases.length}`);

    // Build lookup by normalized title
    const pcsMap = new Map<string, PcsRelease>();
    for (const rel of pcsReleases) {
      const title = rel.tender?.title;
      if (!title) continue;
      pcsMap.set(normalizeTitle(title), rel);
    }

    let matched = 0;
    for (const contract of monthContracts) {
      const normalized = normalizeTitle(contract.title);
      const pcsRelease = pcsMap.get(normalized);
      if (!pcsRelease) continue;

      const pcsDocs = (pcsRelease.tender?.documents ?? [])
        .filter((d) => d.url && PCS_DOWNLOAD_PATTERN.test(d.url))
        .map((d) => ({
          id: d.id,
          documentType: d.documentType,
          title: d.title,
          description: d.description,
          url: d.url,
          datePublished: d.datePublished,
          format: d.format,
        }));

      if (pcsDocs.length === 0) continue;

      // Merge with existing docs
      const existingDocs: Array<Record<string, unknown>> = (contract.documents as Array<Record<string, unknown>>) ?? [];
      const existingUrlSet = new Set(
        existingDocs.filter((d) => d.url).map((d) => String(d.url))
      );
      const newDocs = pcsDocs.filter((d) => !existingUrlSet.has(d.url!));

      if (newDocs.length === 0) continue;

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

      await Contract.updateOne(
        { _id: contract._id },
        { $set: { documents: mergedDocs } }
      );

      matched++;
      totalMatched++;
    }

    totalProcessed += monthContracts.length;
    console.log(
      `  Matched: ${matched}/${monthContracts.length} | Running total: ${totalMatched} matched, ${totalProcessed} processed`
    );

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\n=== Backfill complete ===`);
  console.log(`Total matched: ${totalMatched}`);
  console.log(`Total processed: ${totalProcessed}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
