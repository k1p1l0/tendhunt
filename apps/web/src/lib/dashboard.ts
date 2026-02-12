import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import Buyer from "@/models/buyer";

export const ACCOUNT_MANAGER = {
  name: "Matt",
  email: "matt@tendhunt.com",
  calendlyUrl: "https://calendly.com/matt-tendhunt/30min",
  greeting:
    "Hi! I'm Matt, your dedicated account manager. I'm here to help you get the most out of TendHunt.",
} as const;

export interface ScannerSummary {
  _id: string;
  name: string;
  type: "rfps" | "meetings" | "buyers";
  description: string;
  lastScoredAt: Date | null;
  updatedAt: Date;
  totalEntries: number;
}

export interface TopScore {
  scannerId: string;
  scannerName: string;
  scannerType: string;
  entityId: string;
  entityName: string;
  columnId: string;
  columnName: string;
  score: number;
  reasoning: string;
}

export async function getUserScanners(
  userId: string
): Promise<ScannerSummary[]> {
  await dbConnect();
  const scanners = await Scanner.find({ userId })
    .sort({ updatedAt: -1 })
    .select("name type description lastScoredAt updatedAt scores")
    .lean();

  return scanners.map((s) => ({
    _id: String(s._id),
    name: s.name,
    type: s.type as ScannerSummary["type"],
    description: s.description || "",
    lastScoredAt: s.lastScoredAt || null,
    updatedAt: s.updatedAt!,
    totalEntries: new Set(
      (s.scores ?? []).map((sc: { entityId: unknown }) => String(sc.entityId))
    ).size,
  }));
}

export async function getTopScores(
  userId: string,
  limit = 10
): Promise<TopScore[]> {
  await dbConnect();

  const scanners = await Scanner.find({ userId })
    .select("name type scores aiColumns")
    .lean();

  const allScores: Array<{
    scannerId: string;
    scannerName: string;
    scannerType: string;
    entityId: string;
    columnId: string;
    columnName: string;
    score: number;
    reasoning: string;
  }> = [];

  for (const scanner of scanners) {
    const columnMap = new Map(
      (scanner.aiColumns ?? []).map((c: { columnId: string; name: string }) => [
        c.columnId,
        c.name,
      ])
    );
    for (const entry of scanner.scores ?? []) {
      if (entry.score != null && entry.score >= 7) {
        allScores.push({
          scannerId: String(scanner._id),
          scannerName: scanner.name,
          scannerType: scanner.type,
          entityId: String(entry.entityId),
          columnId: entry.columnId,
          columnName: columnMap.get(entry.columnId) || entry.columnId,
          score: entry.score,
          reasoning: entry.reasoning || "",
        });
      }
    }
  }

  // Sort by score descending, take top N
  allScores.sort((a, b) => b.score - a.score);
  const top = allScores.slice(0, limit);

  if (top.length === 0) {
    return [];
  }

  // Group entityIds by scanner type for batch resolution
  const contractIds: string[] = [];
  const signalIds: string[] = [];
  const buyerIds: string[] = [];

  for (const entry of top) {
    if (entry.scannerType === "rfps") contractIds.push(entry.entityId);
    else if (entry.scannerType === "meetings") signalIds.push(entry.entityId);
    else if (entry.scannerType === "buyers") buyerIds.push(entry.entityId);
  }

  // Batch-resolve entity names (max 3 queries)
  const nameMap = new Map<string, string>();

  const resolvers: Promise<void>[] = [];

  if (contractIds.length > 0) {
    resolvers.push(
      Contract.find({ _id: { $in: contractIds } })
        .select("title")
        .lean()
        .then((docs) => {
          for (const doc of docs) {
            nameMap.set(String(doc._id), doc.title);
          }
        })
    );
  }

  if (signalIds.length > 0) {
    resolvers.push(
      Signal.find({ _id: { $in: signalIds } })
        .select("title")
        .lean()
        .then((docs) => {
          for (const doc of docs) {
            nameMap.set(String(doc._id), doc.title);
          }
        })
    );
  }

  if (buyerIds.length > 0) {
    resolvers.push(
      Buyer.find({ _id: { $in: buyerIds } })
        .select("name")
        .lean()
        .then((docs) => {
          for (const doc of docs) {
            nameMap.set(String(doc._id), doc.name);
          }
        })
    );
  }

  await Promise.all(resolvers);

  return top.map((entry) => ({
    ...entry,
    entityName: nameMap.get(entry.entityId) || "Unknown",
  }));
}
