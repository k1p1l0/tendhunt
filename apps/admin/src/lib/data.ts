import mongoose from "mongoose";
import { dbConnect } from "./mongodb";

interface FetchResult<T> {
  items: T[];
  total: number;
}

export interface RecentContract {
  _id: string;
  title: string;
  buyerName: string;
  status: string;
  source: string;
  sector: string | null;
  valueMin: number | null;
  valueMax: number | null;
  currency: string;
  publishedDate: string | null;
  deadlineDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecentBuyer {
  _id: string;
  name: string;
  orgType: string | null;
  sector: string | null;
  region: string | null;
  website: string | null;
  enrichmentScore: number | null;
  contractCount: number;
  createdAt: string;
  updatedAt: string;
  lastEnrichedAt: string | null;
}

export interface RecentSignal {
  _id: string;
  organizationName: string;
  signalType: string;
  title: string;
  insight: string;
  source: string | null;
  sourceDate: string | null;
  sector: string | null;
  confidence: number;
  createdAt: string;
}

export async function fetchRecentContracts(
  limit = 100
): Promise<FetchResult<RecentContract>> {
  await dbConnect();
  const db = mongoose.connection.db!;
  const collection = db.collection("contracts");

  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        _id: 1,
        title: 1,
        buyerName: 1,
        status: 1,
        source: 1,
        sector: 1,
        valueMin: 1,
        valueMax: 1,
        currency: 1,
        publishedDate: 1,
        deadlineDate: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .toArray(),
    collection.estimatedDocumentCount(),
  ]);

  return { items: items as unknown as RecentContract[], total };
}

export async function fetchRecentBuyers(
  limit = 100
): Promise<FetchResult<RecentBuyer>> {
  await dbConnect();
  const db = mongoose.connection.db!;
  const collection = db.collection("buyers");

  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        _id: 1,
        name: 1,
        orgType: 1,
        sector: 1,
        region: 1,
        website: 1,
        enrichmentScore: 1,
        contractCount: 1,
        createdAt: 1,
        updatedAt: 1,
        lastEnrichedAt: 1,
      })
      .toArray(),
    collection.estimatedDocumentCount(),
  ]);

  return { items: items as unknown as RecentBuyer[], total };
}

export async function fetchRecentSignals(
  limit = 100
): Promise<FetchResult<RecentSignal>> {
  await dbConnect();
  const db = mongoose.connection.db!;
  const collection = db.collection("signals");

  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        _id: 1,
        organizationName: 1,
        signalType: 1,
        title: 1,
        insight: 1,
        source: 1,
        sourceDate: 1,
        sector: 1,
        confidence: 1,
        createdAt: 1,
      })
      .toArray(),
    collection.estimatedDocumentCount(),
  ]);

  return { items: items as unknown as RecentSignal[], total };
}
