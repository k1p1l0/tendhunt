/**
 * Backfill script: copies `website` from DataSource to already-classified buyers.
 *
 * For buyers that have a `dataSourceId` but no `website`, looks up the DataSource
 * and copies the website URL over. Also copies `region` if missing.
 *
 * Usage: DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-buyer-websites.ts
 */
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import DataSource from "../src/models/data-source";

async function backfill() {
  await dbConnect();

  // Find all buyers with a dataSourceId but no website
  const buyers = await Buyer.find({
    dataSourceId: { $exists: true, $ne: null },
    $or: [{ website: null }, { website: { $exists: false } }, { website: "" }],
  })
    .select("_id name dataSourceId")
    .lean();

  console.log(`Found ${buyers.length} buyers with dataSourceId but no website`);

  if (buyers.length === 0) {
    console.log("Nothing to backfill");
    process.exit(0);
  }

  // Load all DataSources into a map for fast lookup
  const dataSources = await DataSource.find({}).lean();
  const dsMap = new Map<string, (typeof dataSources)[0]>();
  for (const ds of dataSources) {
    dsMap.set(ds._id.toString(), ds);
  }

  // Build bulk operations
  const ops: Array<{
    updateOne: {
      filter: { _id: unknown };
      update: { $set: Record<string, unknown> };
    };
  }> = [];

  let websiteCount = 0;
  const regionCount = 0;

  for (const buyer of buyers) {
    const ds = dsMap.get(buyer.dataSourceId?.toString() ?? "");
    if (!ds) continue;

    const $set: Record<string, unknown> = {};

    if (ds.website) {
      $set.website = ds.website;
      websiteCount++;
    }

    if (Object.keys($set).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: buyer._id },
          update: { $set },
        },
      });
    }
  }

  console.log(`Prepared ${ops.length} updates (${websiteCount} websites)`);

  if (ops.length > 0) {
    const result = await Buyer.bulkWrite(ops);
    console.log(`Modified ${result.modifiedCount} buyers`);
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
