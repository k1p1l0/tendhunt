import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import Contract from "../src/models/contract";

/**
 * Fixes all buyers' cached contractCount fields to match live database queries.
 * This ensures the cached field stays in sync with actual contract data.
 */
async function fixAllContractCounts() {
  await dbConnect();

  console.log("Starting contract count fix for all buyers...\n");

  // Get all buyers
  const buyers = await Buyer.find({}).select("_id name childBuyerIds").lean();
  console.log(`Found ${buyers.length} buyers to process\n`);

  let updatedCount = 0;
  let unchangedCount = 0;
  const discrepancies: Array<{
    name: string;
    cached: number;
    live: number;
    diff: number;
  }> = [];

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 100;
  for (let i = 0; i < buyers.length; i += BATCH_SIZE) {
    const batch = buyers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (buyer) => {
        // Build contract filter (same logic as fetchBuyerById)
        const allBuyerIds = [buyer._id, ...(buyer.childBuyerIds ?? [])];
        const contractFilter = {
          $or: [
            { buyerId: { $in: allBuyerIds } },
            ...(buyer.name
              ? [
                  {
                    buyerName: new RegExp(
                      `^${buyer.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                      "i"
                    ),
                  },
                ]
              : []),
          ],
        };

        const liveCount = await Contract.countDocuments(contractFilter);

        // Get current cached count
        const fullBuyer = await Buyer.findById(buyer._id)
          .select("contractCount")
          .lean();
        const cachedCount = fullBuyer?.contractCount ?? 0;

        if (cachedCount !== liveCount) {
          // Update the buyer document
          await Buyer.updateOne(
            { _id: buyer._id },
            { $set: { contractCount: liveCount } }
          );

          discrepancies.push({
            name: buyer.name ?? "Unknown",
            cached: cachedCount,
            live: liveCount,
            diff: liveCount - cachedCount,
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      })
    );

    console.log(
      `Processed ${Math.min(
        i + BATCH_SIZE,
        buyers.length
      )}/${buyers.length} buyers...`
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Total buyers: ${buyers.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Unchanged: ${unchangedCount}`);

  if (discrepancies.length > 0) {
    console.log("\n=== Top 20 Discrepancies ===");
    discrepancies
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 20)
      .forEach((d) => {
        console.log(
          `${d.name}: ${d.cached} → ${d.live} (${d.diff > 0 ? "+" : ""}${
            d.diff
          })`
        );
      });
  }

  console.log("\n✅ Contract count fix complete!");
  process.exit(0);
}

fixAllContractCounts().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
