/**
 * Backfill script: extracts rich procurement fields from rawData into top-level contract fields.
 *
 * Fields extracted: procurementMethod, procurementMethodDetails, submissionMethod,
 * submissionPortalUrl, buyerContact, documents[], lots[], lotCount, maxLotsBidPerSupplier.
 *
 * Uses cursor-based pagination (sorted by _id ascending) for efficiency on large collections.
 * Supports --resume-after=<objectId> for crash recovery.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-contract-rich-data.ts
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-contract-rich-data.ts --resume-after=65a1b2c3d4e5f6a7b8c9d0e1
 */
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/mongodb";
import Contract from "../src/models/contract";

const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Extraction helpers (mirrors apps/workers/data-sync/src/mappers/ocds-mapper.ts)
// ---------------------------------------------------------------------------

interface RawRelease {
  tender?: {
    procurementMethod?: string;
    procurementMethodDetails?: string;
    submissionMethod?: string[];
    submissionMethodDetails?: string;
    lotDetails?: { maximumLotsBidPerSupplier?: number };
    documents?: Array<{
      id?: string;
      documentType?: string;
      description?: string;
      url?: string;
      datePublished?: string;
      format?: string;
    }>;
    lots?: Array<{
      id?: string;
      title?: string;
      description?: string;
      status?: string;
      value?: { amount?: number; currency?: string };
      contractPeriod?: { durationInDays?: number };
      renewal?: { description?: string };
      options?: { description?: string };
      variants?: { policy?: string };
      submissionTerms?: { variantPolicy?: string };
      awardCriteria?: {
        criteria?: Array<{
          type?: string;
          description?: string;
          numbers?: Array<{ number?: number }>;
        }>;
      };
    }>;
  };
  parties?: Array<{
    roles?: string[];
    contactPoint?: { name?: string; email?: string; telephone?: string };
  }>;
}

interface ExtractedFields {
  procurementMethod: string | null;
  procurementMethodDetails: string | null;
  submissionMethod: string[];
  submissionPortalUrl: string | null;
  buyerContact: { name: string | null; email: string | null; telephone: string | null } | null;
  documents: Array<{
    id?: string;
    documentType?: string;
    description?: string;
    url?: string;
    datePublished?: string;
    format?: string;
  }>;
  lots: Array<{
    lotId: string;
    title: string | null;
    description: string | null;
    value: number | null;
    currency: string;
    contractPeriodDays: number | null;
    hasRenewal: boolean;
    renewalDescription: string | null;
    hasOptions: boolean;
    optionsDescription: string | null;
    variantPolicy: string | null;
    status: string | null;
    awardCriteria: Array<{ name: string; criteriaType: string; weight: number | null }>;
  }>;
  lotCount: number;
  maxLotsBidPerSupplier: number | null;
}

