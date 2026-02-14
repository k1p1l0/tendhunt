import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";
import SpendTransaction from "@/models/spend-transaction";
import {
  normalizeSupplierName,
  buildSupplierSearchPattern,
} from "@/lib/supplier-normalize";

export interface SupplierSearchResult {
  name: string;
  normalizedName: string;
  contractCount: number;
  totalValue: number;
  activeBuyerCount: number;
  latestAwardDate: string | null;
  sectors: string[];
}

/**
 * Search for suppliers by name across contracts and spend data.
 * Uses regex-based search on awardedSuppliers.name with normalization.
 */
export async function searchSuppliers(
  query: string,
  limit = 10
): Promise<SupplierSearchResult[]> {
  await dbConnect();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchPattern = buildSupplierSearchPattern(query);

  // Aggregation: find all contracts with matching awarded supplier names,
  // group by normalized supplier name to merge variants
  const pipeline = [
    {
      $match: {
        "awardedSuppliers.name": { $regex: searchPattern },
      },
    },
    { $unwind: "$awardedSuppliers" },
    {
      $match: {
        "awardedSuppliers.name": { $regex: searchPattern },
      },
    },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$awardedSuppliers.name" } } },
        name: { $first: "$awardedSuppliers.name" },
        contractCount: { $sum: 1 },
        totalValue: {
          $sum: { $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }] },
        },
        buyers: { $addToSet: "$buyerName" },
        latestAwardDate: { $max: "$awardDate" },
        sectors: { $addToSet: "$sector" },
      },
    },
    { $sort: { contractCount: -1 as const } },
    { $limit: limit * 3 }, // over-fetch to allow normalization grouping
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResults = await Contract.aggregate(pipeline as any);

  // Merge results by normalized name (handles "Capita Ltd" vs "Capita Limited")
  const mergedMap = new Map<
    string,
    {
      name: string;
      contractCount: number;
      totalValue: number;
      buyers: Set<string>;
      latestAwardDate: Date | null;
      sectors: Set<string>;
    }
  >();

  for (const r of rawResults) {
    const normalized = normalizeSupplierName(r.name);
    const existing = mergedMap.get(normalized);

    if (existing) {
      existing.contractCount += r.contractCount;
      existing.totalValue += r.totalValue;
      for (const b of r.buyers) existing.buyers.add(b);
      for (const s of r.sectors) if (s) existing.sectors.add(s);
      if (
        r.latestAwardDate &&
        (!existing.latestAwardDate ||
          new Date(r.latestAwardDate) > existing.latestAwardDate)
      ) {
        existing.latestAwardDate = new Date(r.latestAwardDate);
      }
      // Keep the "best" display name (longest, most complete)
      if (r.name.length > existing.name.length) {
        existing.name = r.name;
      }
    } else {
      mergedMap.set(normalized, {
        name: r.name,
        contractCount: r.contractCount,
        totalValue: r.totalValue,
        buyers: new Set(r.buyers as string[]),
        latestAwardDate: r.latestAwardDate
          ? new Date(r.latestAwardDate)
          : null,
        sectors: new Set(
          (r.sectors as (string | null)[]).filter(
            (s): s is string => s != null
          )
        ),
      });
    }
  }

  // Convert to array, sort by contract count, limit
  const results: SupplierSearchResult[] = Array.from(mergedMap.entries())
    .map(([normalizedName, data]) => ({
      name: data.name,
      normalizedName,
      contractCount: data.contractCount,
      totalValue: data.totalValue,
      activeBuyerCount: data.buyers.size,
      latestAwardDate: data.latestAwardDate
        ? data.latestAwardDate.toISOString()
        : null,
      sectors: Array.from(data.sectors).slice(0, 5),
    }))
    .sort((a, b) => b.contractCount - a.contractCount)
    .slice(0, limit);

  return results;
}

/**
 * Get spend transaction summary for a supplier name.
 * Returns total spend and transaction count across all buyers.
 */
export async function getSupplierSpendSummary(supplierName: string): Promise<{
  totalSpend: number;
  transactionCount: number;
  buyerCount: number;
}> {
  await dbConnect();

  const normalized = normalizeSupplierName(supplierName);
  const pattern = new RegExp(
    `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "i"
  );

  const pipeline = [
    { $match: { vendorNormalized: { $regex: pattern } } },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
        buyers: { $addToSet: "$buyerId" },
      },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await SpendTransaction.aggregate(pipeline as any);

  if (results.length === 0) {
    return { totalSpend: 0, transactionCount: 0, buyerCount: 0 };
  }

  return {
    totalSpend: results[0].totalSpend,
    transactionCount: results[0].transactionCount,
    buyerCount: results[0].buyers.length,
  };
}
