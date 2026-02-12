import type { Db, ObjectId } from "mongodb";
import type { SpendTransactionDoc, SpendSummaryDoc } from "../types";

const TRANSACTIONS_COLLECTION = "spendtransactions";
const SUMMARIES_COLLECTION = "spendsummaries";

/**
 * Bulk upsert transactions using compound key to prevent duplicates.
 * Compound key: { buyerId, date, vendor, amount, reference }
 */
export async function bulkUpsertTransactions(
  db: Db,
  transactions: SpendTransactionDoc[]
): Promise<{ upsertedCount: number; modifiedCount: number }> {
  if (transactions.length === 0) return { upsertedCount: 0, modifiedCount: 0 };

  const collection = db.collection<SpendTransactionDoc>(TRANSACTIONS_COLLECTION);
  const now = new Date();

  const ops = transactions.map((tx) => ({
    updateOne: {
      filter: {
        buyerId: tx.buyerId,
        date: tx.date,
        vendor: tx.vendor,
        amount: tx.amount,
        reference: tx.reference,
      },
      update: {
        $set: {
          vendorNormalized: tx.vendorNormalized,
          category: tx.category,
          subcategory: tx.subcategory,
          department: tx.department,
          sourceFile: tx.sourceFile,
          updatedAt: now,
        },
        $setOnInsert: {
          buyerId: tx.buyerId,
          date: tx.date,
          vendor: tx.vendor,
          amount: tx.amount,
          reference: tx.reference,
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });
  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Upsert a spend summary for a buyer.
 */
export async function upsertSpendSummary(
  db: Db,
  buyerId: ObjectId,
  summary: Omit<SpendSummaryDoc, "_id" | "buyerId" | "createdAt" | "updatedAt">
): Promise<void> {
  const collection = db.collection<SpendSummaryDoc>(SUMMARIES_COLLECTION);
  const now = new Date();

  await collection.updateOne(
    { buyerId },
    {
      $set: {
        ...summary,
        updatedAt: now,
      },
      $setOnInsert: {
        buyerId,
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

/**
 * Get the spend summary for a buyer.
 */
export async function getSpendSummary(
  db: Db,
  buyerId: ObjectId
): Promise<SpendSummaryDoc | null> {
  const collection = db.collection<SpendSummaryDoc>(SUMMARIES_COLLECTION);
  return collection.findOne({ buyerId });
}

/**
 * Get transactions for a buyer with optional filters and pagination.
 */
export async function getTransactions(
  db: Db,
  buyerId: ObjectId,
  opts: {
    skip?: number;
    limit?: number;
    category?: string;
    vendor?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
): Promise<SpendTransactionDoc[]> {
  const collection = db.collection<SpendTransactionDoc>(TRANSACTIONS_COLLECTION);

  const filter: Record<string, unknown> = { buyerId };

  if (opts.category) {
    filter.category = opts.category;
  }
  if (opts.vendor) {
    filter.vendorNormalized = opts.vendor;
  }
  if (opts.dateFrom || opts.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (opts.dateFrom) dateFilter.$gte = opts.dateFrom;
    if (opts.dateTo) dateFilter.$lte = opts.dateTo;
    filter.date = dateFilter;
  }

  return collection
    .find(filter)
    .sort({ date: -1 })
    .skip(opts.skip ?? 0)
    .limit(opts.limit ?? 100)
    .toArray();
}
