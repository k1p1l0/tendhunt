import type {
  OcdsRelease,
  MappedContract,
  MappedContractDocument,
  MappedContractLot,
  MappedContractLotCriterion,
  MappedBuyerContact,
  MappedAwardedSupplier,
} from "../types";

// ---------------------------------------------------------------------------
// CPV 2-digit division -> sector mapping (EU standard vocabulary)
// Full map ported from Phase 2 scripts/lib/ocds-mapper.ts
// ---------------------------------------------------------------------------

const CPV_SECTOR_MAP: Record<string, string> = {
  "03": "Agriculture & Forestry",
  "09": "Energy",
  "14": "Mining",
  "15": "Food & Beverages",
  "18": "Clothing & Textiles",
  "22": "Publishing & Printing",
  "24": "Chemicals",
  "30": "IT Equipment",
  "31": "Electrical Equipment",
  "32": "Telecoms",
  "33": "Medical Equipment",
  "34": "Transport Equipment",
  "35": "Security & Defence",
  "37": "Musical & Sports Equipment",
  "38": "Laboratory Equipment",
  "39": "Furniture",
  "41": "Water",
  "42": "Industrial Machinery",
  "43": "Mining Machinery",
  "44": "Construction Materials",
  "45": "Construction",
  "48": "Software",
  "50": "Repair & Maintenance",
  "51": "Installation",
  "55": "Hospitality",
  "60": "Transport",
  "63": "Transport Support",
  "64": "Postal & Telecom",
  "65": "Utilities",
  "66": "Financial Services",
  "70": "Real Estate",
  "71": "Architecture & Engineering",
  "72": "IT Services",
  "73": "R&D",
  "75": "Public Administration",
  "76": "Oil & Gas",
  "77": "Agriculture Services",
  "79": "Business Services",
  "80": "Education",
  "85": "Health & Social",
  "90": "Environmental Services",
  "92": "Recreation & Culture",
  "98": "Other Services",
};

/**
 * Derive a human-readable sector name from the first two digits of a CPV code.
 */
export function deriveSectorFromCpv(cpvCode?: string): string | undefined {
  if (!cpvCode) return undefined;
  const division = cpvCode.slice(0, 2);
  return CPV_SECTOR_MAP[division];
}

// ---------------------------------------------------------------------------
// Rich field extraction helpers
// ---------------------------------------------------------------------------

function extractDocuments(
  release: OcdsRelease
): MappedContractDocument[] {
  const docs = release.tender?.documents;
  if (!docs || !Array.isArray(docs)) return [];
  return docs.map((d) => ({
    id: d.id ?? undefined,
    documentType: d.documentType ?? undefined,
    title: d.title ?? undefined,
    description: d.description ?? undefined,
    url: d.url ?? undefined,
    datePublished: d.datePublished ?? undefined,
    format: d.format ?? undefined,
  }));
}

function extractLots(release: OcdsRelease): MappedContractLot[] {
  const lots = release.tender?.lots;
  if (!lots || !Array.isArray(lots)) return [];
  return lots.map((lot) => {
    const criteria: MappedContractLotCriterion[] = [];
    const rawCriteria = lot.awardCriteria?.criteria;
    if (rawCriteria && Array.isArray(rawCriteria)) {
      for (const c of rawCriteria) {
        // FaT stores weights in description ("30", "80%"), not in numbers[]
        const numWeight = c.numbers?.[0]?.number ?? null;
        const descWeight =
          numWeight == null && c.description
            ? parseFloat(c.description.replace("%", ""))
            : null;
        const weight = numWeight ?? descWeight;
        criteria.push({
          name: c.name ?? c.type ?? "Unknown",
          criteriaType: c.type ?? "unknown",
          weight: weight != null && isFinite(weight) ? weight : null,
        });
      }
    }

    const variantPolicy =
      lot.submissionTerms?.variantPolicy ?? lot.variants?.policy ?? null;

    return {
      lotId: lot.id ?? "",
      title: lot.title ?? null,
      description: lot.description ?? null,
      value: lot.value?.amount ?? null,
      currency: lot.value?.currency ?? "GBP",
      contractPeriodDays: lot.contractPeriod?.durationInDays ?? null,
      hasRenewal: lot.renewal?.description != null,
      renewalDescription: lot.renewal?.description ?? null,
      hasOptions: lot.options?.description != null,
      optionsDescription: lot.options?.description ?? null,
      variantPolicy,
      status: lot.status ?? null,
      awardCriteria: criteria,
    };
  });
}

function extractBuyerContact(
  release: OcdsRelease
): MappedBuyerContact | null {
  const buyerParty = release.parties?.find((p) =>
    p.roles?.some((r) => r.toLowerCase() === "buyer")
  );
  const cp = buyerParty?.contactPoint;
  if (!cp || (!cp.name && !cp.email && !cp.telephone)) return null;
  return {
    name: cp.name ?? null,
    email: cp.email ?? null,
    telephone: cp.telephone ?? null,
  };
}

// ---------------------------------------------------------------------------
// Contract enrichment extraction helpers
// ---------------------------------------------------------------------------

