import type { Db, BulkWriteResult } from "mongodb";
import type { MappedContract } from "../types";

/**
 * Upsert contracts using bulkWrite with {source, noticeId} compound key.
 * Matches the existing Mongoose compound unique index in src/models/contract.ts.
 * Uses ordered:false so individual document errors don't kill the batch.
 */
export async function upsertContracts(
  db: Db,
  contracts: MappedContract[]
): Promise<BulkWriteResult> {
  if (contracts.length === 0) {
    return {
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
      ok: 1,
    } as unknown as BulkWriteResult;
  }

  const collection = db.collection("contracts");
  const ops = contracts.map((doc) => ({
    updateOne: {
      filter: { source: doc.source, noticeId: doc.noticeId },
      update: {
        $set: { ...doc, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  return collection.bulkWrite(ops, { ordered: false });
}
