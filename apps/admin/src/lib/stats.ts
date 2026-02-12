import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionCounts {
  contracts: number;
  buyers: number;
  signals: number;
  users: number;
  companyProfiles: number;
  creditAccounts: number;
  spendTransactions: number;
  boardDocuments: number;
  keyPersonnel: number;
}

export interface RecentItem {
  id: string;
  title: string;
  type: "contract" | "buyer" | "signal";
  createdAt: string;
}

export interface PlatformStats {
  counts: CollectionCounts;
  recentItems: RecentItem[];
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchPlatformStats(): Promise<PlatformStats> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const [
    contracts,
    buyers,
    signals,
    users,
    companyProfiles,
    creditAccounts,
    spendTransactions,
    boardDocuments,
    keyPersonnel,
    recentContracts,
    recentBuyers,
    recentSignals,
  ] = await Promise.all([
    db.collection("contracts").estimatedDocumentCount(),
    db.collection("buyers").estimatedDocumentCount(),
    db.collection("signals").estimatedDocumentCount(),
    db.collection("users").estimatedDocumentCount(),
    db.collection("companyprofiles").estimatedDocumentCount(),
    db.collection("creditaccounts").estimatedDocumentCount(),
    db.collection("spendtransactions").estimatedDocumentCount(),
    db.collection("boarddocuments").estimatedDocumentCount(),
    db.collection("keypersonnels").estimatedDocumentCount(),
    db
      .collection("contracts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ _id: 1, title: 1, createdAt: 1 })
      .toArray(),
    db
      .collection("buyers")
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ _id: 1, name: 1, createdAt: 1 })
      .toArray(),
    db
      .collection("signals")
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ _id: 1, title: 1, createdAt: 1 })
      .toArray(),
  ]);

  // Merge and sort recent items
  const recentItems: RecentItem[] = [
    ...recentContracts.map((d) => ({
      id: d._id.toString(),
      title: (d.title as string) || "Untitled Contract",
      type: "contract" as const,
      createdAt: d.createdAt
        ? new Date(d.createdAt as Date).toISOString()
        : new Date().toISOString(),
    })),
    ...recentBuyers.map((d) => ({
      id: d._id.toString(),
      title: (d.name as string) || "Unknown Buyer",
      type: "buyer" as const,
      createdAt: d.createdAt
        ? new Date(d.createdAt as Date).toISOString()
        : new Date().toISOString(),
    })),
    ...recentSignals.map((d) => ({
      id: d._id.toString(),
      title: (d.title as string) || "Untitled Signal",
      type: "signal" as const,
      createdAt: d.createdAt
        ? new Date(d.createdAt as Date).toISOString()
        : new Date().toISOString(),
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return {
    counts: {
      contracts,
      buyers,
      signals,
      users,
      companyProfiles,
      creditAccounts,
      spendTransactions,
      boardDocuments,
      keyPersonnel,
    },
    recentItems,
  };
}