function mapContractType(
  category?: string
): "goods" | "services" | "works" | null {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c === "goods") return "goods";
  if (c === "services") return "services";
  if (c === "works") return "works";
  return null;
}

function detectSmeEligibility(
  eligibility?: string,
  description?: string
): boolean | null {
  const text = `${eligibility ?? ""} ${description ?? ""}`.toLowerCase();
  if (/\bnot\s+(suitable|eligible)\s+(for\s+)?sme/i.test(text)) return false;
  if (/\bsme\b|small\s*(and|&)?\s*medium|small\s+business/i.test(text))
    return true;
  return null;
}

function detectVcoEligibility(
  eligibility?: string,
  description?: string
): boolean | null {
  const text = `${eligibility ?? ""} ${description ?? ""}`.toLowerCase();
  if (/\bvcse\b|\bvco\b|voluntary|community\s+organisation|social\s+enterprise|charit(y|ies|able)/i.test(text))
    return true;
  return null;
}

function detectEuFunding(description?: string): boolean {
  const text = (description ?? "").toLowerCase();
  return /\beu\s+fund|\beuropean\s+fund|\bhorizon\b|\berasmus\b|\blife\s+programme\b|\besf\b|\berdf\b|\beu\s+grant/i.test(
    text
  );
}

function extractRenewalFromLots(
  lots: MappedContractLot[]
): { canRenew: boolean; renewalDescription: string | null } {
  for (const lot of lots) {
    if (lot.hasRenewal) {
      return { canRenew: true, renewalDescription: lot.renewalDescription };
    }
  }
  return { canRenew: false, renewalDescription: null };
}

function extractAwardedSuppliers(
  release: OcdsRelease
): MappedAwardedSupplier[] {
  const awards = release.awards;
  if (!awards || !Array.isArray(awards)) return [];
  const suppliers: MappedAwardedSupplier[] = [];
  for (const award of awards) {
    if (!award.suppliers) continue;
    for (const s of award.suppliers) {
      if (s.name) {
        suppliers.push({ name: s.name, supplierId: s.id ?? null });
      }
    }
  }
  return suppliers;
}

function extractAwardDate(release: OcdsRelease): Date | null {
  const date = release.awards?.[0]?.date;
  return date ? new Date(date) : null;
}

function extractAwardValue(release: OcdsRelease): number | null {
  const val = release.awards?.[0]?.value?.amount;
  return val != null && isFinite(val) ? val : null;
}

// ---------------------------------------------------------------------------
// Status & stage mapping helpers
// ---------------------------------------------------------------------------

function mapStatus(
  tenderStatus?: string
): "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED" {
  if (!tenderStatus) return "OPEN";
  const s = tenderStatus.toLowerCase();
  if (s === "active" || s === "open") return "OPEN";
  if (s === "closed" || s === "complete") return "CLOSED";
  if (s === "cancelled") return "CANCELLED";
  if (s === "awarded") return "AWARDED";
  return "OPEN";
}

function mapStage(tags?: string[]): "PLANNING" | "TENDER" | "AWARD" {
  if (!tags || tags.length === 0) return "TENDER";
  const joined = tags.join(",").toLowerCase();
  if (joined.includes("planning")) return "PLANNING";
  if (joined.includes("award")) return "AWARD";
  return "TENDER";
}

// ---------------------------------------------------------------------------
// Contract period extraction (start/end dates)
// Priority: awards[0].contractPeriod > tender.contractPeriod
// ---------------------------------------------------------------------------

function extractContractStartDate(release: OcdsRelease): Date | null {
  const awardStart = release.awards?.[0]?.contractPeriod?.startDate;
  if (awardStart) return new Date(awardStart);
  const tenderStart = release.tender?.contractPeriod?.startDate;
  if (tenderStart) return new Date(tenderStart);
  return null;
}

function extractContractEndDate(release: OcdsRelease): Date | null {
  const awardEnd = release.awards?.[0]?.contractPeriod?.endDate;
  if (awardEnd) return new Date(awardEnd);
  const tenderEnd = release.tender?.contractPeriod?.endDate;
  if (tenderEnd) return new Date(tenderEnd);
  return null;
}

// ---------------------------------------------------------------------------
// Contract mechanism classification
// ---------------------------------------------------------------------------

/**
 * Classify contract procurement mechanism from OCDS data.
 * Priority: procurementMethodDetails (most reliable) > title patterns.
 */
