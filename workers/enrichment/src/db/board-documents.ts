import { ObjectId, type Db } from "mongodb";
import type { BoardDocumentDoc } from "../types";

const COLLECTION = "boarddocuments";

/**
 * Bulk upsert board documents using compound key { buyerId, sourceUrl }.
 * Updates existing documents if the same buyer + sourceUrl combination already exists.
 * Returns the number of upserted/modified documents.
 */
export async function upsertBoardDocuments(
  db: Db,
  docs: Array<Partial<BoardDocumentDoc> & { buyerId: ObjectId; sourceUrl: string }>
): Promise<number> {
  if (docs.length === 0) return 0;

  const collection = db.collection<BoardDocumentDoc>(COLLECTION);

  const now = new Date();
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { buyerId: doc.buyerId, sourceUrl: doc.sourceUrl },
      update: {
        $set: {
          ...doc,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

/**
 * Count board documents for a specific buyer.
 */
export async function getBoardDocumentCount(
  db: Db,
  buyerId: ObjectId
): Promise<number> {
  const collection = db.collection<BoardDocumentDoc>(COLLECTION);
  return collection.countDocuments({ buyerId });
}

/**
 * Fetch board documents for a buyer, sorted by meetingDate descending.
 */
export async function getBoardDocuments(
  db: Db,
  buyerId: ObjectId,
  limit: number = 50
): Promise<BoardDocumentDoc[]> {
  const collection = db.collection<BoardDocumentDoc>(COLLECTION);
  return collection
    .find({ buyerId })
    .sort({ meetingDate: -1 })
    .limit(limit)
    .toArray();
}
