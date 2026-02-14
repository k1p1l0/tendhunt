import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";
import Buyer from "@/models/buyer";
import Signal from "@/models/signal";
import OfstedSchool from "@/models/ofsted-school";

export interface ContractFilters {
  query?: string;
  sector?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  stage?: string;
  status?: string;
  contractType?: string;
  smeOnly?: boolean;
  vcoOnly?: boolean;
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
    const sanitized = filters.query.replace(/"/g, "").replace(/\s+/g, " ").trim();
    if (sanitized) {
      conditions.push({ $text: { $search: sanitized } });
    }
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

  if (filters.stage) {
    conditions.push({ stage: filters.stage });
  }

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  if (filters.contractType) {
    conditions.push({ contractType: filters.contractType });
  }

  if (filters.smeOnly) {
    conditions.push({ suitableForSme: true });
  }

  if (filters.vcoOnly) {
    conditions.push({ suitableForVco: true });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  // Determine sort order
  const sortOrder: Record<string, 1 | -1> =
    filters.sort === "score"
      ? { vibeScore: -1, publishedDate: -1 }
      : { publishedDate: -1 };

  // Execute queries in parallel — skip pagination when pageSize is 0 (return all)
  const baseQuery = Contract.find(query).sort(sortOrder).select("-rawData");
  if (pageSize > 0) {
    baseQuery.skip((page - 1) * pageSize).limit(pageSize);
  }

  const [contracts, filteredCount, totalCount] = await Promise.all([
    baseQuery.lean(),
    Contract.countDocuments(query),
    Contract.estimatedDocumentCount(),
  ]);

  // Batch-populate buyer logoUrl for contracts that have a buyerId
  const buyerIds = contracts
    .map((c) => c.buyerId)
    .filter((id): id is mongoose.Types.ObjectId => id != null);

  let buyerLogoMap = new Map<string, string>();
  if (buyerIds.length > 0) {
    const buyers = await Buyer.find({ _id: { $in: buyerIds } })
      .select("_id logoUrl")
      .lean();
    buyerLogoMap = new Map(
      buyers
        .filter((b) => b.logoUrl)
        .map((b) => [String(b._id), b.logoUrl as string])
    );
  }

  const contractsWithLogos = contracts.map((c) => ({
    ...c,
    buyerLogoUrl: c.buyerId ? buyerLogoMap.get(String(c.buyerId)) ?? null : null,
  }));

  return { contracts: contractsWithLogos, filteredCount, totalCount };
}

export async function fetchContractById(id: string) {
  await dbConnect();

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const contract = await Contract.findById(id).select("-rawData").lean();
  if (!contract) return null;

  // Resolve buyer data via buyerId (preferred) or nameLower fallback (pre-backfill contracts)
  const buyerSelect = "name sector region orgType orgSubType website logoUrl enrichmentScore linkedinUrl contractCount description address industry staffCount annualBudget contacts linkedin enrichmentSources lastEnrichedAt democracyPortalUrl boardPapersUrl";

  let buyer = null;
  if (contract.buyerId) {
    buyer = await Buyer.findById(contract.buyerId)
      .select(buyerSelect)
      .lean();
  }
  if (!buyer && contract.buyerName) {
    buyer = await Buyer.findOne({ nameLower: contract.buyerName.toLowerCase().trim() })
      .select(buyerSelect)
      .lean();
  }

  // Fetch Ofsted context for education-sector contracts
  let ofstedContext = null;
  const isEducation =
    contract.sector === "Education" ||
    (contract.cpvCodes as string[] | undefined)?.some((c: string) => c.startsWith("80"));

  const buyerOid = buyer?._id ?? contract.buyerId;
  if (isEducation && buyerOid) {
    const schools = await OfstedSchool.find({ buyerId: buyerOid })
      .select("name overallEffectiveness qualityOfEducation behaviourAndAttitudes personalDevelopment leadershipAndManagement")
      .lean();

    if (schools.length > 0) {
      const belowGood = schools.filter((s) => {
        const ratings = [
          s.overallEffectiveness,
          s.qualityOfEducation,
          s.behaviourAndAttitudes,
          s.personalDevelopment,
          s.leadershipAndManagement,
        ].filter((r): r is number => r != null);
        return ratings.some((r) => r >= 3);
      });

      ofstedContext = {
        totalSchools: schools.length,
        belowGoodCount: belowGood.length,
        schools: belowGood
          .map((s) => {
            const ratings = [
              s.overallEffectiveness,
              s.qualityOfEducation,
              s.behaviourAndAttitudes,
              s.personalDevelopment,
              s.leadershipAndManagement,
            ].filter((r): r is number => r != null);
            return {
              name: s.name,
              worstRating: Math.max(...ratings),
            };
          })
          .sort((a, b) => b.worstRating - a.worstRating)
          .slice(0, 10),
      };
    }
  }

  return { ...contract, buyer, ofstedContext };
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
