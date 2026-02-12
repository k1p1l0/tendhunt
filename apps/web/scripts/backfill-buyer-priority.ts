/**
 * Backfill script: sets enrichmentPriority on existing buyers based on DataSource tier.
 *
 * - Buyers matched to Tier 0 DataSource → enrichmentPriority: 1
 * - Buyers matched to Tier 1 DataSource → enrichmentPriority: 0
 * - Unmatched buyers (no dataSourceId)  → enrichmentPriority: 0
 *
 * Also creates a compound index { enrichmentPriority: -1, _id: 1 } for efficient
 * sorted queries in both enrichment and spend-ingest workers.
 *
 * Usage: DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-buyer-priority.ts
 */
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import DataSource from "../src/models/data-source";

import type { Types } from "mongoose";

async function backfill() {
  await dbConnect();

  // Step 1: Load all DataSource entries into a tier lookup map
  const dataSources = await DataSource.find({}).select("_id tier").lean();
  const tierMap = new Map<string, number>();
  for (const ds of dataSources) {
    tierMap.set((ds._id as Types.ObjectId).toString(), ds.tier ?? 1);
  }
  console.log(`Loaded ${tierMap.size} DataSource entries`);

  // Step 2: Set enrichmentPriority for buyers WITH a dataSourceId
  const matchedBuyers = await Buyer.find({ dataSourceId: { $exists: true, $ne: null } })
    .select("_id dataSourceId")
    .lean();

  let tier0Count = 0;
  let tier1Count = 0;
  const bulkOps: Array<{
    updateOne: {
      filter: { _id: Types.ObjectId };
      update: { $set: { enrichmentPriority: number } };
    };
  }> = [];

  for (const buyer of matchedBuyers) {
    const dsId = (buyer.dataSourceId as Types.ObjectId).toString();
    const tier = tierMap.get(dsId) ?? 1;
    const priority = tier === 0 ? 1 : 0;

    if (priority === 1) tier0Count++;
    else tier1Count++;

    bulkOps.push({
      updateOne: {
        filter: { _id: buyer._id as Types.ObjectId },
        update: { $set: { enrichmentPriority: priority } },
      },
    });
  }

  if (bulkOps.length > 0) {
    const result = await Buyer.bulkWrite(bulkOps, { ordered: false });
    console.log(`Updated ${result.modifiedCount} matched buyers (${tier0Count} Tier 0 → priority 1, ${tier1Count} Tier 1 → priority 0)`);
  }

  // Step 3: Set enrichmentPriority: 0 for unmatched buyers (no dataSourceId)
  const unmatchedResult = await Buyer.updateMany(
    {
      $or: [
        { dataSourceId: { $exists: false } },
        { dataSourceId: null },
      ],
      enrichmentPriority: { $exists: false },
    },
    { $set: { enrichmentPriority: 0 } }
  );
  console.log(`Set priority 0 on ${unmatchedResult.modifiedCount} unmatched buyers`);

  // Step 4: Create compound index for priority-sorted queries
  const collection = Buyer.collection;
  await collection.createIndex(
    { enrichmentPriority: -1, _id: 1 },
    { name: "enrichmentPriority_id", background: true }
  );
  console.log("Created compound index { enrichmentPriority: -1, _id: 1 }");

  // Summary
  const total = await Buyer.countDocuments();
  const withPriority = await Buyer.countDocuments({ enrichmentPriority: { $exists: true } });
  const highPriority = await Buyer.countDocuments({ enrichmentPriority: { $gte: 1 } });
  console.log(`\nSummary: ${total} total buyers, ${withPriority} with priority field, ${highPriority} high-priority (Tier 0)`);
}

backfill()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
