import type { IContract } from "../../src/models/contract";

// ---------------------------------------------------------------------------
// OCDS Release type (all nested fields optional for resilience)
// ---------------------------------------------------------------------------

export interface OcdsRelease {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  language?: string;
  initiationType?: string;

  tender?: {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    minValue?: { amount?: number; currency?: string };
    tenderPeriod?: { startDate?: string; endDate?: string };
    classification?: { id?: string; description?: string; scheme?: string };
    items?: Array<{
      id?: string;
      description?: string;
      classification?: { id?: string; description?: string; scheme?: string };
    }>;
  };

  parties?: Array<{
    id?: string;
    name?: string;
    roles?: string[];
    address?: {
      streetAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      countryName?: string;
    };
    contactPoint?: {
      name?: string;
      email?: string;
      telephone?: string;
    };
  }>;

  buyer?: {
    id?: string;
    name?: string;
  };

  awards?: Array<{
    id?: string;
    title?: string;
    status?: string;
    date?: string;
    value?: { amount?: number; currency?: string };
    suppliers?: Array<{ id?: string; name?: string }>;
  }>;
}

// ---------------------------------------------------------------------------
// CPV 2-digit division -> sector mapping (EU standard vocabulary)
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
 * Map an OCDS release object to a partial Contract document ready for upsert.
 * Handles all optional / missing fields with safe fallbacks.
 */
export function mapOcdsToContract(
  release: OcdsRelease,
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER"
): Partial<IContract> {
  // Find buyer party
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

  // Value extraction
  const amount = release.tender?.value?.amount;

  return {
    ocid: release.ocid ?? undefined,
    noticeId,
    source,
    sourceUrl,
    title: release.tender?.title ?? "Untitled",
    description: release.tender?.description ?? undefined,
    status: mapStatus(release.tender?.status),
    stage: mapStage(release.tag),
    buyerName,
    buyerRegion: buyerParty?.address?.region ?? undefined,
    cpvCodes: itemCpvCodes,
    sector: deriveSectorFromCpv(itemCpvCodes[0]),
    valueMin: amount ?? undefined,
    valueMax: amount ?? undefined,
    currency: release.tender?.value?.currency ?? "GBP",
    publishedDate: release.date ? new Date(release.date) : undefined,
    deadlineDate: release.tender?.tenderPeriod?.endDate
      ? new Date(release.tender.tenderPeriod.endDate)
      : undefined,
    rawData: release,
  } as Partial<IContract>;
}
