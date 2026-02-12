/**
 * Buyer deduplication script.
 *
 * Groups buyers by lowercased name, merges duplicates into one canonical record,
 * remaps BoardDocument/KeyPersonnel references, and deletes non-canonical duplicates.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/dedup-buyers.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/dedup-buyers.ts --commit
 */
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import BoardDocument from "../src/models/board-document";
import KeyPersonnel from "../src/models/key-personnel";

const DRY_RUN = !process.argv.includes("--commit");

interface BuyerRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  orgId?: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  address?: string;
  industry?: string;
  contractCount?: number;
  contacts?: Array<Record<string, unknown>>;
  orgType?: string;
  orgSubType?: string;
  dataSourceId?: mongoose.Types.ObjectId;
  democracyPortalUrl?: string;
  democracyPlatform?: string;
  boardPapersUrl?: string;
  staffCount?: number;
  annualBudget?: number;
  enrichmentScore?: number;
  logoUrl?: string;
  linkedinUrl?: string;
  linkedin?: Record<string, unknown>;
  enrichmentSources?: string[];
  lastEnrichedAt?: Date;
  enrichmentVersion?: number;
  vibeScore?: number;
  vibeReasoning?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Score a buyer record for "canonical-ness".
 * Higher is better: prefer records with more enrichment data.
 */
function canonicalScore(b: BuyerRecord): number {
  let score = 0;
  if (b.dataSourceId) score += 100;
  if (b.orgType) score += 50;
  if (b.linkedin) score += 40;
  if (b.linkedinUrl) score += 30;
  if (b.logoUrl) score += 20;
  if (b.enrichmentScore && b.enrichmentScore > 0) score += 15;
  if (b.description) score += 10;
  if (b.website) score += 10;
  score += (b.contractCount ?? 0);
  // Prefer older records (established earlier)
  if (b.createdAt) score += 1;
  return score;
}

/**
 * Merge fields from duplicate into canonical.
 * Takes the first non-null value for scalar fields.
 * Sums contractCount. Merges arrays with dedup.
 */
function mergeInto(canonical: BuyerRecord, dup: BuyerRecord): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  // Scalar fields — take first non-null
  const scalarFields: (keyof BuyerRecord)[] = [
    "sector", "region", "website", "description", "address", "industry",
    "orgType", "orgSubType", "dataSourceId",
    "democracyPortalUrl", "democracyPlatform", "boardPapersUrl",
    "staffCount", "annualBudget", "enrichmentScore",
    "logoUrl", "linkedinUrl", "linkedin",
    "vibeScore", "vibeReasoning",
    "lastEnrichedAt", "enrichmentVersion",
  ];

  for (const field of scalarFields) {
    if (canonical[field] == null && dup[field] != null) {
      updates[field] = dup[field];
    }
  }

  // Sum contractCount
  const totalCount = (canonical.contractCount ?? 0) + (dup.contractCount ?? 0);
  if (totalCount !== (canonical.contractCount ?? 0)) {
    updates.contractCount = totalCount;
  }

  // Merge contacts (dedup by email)
  const canonicalEmails = new Set(
    (canonical.contacts ?? []).map((c) => c.email).filter(Boolean)
  );
  const newContacts = (dup.contacts ?? []).filter(
    (c) => c.email && !canonicalEmails.has(c.email)
  );
  if (newContacts.length > 0) {
    updates.contacts = [...(canonical.contacts ?? []), ...newContacts];
  }

  // Merge enrichmentSources
  const canonicalSources = new Set(canonical.enrichmentSources ?? []);
  const dupSources = dup.enrichmentSources ?? [];
  const newSources = dupSources.filter((s) => !canonicalSources.has(s));
  if (newSources.length > 0) {
    updates.enrichmentSources = [
      ...(canonical.enrichmentSources ?? []),
      ...newSources,
    ];
  }

  return updates;
}

