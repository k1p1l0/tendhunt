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
    .sort({ enrichmentPriority: -1, _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Fetch buyers with a website but no transparencyPageUrl yet.
 * Used by Stage 1 (discover) to find buyers needing transparency page discovery.
 */
export async function getBuyerBatchForDiscovery(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {
    website: { $ne: null, $exists: true },
    transparencyPageUrl: { $exists: false },
  };
  if (cursor) {
    filter._id = { $gt: new ObjectId(cursor) };
  }

  return collection
    .find(filter)
    .sort({ enrichmentPriority: -1, _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Fetch buyers with a transparency page URL (not "none") that haven't
 * had CSV links fully extracted yet.
 * Used by Stage 2 (extract_links).
 */
export async function getBuyerBatchForLinkExtraction(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {
    transparencyPageUrl: { $exists: true, $ne: "none", $nin: [null, ""] },
    csvLinksExtracted: { $ne: true },
  };
  if (cursor) {
    filter._id = { $gt: new ObjectId(cursor) };
  }

  return collection
    .find(filter)
    .sort({ enrichmentPriority: -1, _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Fetch buyers that have CSV links and haven't been fully ingested yet.
 * Used by Stage 3 (download_parse).
 */
export async function getBuyerBatchForDownload(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {
    csvLinks: { $exists: true, $not: { $size: 0 } },
    spendDataIngested: { $ne: true },
  };
  if (cursor) {
    filter._id = { $gt: new ObjectId(cursor) };
  }

  return collection
    .find(filter)
    .sort({ enrichmentPriority: -1, _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Fetch buyers that have spend data ingested but need aggregation.
 * Used by Stage 4 (aggregate).
 */
export async function getBuyerBatchForAggregation(
  db: Db,
  cursor: string | null,
  batchSize: number
): Promise<BuyerDoc[]> {
  const collection = db.collection<BuyerDoc>(COLLECTION);

  const filter: Record<string, unknown> = {
    spendDataIngested: true,
    spendDataAvailable: { $ne: true },
  };
  if (cursor) {
    filter._id = { $gt: new ObjectId(cursor) };
  }

  return collection
    .find(filter)
    .sort({ enrichmentPriority: -1, _id: 1 })
    .limit(batchSize)
    .toArray();
}

/**
 * Update a buyer with transparency page info from Stage 1.
 */
export async function updateBuyerTransparencyInfo(
  db: Db,
  buyerId: ObjectId,
  fields: {
    transparencyPageUrl: string;
    csvLinks?: string[];
    discoveryMethod?: string;
  }
): Promise<void> {
  const collection = db.collection<BuyerDoc>(COLLECTION);
  await collection.updateOne(
    { _id: buyerId },
    {
      $set: {
        transparencyPageUrl: fields.transparencyPageUrl,
        ...(fields.csvLinks && fields.csvLinks.length > 0
          ? { csvLinks: fields.csvLinks }
          : {}),
        ...(fields.discoveryMethod
          ? { discoveryMethod: fields.discoveryMethod }
          : {}),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Reset buyers previously marked with discoveryMethod "none" so they can
 * be retried with pattern-based discovery. One-time migration helper.
 */
export async function resetAiOnlyDiscoveryResults(
  db: Db
): Promise<number> {
  const collection = db.collection<BuyerDoc>(COLLECTION);
  const result = await collection.updateMany(
    {
      transparencyPageUrl: "none",
      $or: [
        { discoveryMethod: { $in: ["none", "ai_discovery"] } },
        { discoveryMethod: { $exists: false } },
      ],
    },
    {
      $unset: { transparencyPageUrl: "", discoveryMethod: "" },
      $set: { updatedAt: new Date() },
    }
  );
  return result.modifiedCount;
}

/**
 * Update a buyer with extracted CSV links from Stage 2.
 */
export async function updateBuyerCsvLinks(
  db: Db,
  buyerId: ObjectId,
  csvLinks: string[]
): Promise<void> {
  const collection = db.collection<BuyerDoc>(COLLECTION);
  await collection.updateOne(
    { _id: buyerId },
    {
      $set: {
        csvLinks,
        csvLinksExtracted: true,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Update a buyer with spend-related fields.
 */
export async function updateBuyerSpendFields(
  db: Db,
  buyerId: ObjectId,
  fields: {
    transparencyPageUrl?: string;
    spendDataIngested?: boolean;
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
