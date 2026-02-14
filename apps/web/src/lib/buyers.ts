import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import BoardDocument from "@/models/board-document";
import KeyPersonnel from "@/models/key-personnel";
import OfstedSchool from "@/models/ofsted-school";

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

  // For parent buyers, aggregate contracts from all children
  const allBuyerIds = [buyer._id, ...(buyer.childBuyerIds ?? [])];

  // Contract query: match by buyerId(s) OR exact buyer name
  const contractFilter = {
    $or: [
      { buyerId: { $in: allBuyerIds } },
      ...(buyer.name ? [{ buyerName: new RegExp(`^${buyer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
    ],
  };

  // Fetch child summaries + parent name in parallel with main data
  const childrenPromise = buyer.childBuyerIds?.length
    ? Buyer.find({ _id: { $in: buyer.childBuyerIds } })
        .select("name enrichmentScore logoUrl orgType contractCount")
        .sort({ name: 1 })
        .lean()
    : Promise.resolve([]);

  const parentBuyerPromise = buyer.parentBuyerId
    ? Buyer.findById(buyer.parentBuyerId).select("name").lean()
    : Promise.resolve(null);

  // Parallel fetch: contracts, live count, signals, board documents, key personnel, children, parent, ofsted schools
  const [contracts, contractCount, signals, boardDocuments, keyPersonnel, children, parentBuyer, ofstedSchools] = await Promise.all([
    Contract.find(contractFilter)
      .sort({ publishedDate: -1 })
      .limit(20)
      .select("-rawData")
      .lean(),
    Contract.countDocuments(contractFilter),
    Signal.find({ $or: [{ buyerId: buyer._id }, { organizationName: buyer.name }] })
      .sort({ sourceDate: -1 })
      .lean(),
    BoardDocument.find({ buyerId: buyer._id })
      .sort({ meetingDate: -1 })
      .limit(20)
      .lean(),
    KeyPersonnel.find({ buyerId: buyer._id })
      .sort({ confidence: -1 })
      .lean(),
    childrenPromise,
    parentBuyerPromise,
    OfstedSchool.find({ buyerId: buyer._id })
      .sort({ overallEffectiveness: -1 })
      .lean(),
  ]);

  return {
    ...buyer,
    contracts,
    contractCount,
    signals,
    boardDocuments,
    keyPersonnel,
    children,
    parentBuyer,
    ofstedSchools,
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