function extractRichFields(rawData: unknown): ExtractedFields | null {
  if (!rawData || typeof rawData !== "object") return null;
  const release = rawData as RawRelease;
  const tender = release.tender;

  const buyerParty = release.parties?.find((p) =>
    p.roles?.some((r) => r.toLowerCase() === "buyer")
  );
  const cp = buyerParty?.contactPoint;
  const buyerContact =
    cp && (cp.name || cp.email || cp.telephone)
      ? { name: cp.name ?? null, email: cp.email ?? null, telephone: cp.telephone ?? null }
      : null;

  const documents = (tender?.documents ?? []).map((d) => ({
    id: d.id ?? undefined,
    documentType: d.documentType ?? undefined,
    description: d.description ?? undefined,
    url: d.url ?? undefined,
    datePublished: d.datePublished ?? undefined,
    format: d.format ?? undefined,
  }));

  const lots = (tender?.lots ?? []).map((lot) => {
    const criteria: Array<{ name: string; criteriaType: string; weight: number | null }> = [];
    const rawCriteria = lot.awardCriteria?.criteria;
    if (rawCriteria && Array.isArray(rawCriteria)) {
      for (const c of rawCriteria) {
        const weight = c.numbers?.[0]?.number ?? null;
        criteria.push({
          name: c.description ?? c.type ?? "Unknown",
          criteriaType: c.type ?? "unknown",
          weight: weight != null && isFinite(weight) ? weight : null,
        });
      }
    }

    const variantPolicy =
      lot.submissionTerms?.variantPolicy ?? lot.variants?.policy ?? null;

    return {
      lotId: lot.id ?? "",
      title: lot.title ?? null,
      description: lot.description ?? null,
      value: lot.value?.amount ?? null,
      currency: lot.value?.currency ?? "GBP",
      contractPeriodDays: lot.contractPeriod?.durationInDays ?? null,
      hasRenewal: lot.renewal?.description != null,
      renewalDescription: lot.renewal?.description ?? null,
      hasOptions: lot.options?.description != null,
      optionsDescription: lot.options?.description ?? null,
      variantPolicy,
      status: lot.status ?? null,
      awardCriteria: criteria,
    };
  });

  const maxLotsBid = tender?.lotDetails?.maximumLotsBidPerSupplier;

  return {
    procurementMethod: tender?.procurementMethod ?? null,
    procurementMethodDetails: tender?.procurementMethodDetails ?? null,
    submissionMethod: tender?.submissionMethod ?? [],
    submissionPortalUrl: tender?.submissionMethodDetails ?? null,
    buyerContact,
    documents,
    lots,
    lotCount: lots.length,
    maxLotsBidPerSupplier:
      maxLotsBid != null && isFinite(maxLotsBid) ? maxLotsBid : null,
  };
}

// ---------------------------------------------------------------------------
// Main backfill
// ---------------------------------------------------------------------------

async function backfill() {
  await dbConnect();

  const resumeArg = process.argv.find((a) => a.startsWith("--resume-after="));
  let lastId: mongoose.Types.ObjectId | null = null;
  if (resumeArg) {
    const id = resumeArg.split("=")[1];
    lastId = new mongoose.Types.ObjectId(id);
    console.log(`Resuming after _id: ${lastId}`);
  }

  let totalProcessed = 0;
  let totalWithLots = 0;
  let totalWithDocs = 0;
  let totalWithContact = 0;

  while (true) {
    const filter: Record<string, unknown> = {
      rawData: { $exists: true, $ne: null },
    };
    if (lastId) {
      filter._id = { $gt: lastId };
    }

    const contracts = await Contract.find(filter)
      .select("_id rawData")
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (contracts.length === 0) break;

    const ops: Array<{
      updateOne: {
        filter: { _id: unknown };
        update: { $set: Record<string, unknown> };
      };
    }> = [];

    let batchLots = 0;
    let batchDocs = 0;
    let batchContacts = 0;

    for (const c of contracts) {
      const fields = extractRichFields(c.rawData);
      if (!fields) continue;

      ops.push({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: fields },
        },
      });

      if (fields.lotCount > 0) batchLots++;
      if (fields.documents.length > 0) batchDocs++;
      if (fields.buyerContact) batchContacts++;
    }

    if (ops.length > 0) {
      await Contract.bulkWrite(ops);
    }

    totalProcessed += contracts.length;
    totalWithLots += batchLots;
    totalWithDocs += batchDocs;
    totalWithContact += batchContacts;
    lastId = contracts[contracts.length - 1]._id as mongoose.Types.ObjectId;

    console.log(
      `Batch: ${contracts.length} contracts | lots: ${batchLots} | docs: ${batchDocs} | contacts: ${batchContacts} | total: ${totalProcessed} | last: ${lastId}`
    );
  }

  console.log("\n--- Backfill Summary ---");
  console.log(`Total processed:    ${totalProcessed}`);
  console.log(`With lots:          ${totalWithLots}`);
  console.log(`With documents:     ${totalWithDocs}`);
  console.log(`With buyer contact: ${totalWithContact}`);

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
