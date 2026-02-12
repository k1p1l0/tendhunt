/**
 * Backfill script: sets buyerId on existing contracts by matching buyerName -> buyer nameLower.
 *
 * For contracts that don't yet have a buyerId field, looks up the buyer by
 * normalized name (toLowerCase().trim()) and sets the ObjectId reference.
 *
 * Processes in batches of 1000 contracts at a time.
 * Logs progress and summary (matched, unmatched, total).
 *
 * Usage: DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-buyer-ids.ts
 */
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";
import Contract from "../src/models/contract";
import type { Types } from "mongoose";

const BATCH_SIZE = 1000;

async function backfill() {
  await dbConnect();

  // Step 1: Load all buyers with nameLower into a Map<nameLower, _id>
  const buyers = await Buyer.find({ nameLower: { $exists: true } })
    .select("_id nameLower")
    .lean();

  const buyerMap = new Map<string, Types.ObjectId>();
  for (const b of buyers) {
    if (b.nameLower) {
      buyerMap.set(b.nameLower, b._id as Types.ObjectId);
    }
  }

  console.log(`Loaded ${buyerMap.size} buyers into lookup map`);

  // Step 2: Process contracts in batches that don't have buyerId yet
  let skip = 0;
  let totalProcessed = 0;
  let totalMatched = 0;
  let totalUnmatched = 0;

  while (true) {
    const contracts = await Contract.find({ buyerId: { $exists: false } })
      .select("_id buyerName")
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (contracts.length === 0) break;

    const ops: Array<{
      updateOne: {
        filter: { _id: unknown };
        update: { $set: { buyerId: Types.ObjectId } };
      };
    }> = [];

    let batchUnmatched = 0;

    for (const c of contracts) {
      const nameLower = (c as { buyerName?: string }).buyerName
        ?.toLowerCase()
        .trim();
      if (!nameLower) {
        batchUnmatched++;
        continue;
      }

      const buyerId = buyerMap.get(nameLower);
      if (buyerId) {
        ops.push({
          updateOne: {
            filter: { _id: c._id },
            update: { $set: { buyerId } },
          },
        });
      } else {
        batchUnmatched++;
      }
    }

    if (ops.length > 0) {
      const result = await Contract.bulkWrite(ops);
      totalMatched += result.modifiedCount;
    }

    totalUnmatched += batchUnmatched;
    totalProcessed += contracts.length;
    skip += BATCH_SIZE;

    console.log(
      `Batch: ${contracts.length} contracts, ${ops.length} matched, ${batchUnmatched} unmatched (total: ${totalProcessed})`
    );
  }

  console.log("\n--- Backfill Summary ---");
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total matched:   ${totalMatched}`);
  console.log(`Total unmatched: ${totalUnmatched}`);
  console.log(
    `Match rate:      ${totalProcessed > 0 ? ((totalMatched / totalProcessed) * 100).toFixed(1) : 0}%`
  );

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
