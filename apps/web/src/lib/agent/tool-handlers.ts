import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { dbConnect } from "@/lib/mongodb";
import { fetchBuyerById } from "@/lib/buyers";
import { fetchContracts, fetchContractById } from "@/lib/contracts";
import Buyer from "@/models/buyer";
import Signal from "@/models/signal";
import KeyPersonnel from "@/models/key-personnel";
import SpendSummary from "@/models/spend-summary";
import SpendTransaction from "@/models/spend-transaction";
import BoardDocument from "@/models/board-document";
import Scanner from "@/models/scanner";

interface ToolResult {
  summary: string;
  data: unknown;
  action?: { type: string; [key: string]: unknown };
}

export async function executeToolHandler(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  await dbConnect();

  try {
    switch (toolName) {
      case "query_buyers":
        return await handleQueryBuyers(input);
      case "query_contracts":
        return await handleQueryContracts(input);
      case "query_signals":
        return await handleQuerySignals(input);
      case "get_buyer_detail":
        return await handleGetBuyerDetail(input);
      case "get_contract_detail":
        return await handleGetContractDetail(input);
      case "query_key_personnel":
        return await handleQueryKeyPersonnel(input);
      case "query_spend_data":
        return await handleQuerySpendData(input);
      case "query_board_documents":
        return await handleQueryBoardDocuments(input);
      case "web_search":
        return handleWebSearch();
      case "create_scanner":
        return await handleCreateScanner(input, userId);
      case "apply_scanner_filter":
        return await handleApplyScannerFilter(input, userId);
      case "add_scanner_column":
        return await handleAddScannerColumn(input, userId);
      default:
        return { summary: `Unknown tool: ${toolName}`, data: null };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Tool handler error [${toolName}]:`, message);
    return { summary: `Error executing ${toolName}: ${message}`, data: null };
  }
}

async function handleQueryBuyers(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const limit = Math.min(Number(input.limit) || 10, 20);

  // Build MongoDB query directly to support enrichmentScore at DB level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: Record<string, any>[] = [];

  if (input.query) {
    conditions.push({ name: { $regex: String(input.query), $options: "i" } });
  }
  if (input.sector) {
    conditions.push({ sector: String(input.sector) });
  }
  if (input.region) {
    conditions.push({ region: { $regex: String(input.region), $options: "i" } });
  }
  if (input.orgType) {
    conditions.push({ orgType: String(input.orgType) });
  }
  const minScore = Number(input.minEnrichmentScore) || 0;
  if (minScore > 0) {
    conditions.push({ enrichmentScore: { $gte: minScore } });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  const [buyers, filteredCount] = await Promise.all([
    Buyer.find(query)
      .sort({ enrichmentScore: -1 })
      .limit(limit)
      .select("name sector region orgType enrichmentScore contractCount")
      .lean(),
    Buyer.countDocuments(query),
  ]);

  return {
    summary: `Found ${filteredCount} buyers matching criteria (showing ${buyers.length})`,
    data: buyers,
  };
}

async function handleQueryContracts(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const limit = Math.min(Number(input.limit) || 10, 20);

  const result = await fetchContracts({
    query: input.query as string | undefined,
    sector: input.sector as string | undefined,
    region: input.region as string | undefined,
    minValue: input.minValue as number | undefined,
    maxValue: input.maxValue as number | undefined,
    page: 1,
    pageSize: limit,
  });

  const contracts = result.contracts.map((c) => ({
    _id: c._id,
    title: c.title,
    buyerId: c.buyerId ?? null,
    buyerName: c.buyerName,
    sector: c.sector,
    valueMin: c.valueMin,
    valueMax: c.valueMax,
    status: c.status,
    deadlineDate: c.deadlineDate,
    buyerRegion: c.buyerRegion,
  }));

  return {
    summary: `Found ${result.filteredCount} contracts matching criteria (showing ${contracts.length})`,
    data: contracts,
  };
}

async function handleQuerySignals(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const limit = Math.min(Number(input.limit) || 10, 20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (input.organizationName) {
    query.organizationName = {
      $regex: String(input.organizationName),
      $options: "i",
    };
  }
  if (input.signalType) {
    query.signalType = String(input.signalType);
  }
  if (input.sector) {
    query.sector = String(input.sector);
  }
  if (input.dateFrom || input.dateTo) {
    query.sourceDate = {};
    if (input.dateFrom)
      query.sourceDate.$gte = new Date(String(input.dateFrom));
    if (input.dateTo) query.sourceDate.$lte = new Date(String(input.dateTo));
  }

  const signals = await Signal.find(query)
    .sort({ sourceDate: -1 })
    .limit(limit)
    .select("buyerId organizationName signalType title insight sourceDate sector confidence")
    .lean();

  return {
    summary: `Found ${signals.length} signals`,
    data: signals,
  };
}

async function handleGetBuyerDetail(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const buyerId = String(input.buyerId);

  // Try by ID first
  if (mongoose.isValidObjectId(buyerId)) {
    const buyer = await fetchBuyerById(buyerId);
    if (buyer) {
      return {
        summary: `Retrieved details for ${buyer.name}`,
        data: buyer,
      };
    }
  }

  // Fallback: the ID might be stale/invalid — try name lookup if provided
  const buyerName = input.buyerName ? String(input.buyerName) : null;
  if (buyerName) {
    const byName = await Buyer.findOne({
      name: { $regex: `^${buyerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();
    if (byName) {
      const buyer = await fetchBuyerById(String(byName._id));
      if (buyer) {
        return {
          summary: `Retrieved details for ${buyer.name}`,
          data: buyer,
        };
      }
    }
  }

  return { summary: "Buyer not found", data: null };
}

async function handleGetContractDetail(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const contractId = String(input.contractId);

  if (!mongoose.isValidObjectId(contractId)) {
    return { summary: "Invalid contract ID", data: null };
  }

  const contract = await fetchContractById(contractId);
  if (!contract) {
    return { summary: "Contract not found", data: null };
  }

  return {
    summary: `Retrieved contract: ${contract.title}`,
    data: contract,
  };
}

async function handleQueryKeyPersonnel(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const limit = Math.min(Number(input.limit) || 10, 20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (input.buyerId) {
    if (!mongoose.isValidObjectId(String(input.buyerId))) {
      return { summary: "Invalid buyer ID", data: null };
    }
    query.buyerId = new mongoose.Types.ObjectId(String(input.buyerId));
  }
  if (input.role) {
    query.role = { $regex: String(input.role), $options: "i" };
  }

  const personnel = await KeyPersonnel.find(query)
    .sort({ confidence: -1 })
    .limit(limit)
    .lean();

  return {
    summary: `Found ${personnel.length} personnel`,
    data: personnel,
  };
}

async function handleQuerySpendData(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const buyerId = String(input.buyerId);

  if (!mongoose.isValidObjectId(buyerId)) {
    return { summary: "Invalid buyer ID", data: null };
  }

  const objectId = new mongoose.Types.ObjectId(buyerId);

  // Try SpendSummary first (pre-computed)
  const summary = await SpendSummary.findOne({ buyerId: objectId }).lean();

  if (summary) {
    return {
      summary: `Retrieved spending data for buyer (${summary.totalTransactions} transactions, GBP ${(summary.totalSpend ?? 0).toLocaleString()})`,
      data: summary,
    };
  }

  // Fallback: aggregate from SpendTransaction
  const agg = await SpendTransaction.aggregate([
    { $match: { buyerId: objectId } },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: "$amount" },
        totalTransactions: { $sum: 1 },
        topVendors: {
          $push: { vendor: "$vendor", amount: "$amount" },
        },
      },
    },
  ]);

  if (agg.length === 0) {
    return { summary: "No spending data found for this buyer", data: null };
  }

  return {
    summary: `Retrieved spending data for buyer (${agg[0].totalTransactions} transactions, GBP ${(agg[0].totalSpend ?? 0).toLocaleString()})`,
    data: agg[0],
  };
}

