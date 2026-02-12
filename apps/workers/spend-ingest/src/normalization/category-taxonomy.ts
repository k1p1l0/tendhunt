// ---------------------------------------------------------------------------
// Spend category normalization (~25 high-level categories)
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Array<[string[], string]> = [
  [
    ["it", "computer", "software", "digital", "technology", "cyber", "ict", "data", "cloud", "telecom"],
    "IT & Digital",
  ],
  [
    ["professional service", "advisory", "audit", "accountancy"],
    "Professional Services",
  ],
  [
    ["consultancy", "consultant", "consulting"],
    "Consultancy",
  ],
  [
    ["facilities", "maintenance", "cleaning", "security guard", "building maintenance", "pest", "janitorial"],
    "Facilities & Maintenance",
  ],
  [
    ["construction", "capital", "building work", "refurbishment", "civil engineering"],
    "Construction & Capital Works",
  ],
  [
    ["transport", "fleet", "vehicle", "travel", "fuel", "highways", "road"],
    "Transport & Fleet",
  ],
  [
    ["health", "social care", "care home", "domiciliary", "nursing", "clinical", "medical", "pharmacy", "ambulance"],
    "Healthcare & Social Care",
  ],
  [
    ["education", "training", "school", "learning", "apprentice", "tuition"],
    "Education & Training",
  ],
  [
    ["energy", "utilit", "electric", "gas", "water", "waste collection"],
    "Energy & Utilities",
  ],
  [
    ["waste", "recycling", "refuse", "disposal"],
    "Waste Management",
  ],
  [
    ["legal", "solicitor", "barrister", "litigation"],
    "Legal Services",
  ],
  [
    ["financial", "banking", "treasury", "pension", "actuarial"],
    "Financial Services",
  ],
  [
    ["hr", "human resource", "recruitment", "staffing", "agency staff", "temporary staff", "payroll"],
    "HR & Recruitment",
  ],
  [
    ["communication", "marketing", "advertising", "public relation", "media", "print"],
    "Communications & Marketing",
  ],
  [
    ["environmental", "ecology", "flood", "drainage", "parks", "green space"],
    "Environmental Services",
  ],
  [
    ["housing", "homelessness", "tenant", "sheltered", "accommodation"],
    "Housing",
  ],
  [
    ["planning", "development", "regeneration", "urban"],
    "Planning & Development",
  ],
  [
    ["culture", "leisure", "library", "museum", "sport", "recreation", "arts"],
    "Cultural & Leisure",
  ],
  [
    ["emergency", "fire", "rescue", "police", "civil contingenc"],
    "Emergency Services",
  ],
  [
    ["catering", "hospitality", "food", "meals"],
    "Catering & Hospitality",
  ],
  [
    ["office supplies", "equipment", "stationery", "furniture", "uniform"],
    "Office Supplies & Equipment",
  ],
  [
    ["insurance"],
    "Insurance",
  ],
  [
    ["grant", "subsid", "funding", "contribution"],
    "Grants & Subsidies",
  ],
  [
    ["property", "estate", "rent", "lease", "premises"],
    "Property & Estates",
  ],
];

/**
 * Normalize a raw category string to one of ~25 high-level categories.
 * Uses keyword matching (case-insensitive).
 * Returns "Other" if no keyword matches.
 */
export function normalizeCategory(raw: string): string {
  if (!raw || typeof raw !== "string") return "Other";

  const lower = raw.toLowerCase().trim();
  if (lower.length === 0) return "Other";

  for (const [keywords, category] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  return "Other";
}
