import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import Contract from "../src/models/contract";

async function verify() {
  await dbConnect();

  const buyer = await Buyer.findOne({
    name: /^Ministry of Defence$/i,
  }).lean();

  if (!buyer) {
    console.log("Buyer not found");
    return;
  }

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

  console.log("\n=== Ministry of Defence ===");
  console.log("Name:", buyer.name);
  console.log("Cached field:", buyer.contractCount);
  console.log("Live query:", liveCount);
  console.log("Children:", buyer.childBuyerIds?.length ?? 0);
  console.log("Match:", buyer.contractCount === liveCount ? "✓" : "✗");

  process.exit(0);
}

verify().catch(console.error);
