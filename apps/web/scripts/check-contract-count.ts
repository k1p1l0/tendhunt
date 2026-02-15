import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import Contract from "../src/models/contract";

async function checkContractCount() {
  await dbConnect();

  const buyer = await Buyer.findOne({
    name: /Central Bedfordshire Council/i,
  }).lean();

  if (!buyer) {
    console.log("Buyer not found");
    return;
  }

  console.log("\n=== Buyer Data ===");
  console.log("Name:", buyer.name);
  console.log("Cached contractCount field:", buyer.contractCount);
  console.log("Has children:", buyer.childBuyerIds?.length ?? 0);

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
  console.log("\n=== Live Query ===");
  console.log("Actual contract count (live query):", liveCount);

  // Breakdown by source
  const byBuyerId = await Contract.countDocuments({
    buyerId: { $in: allBuyerIds },
  });
  const byName = await Contract.countDocuments({
    buyerName: new RegExp(
      `^${buyer.name!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    ),
  });

  console.log("\n=== Breakdown ===");
  console.log("By buyerId:", byBuyerId);
  console.log("By buyerName:", byName);
  console.log("Total (with dedup):", liveCount);

  process.exit(0);
}

checkContractCount().catch(console.error);
