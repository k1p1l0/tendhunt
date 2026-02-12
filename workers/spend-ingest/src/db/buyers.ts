import { ObjectId, type Db } from "mongodb";
import type { BuyerDoc } from "../types";

const COLLECTION = "buyers";

/**
 * Fetch a batch of buyers with a website (not null/empty), sorted by _id,
 * starting after the given cursor. Used for cursor-based pagination.
 */
export async function getBuyerBatch(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {
    website: { $nin: [null, ""] },
  };
  if (cursor) {
    filter._id = { $gt: new ObjectId(cursor) };
  }

  return collection
    .find(filter)
    .sort({ _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Update a buyer with spend-related fields.
 */
export async function updateBuyerSpendFields(
  db: Db,
  buyerId: ObjectId,
  fields: {
    transparencyPageUrl?: string;
    spendDataAvailable?: boolean;
    lastSpendIngestAt?: Date;
  }
): Promise<void> {
  const collection = db.collection<BuyerDoc>(COLLECTION);
  await collection.updateOne(
    { _id: buyerId },
    {
      $set: {
        ...fields,
        updatedAt: new Date(),
      },
    }
  );
}
