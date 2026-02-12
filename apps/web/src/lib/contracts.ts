import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";
import Buyer from "@/models/buyer";
import Signal from "@/models/signal";

export interface ContractFilters {
  query?: string;
  sector?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  sort?: "date" | "score";
  page?: number;
  pageSize?: number;
}

export async function fetchContracts(filters: ContractFilters) {
  await dbConnect();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  // Build MongoDB query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: Record<string, any>[] = [];

  if (filters.query) {
    conditions.push({ $text: { $search: filters.query } });
  }

  if (filters.sector) {
    conditions.push({ sector: filters.sector });
  }

  if (filters.region) {
    if (filters.region === "UNSPECIFIED") {
      conditions.push({
        $or: [{ buyerRegion: null }, { buyerRegion: { $exists: false } }],
      });
    } else {
      conditions.push({
        buyerRegion: { $regex: new RegExp("^" + filters.region, "i") },
      });
    }
  }

  if (filters.minValue) {
    conditions.push({ valueMax: { $gte: filters.minValue } });
  }

  if (filters.maxValue) {
    conditions.push({ valueMin: { $lte: filters.maxValue } });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  // Determine sort order
  const sortOrder: Record<string, 1 | -1> =
    filters.sort === "score"
      ? { vibeScore: -1, publishedDate: -1 }
      : { publishedDate: -1 };

  // Execute three queries in parallel
  const [contracts, filteredCount, totalCount] = await Promise.all([
    Contract.find(query)
      .sort(sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("-rawData")
      .lean(),
    Contract.countDocuments(query),
    Contract.estimatedDocumentCount(),
  ]);

  return { contracts, filteredCount, totalCount };
}

export async function fetchContractById(id: string) {
  await dbConnect();

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const contract = await Contract.findById(id).select("-rawData").lean();
  if (!contract) return null;

  // Resolve buyer data via buyerId (preferred) or nameLower fallback (pre-backfill contracts)
  let buyer = null;
  if (contract.buyerId) {
    buyer = await Buyer.findById(contract.buyerId)
      .select("name sector region orgType website logoUrl enrichmentScore linkedinUrl contractCount description")
      .lean();
  }
  if (!buyer && contract.buyerName) {
    buyer = await Buyer.findOne({ nameLower: contract.buyerName.toLowerCase().trim() })
      .select("name sector region orgType website logoUrl enrichmentScore linkedinUrl contractCount description")
      .lean();
  }

  return { ...contract, buyer };
}

export async function getContractStats() {
  await dbConnect();

  const [contractCount, buyerCount, signalCount] = await Promise.all([
    Contract.estimatedDocumentCount(),
    Buyer.estimatedDocumentCount(),
    Signal.estimatedDocumentCount(),
  ]);

  return { contractCount, buyerCount, signalCount };
}
