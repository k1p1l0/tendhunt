import { ObjectId, type Db } from "mongodb";
import type { BuyerDoc } from "../types";

const COLLECTION = "buyers";

/**
 * Fetch a batch of buyers sorted by _id, starting after the given cursor.
 * Used for cursor-based pagination across Worker invocations.
 */
export async function getBuyerBatch(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {};
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
 * Fetch a filtered batch of buyers sorted by _id, starting after the given cursor.
 * Allows stages to only query buyers matching specific criteria (e.g. missing fields).
 */
export async function getFilteredBuyerBatch(
  db: Db,
  cursor: string | null,
  batchSize: number,
  extraFilter: Record<string, unknown>
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = { ...extraFilter };
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
 * Update a single buyer with enrichment fields.
 */
export async function updateBuyerEnrichment(
  db: Db,
  buyerId: ObjectId,
  fields: Record<string, unknown>
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

/**
 * Bulk update multiple buyers with enrichment fields.
 * Each update is { buyerId, fields } where fields is the $set payload.
 */
export async function bulkUpdateBuyerEnrichment(
  db: Db,
  updates: Array<{ buyerId: ObjectId; fields: Record<string, unknown> }>
): Promise<number> {
  if (updates.length === 0) return 0;

  const collection = db.collection<BuyerDoc>(COLLECTION);

  const ops = updates.map((u) => ({
    updateOne: {
      filter: { _id: u.buyerId },
      update: {
        $set: {
          ...u.fields,
          updatedAt: new Date(),
        },
      },
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });
  return result.modifiedCount;
}