async function main() {
  console.log(`\nBuyer Deduplication Script${DRY_RUN ? " (DRY RUN)" : " (COMMIT MODE)"}\n`);
  console.log("═".repeat(60));

  await dbConnect();

  // Step 0: Clear any existing nameLower values to avoid unique index conflicts during dedup
  if (!DRY_RUN) {
    console.log("Clearing existing nameLower values...");
    const clearResult = await Buyer.updateMany(
      { nameLower: { $exists: true } },
      { $unset: { nameLower: "" } }
    );
    console.log(`  Cleared ${clearResult.modifiedCount} records\n`);
  }

  // Step 1: Find all duplicate groups
  const pipeline = [
    {
      $group: {
        _id: { $toLower: "$name" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 as const } },
  ];

  const duplicateGroups = await Buyer.aggregate(pipeline);

  const totalBuyers = await Buyer.estimatedDocumentCount();
  const totalDuplicateRecords = duplicateGroups.reduce(
    (sum: number, g: { count: number }) => sum + g.count,
    0
  );
  const recordsToRemove = duplicateGroups.reduce(
    (sum: number, g: { count: number }) => sum + (g.count - 1),
    0
  );

  console.log(`Total buyers:          ${totalBuyers}`);
  console.log(`Duplicate groups:      ${duplicateGroups.length}`);
  console.log(`Records in dup groups: ${totalDuplicateRecords}`);
  console.log(`Records to remove:     ${recordsToRemove}`);
  console.log(`Expected after dedup:  ${totalBuyers - recordsToRemove}`);
  console.log("═".repeat(60));

  if (duplicateGroups.length === 0) {
    console.log("\nNo duplicates found. Proceeding to nameLower backfill...");
  }

  // Show top 10 examples
  console.log("\nTop 10 duplicate groups:");
  for (const g of duplicateGroups.slice(0, 10)) {
    console.log(`  ${g._id}: ${g.count} records`);
  }

  let mergedCount = 0;
  let deletedCount = 0;
  let boardDocsRemapped = 0;
  let personnelRemapped = 0;

  for (const group of duplicateGroups) {
    // Fetch full records for this group
    const records = (await Buyer.find({ _id: { $in: group.ids } }).lean()) as BuyerRecord[];
    if (records.length < 2) continue;

    // Sort by canonical score descending — first is canonical
    records.sort((a, b) => canonicalScore(b) - canonicalScore(a));
    const canonical = records[0];
    const duplicates = records.slice(1);

    // Merge fields from all duplicates into canonical
    const mergedUpdates: Record<string, unknown> = {};
    for (const dup of duplicates) {
      const updates = mergeInto(
        { ...canonical, ...mergedUpdates } as BuyerRecord,
        dup
      );
      Object.assign(mergedUpdates, updates);
    }

    const dupIds = duplicates.map((d) => d._id);

    if (DRY_RUN) {
      mergedCount++;
      deletedCount += dupIds.length;
    } else {
      // Remap BoardDocument references BEFORE deleting duplicates
      const boardResult = await BoardDocument.updateMany(
        { buyerId: { $in: dupIds } },
        { $set: { buyerId: canonical._id } }
      );
      boardDocsRemapped += boardResult.modifiedCount;

      // Remap KeyPersonnel references
      const personnelResult = await KeyPersonnel.updateMany(
        { buyerId: { $in: dupIds } },
        { $set: { buyerId: canonical._id } }
      );
      personnelRemapped += personnelResult.modifiedCount;

      // Delete duplicates FIRST (frees up the nameLower unique slot)
      const deleteResult = await Buyer.deleteMany({ _id: { $in: dupIds } });
      deletedCount += deleteResult.deletedCount;

      // Now safely set nameLower + merged fields on canonical
      const nameLower = canonical.name.toLowerCase().trim();
      await Buyer.updateOne(
        { _id: canonical._id },
        { $set: { ...mergedUpdates, nameLower, updatedAt: new Date() } }
      );
      mergedCount++;
    }
  }

  // Backfill nameLower on all remaining buyers (after dedup so no unique conflicts)
  // Use individual updates to gracefully handle any remaining name collisions
  console.log("\nBackfilling nameLower on remaining buyers...");
  if (!DRY_RUN) {
    const buyersWithoutNameLower = await Buyer.find(
      { nameLower: { $exists: false } },
      { _id: 1, name: 1, contractCount: 1, createdAt: 1 }
    ).lean() as Array<{ _id: unknown; name: string; contractCount?: number; createdAt?: Date }>;

    let backfilled = 0;
    const collisions: string[] = [];

    // Group by lowercased name to detect remaining collisions
    const byNameLower = new Map<string, Array<typeof buyersWithoutNameLower[0]>>();
    for (const b of buyersWithoutNameLower) {
      const nl = b.name.toLowerCase().trim();
      const arr = byNameLower.get(nl) ?? [];
      arr.push(b);
      byNameLower.set(nl, arr);
    }

    for (const [nl, records] of byNameLower) {
      if (records.length > 1) {
        // Collision — pick the one with highest contractCount, delete the rest
        records.sort((a, b) => (b.contractCount ?? 0) - (a.contractCount ?? 0));
        const keep = records[0];
        const remove = records.slice(1);
        const removeIds = remove.map((r) => r._id);
        await Buyer.deleteMany({ _id: { $in: removeIds } });
        await Buyer.updateOne(
          { _id: keep._id },
          { $set: { nameLower: nl } }
        );
        backfilled++;
        deletedCount += removeIds.length;
        collisions.push(`${nl} (${records.length} → 1)`);
      } else {
        await Buyer.updateOne(
          { _id: records[0]._id },
          { $set: { nameLower: nl } }
        );
        backfilled++;
      }
    }

    console.log(`  Backfilled ${backfilled} buyers`);
    if (collisions.length > 0) {
      console.log(`  Resolved ${collisions.length} additional collisions during backfill:`);
      for (const c of collisions.slice(0, 10)) {
        console.log(`    ${c}`);
      }
      if (collisions.length > 10) {
        console.log(`    ... and ${collisions.length - 10} more`);
      }
    }
  } else {
    const missingCount = await Buyer.countDocuments({ nameLower: { $exists: false } });
    console.log(`  Would backfill ${missingCount} buyers`);
  }

  console.log("\n" + "═".repeat(60));
  console.log(`Groups merged:            ${mergedCount}`);
  console.log(`Duplicate records deleted: ${deletedCount}`);
  if (!DRY_RUN) {
    console.log(`BoardDocs remapped:       ${boardDocsRemapped}`);
    console.log(`KeyPersonnel remapped:    ${personnelRemapped}`);
    const finalCount = await Buyer.estimatedDocumentCount();
    console.log(`Final buyer count:        ${finalCount}`);
  }
  console.log("═".repeat(60));

  if (DRY_RUN) {
    console.log("\nThis was a DRY RUN. No changes were made.");
    console.log("Run with --commit to apply changes.");
  } else {
    console.log("\nDeduplication complete.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
