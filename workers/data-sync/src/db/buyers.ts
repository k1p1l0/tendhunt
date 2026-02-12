import type { Db, ObjectId } from "mongodb";
import type { MappedContract } from "../types";

/**
 * Auto-extract buyer records from contract data.
 *
 * Dedup strategy: uses a `nameLower` field (lowercased buyer name) with a
 * unique index as the upsert key. This prevents duplicates across batches
 * and concurrent invocations — unlike regex-based filters which don't work
 * reliably with MongoDB bulkWrite upserts.
 *
 * Groups contracts by lowercased name within the batch, then does one upsert
 * per unique name. The unique index on `nameLower` guarantees no duplicates
 * even across separate Worker invocations.
 *
 * Uses $setOnInsert for non-destructive upsert (won't overwrite enriched buyer data).
 * Uses $inc to increment contractCount on existing buyers.
 * Returns the number of newly created buyer records.
 */
export async function autoExtractBuyers(
  db: Db,
  contracts: MappedContract[]
): Promise<{ created: number; buyerIdMap: Map<string, ObjectId> }> {
  // Group by lowercased name to deduplicate within this batch
  const uniqueByName = new Map<
    string,
    { name: string; orgId: string; sector?: string; region?: string; count: number }
  >();

  for (const contract of contracts) {
    if (!contract.buyerName) continue;

    const nameKey = contract.buyerName.toLowerCase().trim();
    if (!nameKey) continue;

    const existing = uniqueByName.get(nameKey);
    if (existing) {
      existing.count++;
    } else {
      uniqueByName.set(nameKey, {
        name: contract.buyerName,
        orgId: contract.buyerOrg || "",
        sector: contract.sector,
        region: contract.buyerRegion ?? undefined,
        count: 1,
      });
    }
  }

  if (uniqueByName.size === 0) return { created: 0, buyerIdMap: new Map() };

  const collection = db.collection("buyers");

  // Ensure unique index on nameLower (idempotent — no-op if already exists)
  await collection.createIndex(
    { nameLower: 1 },
    { unique: true, sparse: true, name: "nameLower_1_unique" }
  );

  // Upsert by exact nameLower match — deterministic, index-backed, no duplicates
  const ops = Array.from(uniqueByName.entries()).map(([nameKey, buyer]) => ({
    updateOne: {
      filter: { nameLower: nameKey },
      update: {
        $setOnInsert: {
          name: buyer.name,
          nameLower: nameKey,
          orgId: buyer.orgId,
          sector: buyer.sector,
          region: buyer.region,
          contacts: [],
          createdAt: new Date(),
        },
        $inc: { contractCount: buyer.count },
        $set: { updatedAt: new Date() },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });

  // Fetch IDs for ALL buyers we just upserted/matched.
  // bulkWrite only returns upsertedIds for NEW docs, not matched/existing ones.
  // Most buyers will already exist, so we need the find() to get their IDs too.
  const allNameKeys = Array.from(uniqueByName.keys());
  const buyerDocs = await collection
    .find(
      { nameLower: { $in: allNameKeys } },
      { projection: { _id: 1, nameLower: 1 } }
    )
    .toArray();

  const buyerIdMap = new Map<string, ObjectId>();
  for (const doc of buyerDocs) {
    buyerIdMap.set(doc.nameLower as string, doc._id as ObjectId);
  }

  return { created: result.upsertedCount, buyerIdMap };
}
