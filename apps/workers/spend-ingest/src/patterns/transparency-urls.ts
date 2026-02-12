// ---------------------------------------------------------------------------
// Pattern registry: orgType → URL path patterns to probe for transparency pages
// ---------------------------------------------------------------------------

export interface TransparencyUrlPattern {
  name: string;
  paths: string[];
  priority: number;
}

export type DiscoveryMethod = "pattern_match" | "ai_discovery" | "none";

export interface PatternDiscoveryResult {
  transparencyUrl: string | null;
  csvLinks: string[];
  method: DiscoveryMethod;
  patternName?: string;
}

const LOCAL_COUNCIL_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "council_transparency_spending",
    priority: 1,
    paths: [
      "/council/transparency/spending",
      "/transparency/spending",
      "/about-the-council/transparency/spending-and-procurement",
    ],
  },
  {
    name: "council_payments",
    priority: 2,
    paths: [
      "/payments-over-500",
      "/spending-over-500",
      "/spending-over-250",
      "/payments-over-250",
    ],
  },
  {
    name: "council_open_data",
    priority: 3,
    paths: [
      "/open-data/spending",
      "/open-data/council-spending",
      "/opendata/spending",
    ],
  },
  {
    name: "council_transparency_generic",
    priority: 4,
    paths: [
      "/transparency",
      "/transparency-and-open-data",
      "/your-council/transparency",
      "/about-the-council/transparency",
    ],
  },
];

const NHS_TRUST_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "nhs_spending_25k",
    priority: 1,
    paths: [
      "/about-us/freedom-of-information/spending-over-25000",
      "/about-us/spending-over-25-000",
      "/about-us/spending-over-25000",
    ],
  },
  {
    name: "nhs_spending_money",
    priority: 2,
    paths: [
      "/about-us/how-we-spend-our-money",
      "/about-us/spending",
      "/about-us/our-spending",
    ],
  },
  {
    name: "nhs_publications",
    priority: 3,
    paths: [
      "/publications/spending",
      "/about-us/publications/spending",
    ],
  },
];

const NHS_ICB_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "icb_spending",
    priority: 1,
    paths: [
      "/about-us/how-we-spend-public-money",
      "/about-us/spending-reports",
      "/about-us/spending-over-25000",
    ],
  },
  {
    name: "icb_transparency",
    priority: 2,
    paths: [
      "/about-us/transparency",
      "/transparency/spending",
    ],
  },
];

const FIRE_RESCUE_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "fire_transparency",
    priority: 1,
    paths: [
      "/about-us/transparency",
      "/transparency/spending",
      "/about-us/transparency/spending-over-500",
    ],
  },
];

const POLICE_PCC_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "police_spending",
    priority: 1,
    paths: [
      "/transparency/spending",
      "/about-us/what-we-spend",
      "/transparency/payments-over-500",
    ],
  },
];

const COMBINED_AUTHORITY_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "combined_authority_spending",
    priority: 1,
    paths: [
      "/transparency/spending",
      "/about-us/how-we-spend-public-money",
      "/about-us/transparency",
    ],
  },
];

const UNIVERSITY_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "university_spending",
    priority: 1,
    paths: [
      "/about/transparency",
      "/about-us/transparency",
      "/governance/transparency",
      "/about/spending",
    ],
  },
];

const FE_COLLEGE_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "fe_spending",
    priority: 1,
    paths: [
      "/about-us/transparency",
      "/about/transparency",
      "/transparency",
    ],
  },
];

const MAT_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "mat_spending",
    priority: 1,
    paths: [
      "/about-us/transparency",
      "/transparency",
      "/about/spending",
    ],
  },
];

const ALB_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "alb_spending",
    priority: 1,
    paths: [
      "/about-us/transparency",
      "/transparency/spending",
      "/about-us/spending",
      "/spending",
    ],
  },
];

const NATIONAL_PARK_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "national_park_spending",
    priority: 1,
    paths: [
      "/about-us/transparency",
      "/transparency",
      "/about-us/spending",
    ],
  },
];

const PATTERN_REGISTRY: Record<string, TransparencyUrlPattern[]> = {
  local_council: LOCAL_COUNCIL_PATTERNS,
  nhs_trust: NHS_TRUST_PATTERNS,
  nhs_icb: NHS_ICB_PATTERNS,
  fire_rescue: FIRE_RESCUE_PATTERNS,
  police_pcc: POLICE_PCC_PATTERNS,
  combined_authority: COMBINED_AUTHORITY_PATTERNS,
  university: UNIVERSITY_PATTERNS,
  fe_college: FE_COLLEGE_PATTERNS,
  mat: MAT_PATTERNS,
  alb: ALB_PATTERNS,
  national_park: NATIONAL_PARK_PATTERNS,
};

/**
 * Get URL patterns for an org type. Resolves subtypes like
 * `local_council_metro` → `local_council` base patterns.
 */
export function getPatternsForOrgType(
  orgType: string | undefined
): TransparencyUrlPattern[] {
  if (!orgType) return [];

  // Direct match
  if (PATTERN_REGISTRY[orgType]) {
    return PATTERN_REGISTRY[orgType];
  }

  // Subtype resolution: strip last segment and try parent
  // e.g. "local_council_london" → "local_council"
  // e.g. "nhs_trust_acute" → "nhs_trust"
  const segments = orgType.split("_");
  for (let i = segments.length - 1; i >= 1; i--) {
    const parentType = segments.slice(0, i).join("_");
    if (PATTERN_REGISTRY[parentType]) {
      return PATTERN_REGISTRY[parentType];
    }
  }

  return [];
}