export function classifyContractMechanism(
  procurementMethodDetails: string | null | undefined,
  title: string
): "standard" | "dps" | "framework" | "call_off_dps" | "call_off_framework" {
  const pmd = procurementMethodDetails?.toLowerCase() ?? "";

  // Signal 1: procurementMethodDetails (most reliable)
  if (pmd.includes("call-off from a dynamic purchasing system")) {
    return "call_off_dps";
  }
  if (pmd.includes("call-off from a framework agreement")) {
    return "call_off_framework";
  }

  // Signal 2: Title pattern matching (word boundaries to avoid false positives)
  if (/\bdynamic purchasing system\b/i.test(title) || /\bDPS\b/.test(title)) {
    return "dps";
  }
  if (/\bframework\s+agreement\b/i.test(title)) {
    return "framework";
  }
  if (/\bframework\b/i.test(title)) {
    return "framework";
  }

  return "standard";
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

/**
 * Map an OCDS release object to a MappedContract ready for upsert.
 * Handles all optional / missing fields with safe fallbacks.
 * Returns plain objects (not Mongoose documents) for use with native MongoDB driver.
 */
export function mapOcdsToContract(
  release: OcdsRelease,
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER"
): MappedContract {
  // Find buyer party (role matching is case-insensitive for resilience)
  const buyerParty = release.parties?.find((p) =>
    p.roles?.some((r) => r.toLowerCase() === "buyer")
  );

  // Collect CPV codes from items and top-level classification
  const itemCpvCodes: string[] =
    release.tender?.items
      ?.map((item) => item.classification?.id)
      .filter((id): id is string => Boolean(id)) ?? [];

  const topLevelCpv = release.tender?.classification?.id;
  if (topLevelCpv && !itemCpvCodes.includes(topLevelCpv)) {
    itemCpvCodes.unshift(topLevelCpv);
  }

  // Build sourceUrl
  const noticeId = release.id ?? "";
  const sourceUrl =
    source === "FIND_A_TENDER"
      ? `https://www.find-tender.service.gov.uk/Notice/${noticeId}`
      : `https://www.contractsfinder.service.gov.uk/Notice/${noticeId}`;

  // Determine buyer name with cascading fallbacks
  const buyerName =
    buyerParty?.name ?? release.buyer?.name ?? "Unknown";

  // Extract buyer org ID from party data
  const buyerOrg = buyerParty?.id ?? release.buyer?.id ?? null;

  // Value extraction
  const amount = release.tender?.value?.amount ?? null;
  const minAmount = release.tender?.minValue?.amount ?? null;

  // Rich procurement fields
  const documents = extractDocuments(release);
  const lots = extractLots(release);
  const buyerContact = extractBuyerContact(release);

  const maxLotsBid = release.tender?.lotDetails?.maximumLotsBidPerSupplier;
  const maxLotsBidPerSupplier =
    maxLotsBid != null && isFinite(maxLotsBid) ? maxLotsBid : null;

  // Contract enrichment fields
  const contractType = mapContractType(
    release.tender?.mainProcurementCategory
  );
  const eligibility = release.tender?.eligibilityCriteria ?? null;
  const desc = release.tender?.description ?? null;
  const suitableForSme = detectSmeEligibility(eligibility ?? undefined, desc ?? undefined);
  const suitableForVco = detectVcoEligibility(eligibility ?? undefined, desc ?? undefined);
  const hasEuFunding = detectEuFunding(desc ?? undefined);
  const { canRenew, renewalDescription } = extractRenewalFromLots(lots);
  const awardedSuppliers = extractAwardedSuppliers(release);
  const awardDate = extractAwardDate(release);
  const awardValue = extractAwardValue(release);
  const tenderPeriodStart = release.tender?.tenderPeriod?.startDate
    ? new Date(release.tender.tenderPeriod.startDate)
    : null;
  const enquiryPeriodEnd = release.tender?.enquiryPeriod?.endDate
    ? new Date(release.tender.enquiryPeriod.endDate)
    : null;
  const geographicScope = buyerParty?.address?.region ?? null;

  return {
    ocid: release.ocid ?? null,
    noticeId,
    source,
    sourceUrl,
    title: release.tender?.title ?? "Untitled",
    description: release.tender?.description ?? null,
    status: mapStatus(release.tender?.status),
    stage: mapStage(release.tag),
    buyerName,
    buyerOrg,
    buyerRegion: buyerParty?.address?.region ?? null,
    cpvCodes: itemCpvCodes,
    sector: deriveSectorFromCpv(itemCpvCodes[0]),
    valueMin: minAmount ?? amount,
    valueMax: amount,
    currency: release.tender?.value?.currency ?? "GBP",
    publishedDate: release.date ? new Date(release.date) : null,
    deadlineDate: release.tender?.tenderPeriod?.endDate
      ? new Date(release.tender.tenderPeriod.endDate)
      : null,
    contractStartDate: extractContractStartDate(release),
    contractEndDate: extractContractEndDate(release),
    rawData: release,
    procurementMethod: release.tender?.procurementMethod ?? null,
    procurementMethodDetails: release.tender?.procurementMethodDetails ?? null,
    contractMechanism: classifyContractMechanism(
      release.tender?.procurementMethodDetails,
      release.tender?.title ?? "Untitled"
    ),
    submissionMethod: release.tender?.submissionMethod ?? [],
    submissionPortalUrl: release.tender?.submissionMethodDetails ?? null,
    buyerContact,
    documents,
    lots,
    lotCount: lots.length,
    maxLotsBidPerSupplier,

    // Contract enrichment fields
    contractType,
    suitableForSme,
    suitableForVco,
    hasEuFunding,
    canRenew,
    renewalDescription,
    geographicScope,
    awardedSuppliers,
    awardDate,
    awardValue,
    tenderPeriodStart,
    enquiryPeriodEnd,
  };
}
