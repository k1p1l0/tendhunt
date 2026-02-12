import { ObjectId, type Db } from "mongodb";
import type { KeyPersonnelDoc } from "../types";

const COLLECTION = "keypersonnel";

/**
 * Bulk upsert key personnel using compound key { buyerId, name }.
 * Updates existing records if the same buyer + name combination already exists.
 * Returns the number of upserted/modified documents.
 */
export async function upsertKeyPersonnel(
  db: Db,
  personnel: Array<Partial<KeyPersonnelDoc> & { buyerId: ObjectId; name: string }>
): Promise<number> {
  if (personnel.length === 0) return 0;

  const collection = db.collection<KeyPersonnelDoc>(COLLECTION);

  const now = new Date();
  const ops = personnel.map((doc) => ({
    updateOne: {
      filter: { buyerId: doc.buyerId, name: doc.name },
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
 * Count key personnel for a specific buyer.
 */
export async function getKeyPersonnelCount(
  db: Db,
  buyerId: ObjectId
): Promise<number> {
  const collection = db.collection<KeyPersonnelDoc>(COLLECTION);
  return collection.countDocuments({ buyerId });
}

/**
 * Fetch key personnel for a buyer, sorted by role priority then confidence.
 *
 * Role priority: chief_executive > cfo > finance_director > director >
 * procurement_lead > chair > board_member > committee_chair > councillor
 */
export async function getKeyPersonnel(
  db: Db,
  buyerId: ObjectId,
  limit: number = 50
): Promise<KeyPersonnelDoc[]> {
  const collection = db.collection<KeyPersonnelDoc>(COLLECTION);

  // Role priority mapping (lower number = higher priority)
  const ROLE_PRIORITY: Record<string, number> = {
    chief_executive: 1,
    cfo: 2,
    finance_director: 3,
    director: 4,
    procurement_lead: 5,
    chair: 6,
    board_member: 7,
    committee_chair: 8,
    councillor: 9,
  };

  // Fetch all and sort in-memory (MongoDB doesn't support custom enum sorting natively)
  const docs = await collection
    .find({ buyerId })
    .sort({ confidence: -1 })
    .limit(limit * 2) // Over-fetch to allow re-sorting
    .toArray();

  // Sort by role priority, then confidence desc
  docs.sort((a, b) => {
    const aPriority = ROLE_PRIORITY[a.role ?? ""] ?? 99;
    const bPriority = ROLE_PRIORITY[b.role ?? ""] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return docs.slice(0, limit);
}
