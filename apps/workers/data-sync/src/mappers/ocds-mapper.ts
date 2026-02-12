import type { OcdsRelease, MappedContract } from "../types";

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
    rawData: release,
  };
}
