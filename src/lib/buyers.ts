import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import ContactReveal from "@/models/contact-reveal";

export interface BuyerFilters {
  sort?: "name" | "contracts" | "sector" | "region";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchBuyers(userId: string, filters: BuyerFilters) {
  await dbConnect();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  // Build sort order
  const sortField: Record<string, string> = {
    name: "name",
    contracts: "contractCount",
    sector: "sector",
    region: "region",
  };
  const field = sortField[filters.sort ?? "name"] ?? "name";
  const direction = filters.order === "desc" ? -1 : 1;
  const sortOrder: Record<string, 1 | -1> = { [field]: direction as 1 | -1 };

  // Parallel fetch: buyers list, total count, and user's revealed buyers
  const [buyers, total, reveals] = await Promise.all([
    Buyer.find({})
      .sort(sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Buyer.estimatedDocumentCount(),
    ContactReveal.find({ userId }).select("buyerId").lean(),
  ]);

  // Build Set of revealed buyer IDs for O(1) lookup
  const revealedIds = new Set(
    reveals.map((r) => r.buyerId.toString())
  );

  // Map buyers to include contactCount and isUnlocked
  const buyersWithStatus = buyers.map((b) => ({
    ...b,
    contactCount: Array.isArray(b.contacts) ? b.contacts.length : 0,
    isUnlocked: revealedIds.has(b._id.toString()),
  }));

  return { buyers: buyersWithStatus, total };
}

export async function fetchBuyerById(buyerId: string, userId: string) {
  await dbConnect();

  if (!mongoose.isValidObjectId(buyerId)) {
    return null;
  }

  const buyer = await Buyer.findById(buyerId).lean();
  if (!buyer) {
    return null;
  }

  // Parallel fetch: contracts, signals, and reveal status
  const [contracts, signals, reveal] = await Promise.all([
    Contract.find({ buyerName: buyer.name })
      .sort({ publishedDate: -1 })
      .limit(20)
      .select("-rawData")
      .lean(),
    Signal.find({ organizationName: buyer.name })
      .sort({ sourceDate: -1 })
      .lean(),
    ContactReveal.findOne({ userId, buyerId }),
  ]);

  return {
    ...buyer,
    contracts,
    signals,
    isUnlocked: !!reveal,
  };
}
