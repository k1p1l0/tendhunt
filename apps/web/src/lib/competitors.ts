import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";
import SpendTransaction from "@/models/spend-transaction";
import Buyer from "@/models/buyer";
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

export interface CompetitorProfile {
  name: string;
  contractCount: number;
  totalValue: number;
  activeContracts: number;
  buyerCount: number;
  latestAwardDate: string | null;
  earliestAwardDate: string | null;
  sectors: { name: string; count: number; value: number }[];
  regions: { name: string; count: number; value: number }[];
  timeline: { year: number; month: number; count: number; value: number }[];
}

export interface CompetitorContract {
  _id: string;
  title: string;
  buyerName: string;
  buyerId: string | null;
  value: number;
  awardDate: string | null;
  status: string;
  sector: string | null;
  source: string;
  contractEndDate: string | null;
}

export interface CompetitorContractsResult {
  contracts: CompetitorContract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CompetitorBuyer {
  buyerId: string | null;
  buyerName: string;
  contractCount: number;
  totalValue: number;
  sectors: string[];
  regions: string[];
  firstContract: string | null;
  latestContract: string | null;
}

export type ContractSortField = "value" | "awardDate" | "buyerName";
export type SortDirection = "asc" | "desc";

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

/**
 * Build full competitor profile with sector/region/timeline breakdowns.
 * DATA-04: Aggregation pipeline for competitor profile.
 */
export async function getCompetitorProfile(
  supplierName: string
): Promise<CompetitorProfile | null> {
  await dbConnect();

  const pattern = buildSupplierSearchPattern(supplierName);

  const pipeline = [
    { $match: { "awardedSuppliers.name": { $regex: pattern } } },
    { $unwind: "$awardedSuppliers" },
    { $match: { "awardedSuppliers.name": { $regex: pattern } } },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              names: { $addToSet: "$awardedSuppliers.name" },
              contractCount: { $sum: 1 },
              totalValue: {
                $sum: {
                  $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
                },
              },
              activeContracts: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$status", "OPEN"] },
                        {
                          $and: [
                            { $eq: ["$status", "AWARDED"] },
                            { $gte: ["$contractEndDate", new Date()] },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              buyers: { $addToSet: "$buyerName" },
              latestAwardDate: { $max: "$awardDate" },
              earliestAwardDate: { $min: "$awardDate" },
            },
          },
        ],
        sectors: [
          { $match: { sector: { $ne: null } } },
          {
            $group: {
              _id: "$sector",
              count: { $sum: 1 },
              value: {
                $sum: {
                  $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
                },
              },
            },
          },
          { $sort: { count: -1 as const } },
          { $limit: 10 },
        ],
        regions: [
          { $match: { buyerRegion: { $ne: null } } },
          {
            $group: {
              _id: "$buyerRegion",
              count: { $sum: 1 },
              value: {
                $sum: {
                  $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
                },
              },
            },
          },
          { $sort: { count: -1 as const } },
          { $limit: 12 },
        ],
        timeline: [
          { $match: { awardDate: { $ne: null } } },
          {
            $group: {
              _id: {
                year: { $year: "$awardDate" },
                month: { $month: "$awardDate" },
              },
              count: { $sum: 1 },
              value: {
                $sum: {
                  $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
                },
              },
            },
          },
          { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
        ],
      },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await Contract.aggregate(pipeline as any);

  if (!results.length || !results[0].overview.length) return null;

  const overview = results[0].overview[0];

  const names = (overview.names as string[]).sort(
    (a: string, b: string) => b.length - a.length
  );
  const displayName = names[0] || supplierName;

  return {
    name: displayName,
    contractCount: overview.contractCount,
    totalValue: overview.totalValue,
    activeContracts: overview.activeContracts,
    buyerCount: overview.buyers.length,
    latestAwardDate: overview.latestAwardDate
      ? new Date(overview.latestAwardDate).toISOString()
      : null,
    earliestAwardDate: overview.earliestAwardDate
      ? new Date(overview.earliestAwardDate).toISOString()
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sectors: results[0].sectors.map((s: any) => ({
      name: s._id as string,
      count: s.count as number,
      value: s.value as number,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regions: results[0].regions.map((r: any) => ({
      name: r._id as string,
      count: r.count as number,
      value: r.value as number,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeline: results[0].timeline.map((t: any) => ({
      year: t._id.year as number,
      month: t._id.month as number,
      count: t.count as number,
      value: t.value as number,
    })),
  };
}

/**
 * Get paginated, sortable contracts for a supplier.
 * CONT-01..03: Contract list with pagination and sorting.
 */
export async function getCompetitorContracts(
  supplierName: string,
  options: {
    page?: number;
    pageSize?: number;
    sortBy?: ContractSortField;
    sortDir?: SortDirection;
  } = {}
): Promise<CompetitorContractsResult> {
  await dbConnect();

  const { page = 1, pageSize = 20, sortBy = "awardDate", sortDir = "desc" } = options;
  const skip = (page - 1) * pageSize;
  const pattern = buildSupplierSearchPattern(supplierName);

  const matchStage = {
    $match: { "awardedSuppliers.name": { $regex: pattern } },
  };

  // Count total
  const countPipeline = [
    matchStage,
    { $count: "total" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await Contract.aggregate(countPipeline as any);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Build sort
  const sortMap: Record<ContractSortField, string> = {
    value: "effectiveValue",
    awardDate: "awardDate",
    buyerName: "buyerName",
  };
  const sortField = sortMap[sortBy];
  const sortDirection = sortDir === "asc" ? 1 : -1;

  const dataPipeline = [
    matchStage,
    {
      $addFields: {
        effectiveValue: {
          $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
        },
      },
    },
    { $sort: { [sortField]: sortDirection } },
    { $skip: skip },
    { $limit: pageSize },
    {
      $project: {
        _id: 1,
        title: 1,
        buyerName: 1,
        buyerId: 1,
        effectiveValue: 1,
        awardDate: 1,
        status: 1,
        sector: 1,
        source: 1,
        contractEndDate: 1,
      },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawContracts = await Contract.aggregate(dataPipeline as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts: CompetitorContract[] = rawContracts.map((c: any) => ({
    _id: String(c._id),
    title: c.title ?? "",
    buyerName: c.buyerName ?? "",
    buyerId: c.buyerId ? String(c.buyerId) : null,
    value: c.effectiveValue ?? 0,
    awardDate: c.awardDate ? new Date(c.awardDate).toISOString() : null,
    status: c.status ?? "OPEN",
    sector: c.sector ?? null,
    source: c.source ?? "",
    contractEndDate: c.contractEndDate
      ? new Date(c.contractEndDate).toISOString()
      : null,
  }));

  return {
    contracts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get buyer relationship list for a supplier.
 * BUYR-01..04: Buyer list with counts, values, sectors, and relationship duration.
 */
export async function getCompetitorBuyers(
  supplierName: string
): Promise<CompetitorBuyer[]> {
  await dbConnect();

  const pattern = buildSupplierSearchPattern(supplierName);

  const pipeline = [
    { $match: { "awardedSuppliers.name": { $regex: pattern } } },
    { $unwind: "$awardedSuppliers" },
    { $match: { "awardedSuppliers.name": { $regex: pattern } } },
    {
      $group: {
        _id: "$buyerName",
        buyerId: { $first: "$buyerId" },
        contractCount: { $sum: 1 },
        totalValue: {
          $sum: {
            $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }],
          },
        },
        sectors: { $addToSet: "$sector" },
        regions: { $addToSet: "$buyerRegion" },
        firstContract: { $min: "$awardDate" },
        latestContract: { $max: "$awardDate" },
      },
    },
    { $sort: { totalValue: -1 as const } },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBuyers = await Contract.aggregate(pipeline as any);

  // Collect buyerIds to resolve names from Buyer collection for missing ones
  const buyerIds = rawBuyers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.buyerId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.buyerId);

  const buyerDocs = buyerIds.length > 0
    ? await Buyer.find(
        { _id: { $in: buyerIds } },
        { region: 1, sector: 1 }
      ).lean()
    : [];

  const buyerMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buyerDocs.map((b: any) => [String(b._id), b])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawBuyers.map((b: any) => {
    const buyerDoc = b.buyerId ? buyerMap.get(String(b.buyerId)) : null;
    const sectors = (b.sectors as (string | null)[]).filter(
      (s): s is string => s != null
    );
    const regions = (b.regions as (string | null)[]).filter(
      (r): r is string => r != null
    );

    // Prefer Buyer doc region/sector if contract data lacks it
    if (regions.length === 0 && buyerDoc?.region) {
      regions.push(buyerDoc.region);
    }
    if (sectors.length === 0 && buyerDoc?.sector) {
      sectors.push(buyerDoc.sector);
    }

    return {
      buyerId: b.buyerId ? String(b.buyerId) : null,
      buyerName: b._id as string,
      contractCount: b.contractCount as number,
      totalValue: b.totalValue as number,
      sectors,
      regions,
      firstContract: b.firstContract
        ? new Date(b.firstContract).toISOString()
        : null,
      latestContract: b.latestContract
        ? new Date(b.latestContract).toISOString()
        : null,
    };
  });
}
