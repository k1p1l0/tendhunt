import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import BoardDocument from "@/models/board-document";
import KeyPersonnel from "@/models/key-personnel";

export interface BuyerFilters {
  sort?: "name" | "contracts" | "sector" | "region" | "orgType" | "enrichmentScore";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  q?: string;
  sector?: string;
  orgType?: string;
  region?: string;
}

export async function fetchBuyers(filters: BuyerFilters) {
  await dbConnect();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  // Build MongoDB query from filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: Record<string, any>[] = [];

  if (filters.q) {
    conditions.push({ name: { $regex: filters.q, $options: "i" } });
  }
  if (filters.sector) {
    conditions.push({ sector: filters.sector });
  }
  if (filters.orgType) {
    conditions.push({ orgType: filters.orgType });
  }
  if (filters.region) {
    conditions.push({ region: filters.region });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  // Build sort order
  const sortField: Record<string, string> = {
    name: "name",
    contracts: "contractCount",
    sector: "sector",
    region: "region",
    orgType: "orgType",
    enrichmentScore: "enrichmentScore",
  };
  const field = sortField[filters.sort ?? "name"] ?? "name";
  const direction = filters.order === "desc" ? -1 : 1;
  const sortOrder: Record<string, 1 | -1> = { [field]: direction as 1 | -1 };

  // Parallel fetch: buyers list, total count, filtered count
  const [buyers, total, filteredCount] = await Promise.all([
    Buyer.find(query)
      .sort(sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Buyer.estimatedDocumentCount(),
    Buyer.countDocuments(query),
  ]);

  // Map buyers to include contactCount
  const buyersWithStatus = buyers.map((b) => ({
    ...b,
    contactCount: Array.isArray(b.contacts) ? b.contacts.length : 0,
  }));

  return { buyers: buyersWithStatus, total, filteredCount };
}

export async function fetchBuyerById(buyerId: string) {
  await dbConnect();

  if (!mongoose.isValidObjectId(buyerId)) {
    return null;
  }

  const buyer = await Buyer.findById(buyerId).lean();
  if (!buyer) {
    return null;
  }

  // Parallel fetch: contracts, signals, board documents, key personnel
  const [contracts, signals, boardDocuments, keyPersonnel] = await Promise.all([
    Contract.find({ buyerId: buyer._id })
      .sort({ publishedDate: -1 })
      .limit(20)
      .select("-rawData")
      .lean(),
    Signal.find({ organizationName: buyer.name })
      .sort({ sourceDate: -1 })
      .lean(),
    BoardDocument.find({ buyerId: buyer._id })
      .sort({ meetingDate: -1 })
      .limit(20)
      .lean(),
    KeyPersonnel.find({ buyerId: buyer._id })
      .sort({ confidence: -1 })
      .lean(),
  ]);

  return {
    ...buyer,
    contracts,
    signals,
    boardDocuments,
    keyPersonnel,
    // Enrichment fields (already on buyer document via spread, but explicitly named for clarity)
    enrichmentScore: buyer.enrichmentScore,
    enrichmentSources: buyer.enrichmentSources,
    orgType: buyer.orgType,
    orgSubType: buyer.orgSubType,
    staffCount: buyer.staffCount,
    annualBudget: buyer.annualBudget,
    democracyPortalUrl: buyer.democracyPortalUrl,
    lastEnrichedAt: buyer.lastEnrichedAt,
  };
}
