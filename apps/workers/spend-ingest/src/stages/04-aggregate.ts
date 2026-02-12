import type { Db } from "mongodb";
import type { Env, SpendJobDoc } from "../types";
import { getBuyerBatchForAggregation, updateBuyerSpendFields } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { upsertSpendSummary } from "../db/spend-data";

// ---------------------------------------------------------------------------
// Stage 4: Aggregate spend data into per-buyer summaries
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;

/**
 * Stage 4: Aggregate spend data into per-buyer summaries.
 *
 * Runs a MongoDB $facet aggregation pipeline on SpendTransaction to compute:
 * - Total spend and transaction count
 * - Date range (earliest/latest)
 * - Category breakdown (top 30 by total)
 * - Vendor breakdown (top 50 by total)
 * - Monthly totals timeline
 *
 * Upserts SpendSummary documents and marks buyers as spendDataAvailable.
 */
export async function aggregateSpendData(
  db: Db,
  env: Env,
  job: SpendJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    const batch = await getBuyerBatchForAggregation(db, currentCursor, BATCH_SIZE);

    if (batch.length === 0) {
      console.log(`Aggregation complete: ${processed} buyers processed`);
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        // Run MongoDB $facet aggregation
        const pipeline = [
          { $match: { buyerId: buyer._id! } },
          {
            $facet: {
              totals: [
                {
                  $group: {
                    _id: null,
                    totalSpend: { $sum: "$amount" },
                    totalTransactions: { $sum: 1 },
                    earliest: { $min: "$date" },
                    latest: { $max: "$date" },
                  },
                },
              ],
              byCategory: [
                {
                  $group: {
                    _id: "$category",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                  },
                },
                { $sort: { total: -1 as const } },
                { $limit: 30 },
              ],
              byVendor: [
                {
                  $group: {
                    _id: "$vendorNormalized",
                    vendor: { $first: "$vendor" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                  },
                },
                { $sort: { total: -1 as const } },
                { $limit: 50 },
              ],
              byMonth: [
                {
                  $group: {
                    _id: {
                      year: { $year: "$date" },
                      month: { $month: "$date" },
                    },
                    total: { $sum: "$amount" },
                  },
                },
                { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
              ],
            },
          },
        ];

        const [result] = await db
          .collection("spendtransactions")
          .aggregate(pipeline)
          .toArray();

        if (!result) {
          console.warn(`No aggregation result for "${buyer.name}"`);
          continue;
        }

        const totals = result.totals?.[0] ?? {
          totalSpend: 0,
          totalTransactions: 0,
          earliest: null,
          latest: null,
        };

        const categoryBreakdown = (
          result.byCategory as Array<{
            _id: string;
            total: number;
            count: number;
          }>
        ).map((c) => ({
          category: c._id ?? "Other",
          total: c.total,
          count: c.count,
        }));

        const vendorBreakdown = (
          result.byVendor as Array<{
            _id: string;
            vendor: string;
            total: number;
            count: number;
          }>
        ).map((v) => ({
          vendor: v.vendor ?? v._id,
          total: v.total,
          count: v.count,
        }));

        const monthlyTotals = (
          result.byMonth as Array<{
            _id: { year: number; month: number };
            total: number;
          }>
        ).map((m) => ({
          year: m._id.year,
          month: m._id.month,
          total: m.total,
        }));

        // Collect processed CSV files
        const csvFiles = await db
          .collection("spendtransactions")
          .distinct("sourceFile", { buyerId: buyer._id! });

        // Upsert spend summary
        await upsertSpendSummary(db, buyer._id!, {
          totalTransactions: totals.totalTransactions,
          totalSpend: totals.totalSpend,
          dateRange: {
            earliest: totals.earliest ?? undefined,
            latest: totals.latest ?? undefined,
          },
          categoryBreakdown,
          vendorBreakdown,
          monthlyTotals,
          csvFilesProcessed: csvFiles as string[],
          lastComputedAt: new Date(),
        });

        // Mark buyer as having spend data available
        await updateBuyerSpendFields(db, buyer._id!, {
          spendDataAvailable: true,
          lastSpendIngestAt: new Date(),
        });

        console.log(
          `Aggregated "${buyer.name}": ${totals.totalTransactions} txns, £${totals.totalSpend.toFixed(2)} total, ${categoryBreakdown.length} categories, ${vendorBreakdown.length} vendors`
        );
      } catch (err) {
        errors++;
        const msg = `Aggregation failed for "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Update cursor and progress
    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Aggregation paused (budget ${maxItems} reached): ${processed} buyers processed`
  );
  return { processed, errors, done: false };
}
