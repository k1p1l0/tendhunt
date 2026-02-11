import type { Db } from "mongodb";
import type { MappedContract } from "../types";

/**
 * Generate a stable orgId from buyer name.
 * Lowercase, replace spaces with hyphens, strip non-alphanumeric.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Auto-extract buyer records from contract data.
 * Uses $setOnInsert for non-destructive upsert (won't overwrite enriched buyer data).
 * Uses $inc to increment contractCount on existing buyers.
 * Returns the number of newly created buyer records.
 */
export async function autoExtractBuyers(
  db: Db,
  contracts: MappedContract[]
): Promise<number> {
  const uniqueBuyers = new Map<
    string,
    { name: string; orgId: string; sector?: string; region?: string }
  >();

  for (const contract of contracts) {
    const orgId = contract.buyerOrg || `auto-${slugify(contract.buyerName)}`;
    if (!orgId || orgId === "auto-") continue;

    if (!uniqueBuyers.has(orgId)) {
      uniqueBuyers.set(orgId, {
        name: contract.buyerName,
        orgId,
        sector: contract.sector,
        region: contract.buyerRegion ?? undefined,
      });
    }
  }

  if (uniqueBuyers.size === 0) return 0;

  const collection = db.collection("buyers");
  const ops = Array.from(uniqueBuyers.values()).map((buyer) => ({
    updateOne: {
      filter: { orgId: buyer.orgId },
      update: {
        $setOnInsert: {
          name: buyer.name,
          orgId: buyer.orgId,
          sector: buyer.sector,
          region: buyer.region,
          contacts: [],
          createdAt: new Date(),
        },
        $inc: { contractCount: 1 },
        $set: { updatedAt: new Date() },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });
  return result.upsertedCount;
}
