import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set");
  process.exit(1);
}

// Keyword detection functions (mirrored from worker mapper)
function mapContractType(
  category?: string
): "goods" | "services" | "works" | null {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c === "goods") return "goods";
  if (c === "services") return "services";
  if (c === "works") return "works";
  return null;
}

function detectSmeEligibility(
  eligibility?: string,
  description?: string
): boolean | null {
  const text = `${eligibility ?? ""} ${description ?? ""}`.toLowerCase();
  if (/not\s+(suitable|eligible)\s+(for\s+)?sme/i.test(text)) return false;
  if (/\bsme\b|small\s*(and|&)?\s*medium|small\s+business/i.test(text))
    return true;
  return null;
}

function detectVcoEligibility(
  eligibility?: string,
  description?: string
): boolean | null {
  const text = `${eligibility ?? ""} ${description ?? ""}`.toLowerCase();
  if (/\bvcse\b|\bvco\b|voluntary|community\s+organisation|social\s+enterprise|charit(y|ies|able)/i.test(text))
    return true;
  return null;
}

function detectEuFunding(description?: string): boolean {
  const text = (description ?? "").toLowerCase();
  return /\beu\s+fund|\beuropean\s+fund|\bhorizon\b|\berasmus\b|\blife\s+programme\b|\besf\b|\berdf\b|\beu\s+grant/i.test(
    text
  );
}

interface RawLot {
  hasRenewal?: boolean;
  renewal?: { description?: string };
}

interface RawAward {
  date?: string;
  value?: { amount?: number };
  suppliers?: Array<{ id?: string; name?: string }>;
}

interface RawRelease {
  tender?: {
    mainProcurementCategory?: string;
    eligibilityCriteria?: string;
    description?: string;
    tenderPeriod?: { startDate?: string };
    enquiryPeriod?: { endDate?: string };
    lots?: RawLot[];
  };
  awards?: RawAward[];
  parties?: Array<{
    roles?: string[];
    address?: { region?: string };
  }>;
}

async function main() {
  const dryRun = !process.argv.includes("--write");
  const limit = parseInt(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "500",
    10
  );

  console.log(
    `Backfill contract enrichment fields (${dryRun ? "DRY RUN" : "WRITE MODE"}, limit=${limit})`
  );

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const col = db.collection("contracts");

  const total = await col.countDocuments({
    contractType: { $exists: false },
  });
  console.log(`Found ${total} contracts without contractType`);

  const cursor = col
    .find({ contractType: { $exists: false } })
    .project({
      rawData: 1,
      source: 1,
    })
    .limit(limit);

  let processed = 0;
  let enriched = 0;
  let skipped = 0;
  const ops: { updateOne: { filter: object; update: object } }[] = [];

  for await (const doc of cursor) {
    processed++;
    const raw = doc.rawData as RawRelease | null;
    if (!raw) {
      skipped++;
      continue;
    }

    const contractType = mapContractType(
      raw.tender?.mainProcurementCategory
    );
    const desc = raw.tender?.description ?? "";
    const elig = raw.tender?.eligibilityCriteria ?? "";
    const suitableForSme = detectSmeEligibility(elig, desc);
    const suitableForVco = detectVcoEligibility(elig, desc);
    const hasEuFunding = detectEuFunding(desc);

    let canRenew = false;
    let renewalDescription: string | null = null;
    for (const lot of raw.tender?.lots ?? []) {
      if (lot.hasRenewal) {
        canRenew = true;
        renewalDescription = lot.renewal?.description ?? null;
        break;
      }
    }

    const awardedSuppliers: { name: string; supplierId: string | null }[] = [];
    let awardDate: Date | null = null;
    let awardValue: number | null = null;
    for (const award of raw.awards ?? []) {
      if (award.date && !awardDate) awardDate = new Date(award.date);
      if (award.value?.amount != null && awardValue == null)
        awardValue = award.value.amount;
      for (const s of award.suppliers ?? []) {
        if (s.name) {
          awardedSuppliers.push({ name: s.name, supplierId: s.id ?? null });
        }
      }
    }

    const tenderPeriodStart = raw.tender?.tenderPeriod?.startDate
      ? new Date(raw.tender.tenderPeriod.startDate)
      : null;
    const enquiryPeriodEnd = raw.tender?.enquiryPeriod?.endDate
      ? new Date(raw.tender.enquiryPeriod.endDate)
      : null;

    const buyerParty = raw.parties?.find((p) =>
      p.roles?.some((r) => r.toLowerCase() === "buyer")
    );
    const geographicScope = buyerParty?.address?.region ?? null;

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            contractType,
            suitableForSme,
            suitableForVco,
            hasEuFunding,
            canRenew,
            renewalDescription,
            geographicScope,
            awardedSuppliers,
            awardDate,
            awardValue,
            tenderPeriodStart,
            enquiryPeriodEnd,
          },
        },
      },
    });
    enriched++;

    if (processed % 1000 === 0) {
      console.log(`  processed ${processed}...`);
    }
  }

  console.log(
    `\nResults: processed=${processed}, enriched=${enriched}, skipped=${skipped}`
  );

  if (!dryRun && ops.length > 0) {
    console.log(`Writing ${ops.length} updates...`);
    const batchSize = 500;
    for (let i = 0; i < ops.length; i += batchSize) {
      const batch = ops.slice(i, i + batchSize);
      const result = await col.bulkWrite(batch, { ordered: false });
      console.log(
        `  batch ${Math.floor(i / batchSize) + 1}: modified=${result.modifiedCount}`
      );
    }
    console.log("Done!");
  } else if (dryRun) {
    // Show sample of what would be written
    const sample = ops.slice(0, 3);
    for (const op of sample) {
      const update = op.updateOne.update as { $set: Record<string, unknown> };
      console.log(`\nSample update:`, JSON.stringify(update.$set, null, 2));
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