async function handleQueryBoardDocuments(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const limit = Math.min(Number(input.limit) || 10, 20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (input.buyerId) {
    if (!mongoose.isValidObjectId(String(input.buyerId))) {
      return { summary: "Invalid buyer ID", data: null };
    }
    query.buyerId = new mongoose.Types.ObjectId(String(input.buyerId));
  }
  if (input.committeeName) {
    query.committeeName = {
      $regex: String(input.committeeName),
      $options: "i",
    };
  }
  if (input.dateFrom || input.dateTo) {
    query.meetingDate = {};
    if (input.dateFrom)
      query.meetingDate.$gte = new Date(String(input.dateFrom));
    if (input.dateTo)
      query.meetingDate.$lte = new Date(String(input.dateTo));
  }

  const docs = await BoardDocument.find(query)
    .sort({ meetingDate: -1 })
    .limit(limit)
    .select("title meetingDate committeeName documentType sourceUrl buyerId")
    .lean();

  return {
    summary: `Found ${docs.length} board documents`,
    data: docs,
  };
}

function handleWebSearch(): ToolResult {
  return {
    summary:
      "Web search is not yet implemented. Please try rephrasing your question to use internal data tools instead.",
    data: null,
  };
}

async function handleCreateScanner(
  input: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const name = String(input.name);
  const type = String(input.type) as "rfps" | "meetings" | "buyers";

  if (!["rfps", "meetings", "buyers"].includes(type)) {
    return { summary: `Invalid scanner type: ${type}`, data: null };
  }

  const scanner = await Scanner.create({
    userId,
    name,
    type,
    searchQuery: input.searchQuery ? String(input.searchQuery) : "",
    description: input.description ? String(input.description) : "",
  });

  return {
    summary: `Created scanner "${name}" (${type})`,
    data: { _id: scanner._id, name, type },
    action: { type: "navigate", url: `/scanners/${scanner._id}` },
  };
}

async function handleApplyScannerFilter(
  input: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const scannerId = String(input.scannerId);

  if (!mongoose.isValidObjectId(scannerId)) {
    return { summary: "Invalid scanner ID", data: null };
  }

  const filters = input.filters as Record<string, unknown> | undefined;
  if (!filters) {
    return { summary: "No filters provided", data: null };
  }

  const scanner = await Scanner.findOneAndUpdate(
    { _id: scannerId, userId },
    { $set: { filters } },
    { new: true }
  );

  if (!scanner) {
    return { summary: "Scanner not found or access denied", data: null };
  }

  return {
    summary: `Applied filters to scanner "${scanner.name}"`,
    data: { filters },
  };
}

async function handleAddScannerColumn(
  input: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const scannerId = String(input.scannerId);
  const name = String(input.name);
  const prompt = String(input.prompt);

  if (!mongoose.isValidObjectId(scannerId)) {
    return { summary: "Invalid scanner ID", data: null };
  }

  const columnId = nanoid();

  const scanner = await Scanner.findOneAndUpdate(
    { _id: scannerId, userId },
    { $push: { aiColumns: { columnId, name, prompt } } },
    { new: true }
  );

  if (!scanner) {
    return { summary: "Scanner not found or access denied", data: null };
  }

  return {
    summary: `Added AI column "${name}" to scanner "${scanner.name}"`,
    data: { columnId, name, prompt },
  };
}
