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
      "/council-and-mayor/council-spending-and-performance/spending-over-500",
      "/council/council-spending-and-performance/spending-over-500",
      "/about-the-council/finance-and-budget/spending",
      "/about-the-council/finance-and-budget/spending/invoices-over-250",
      "/performance-and-spending/our-financial-plans/spending-over-500",
      "/your-council/performance-and-spending/our-financial-plans/spending-over-500",
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
      "/your-council/finance/payments-suppliers",
      "/about-the-council/budgets-and-spending/spending-and-payments",
      "/council-spending-and-performance",
      "/your-council/budgets-and-spending",
      "/about-us/what-we-spend",
    ],
  },
  {
    name: "council_open_data",
    priority: 3,
    paths: [
      "/open-data/spending",
      "/open-data/council-spending",
      "/opendata/spending",
      "/publication-scheme",
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
      "/about-us/information-governance/freedom-information/spending-over-25000",
      "/about-us/freedom-of-information/expenditure-over-25-000",
      "/about-us/freedom-of-information/expenditure-over-25000",
      "/spending-over-25k",
    ],
  },
  {
    name: "nhs_spending_money",
    priority: 2,
    paths: [
      "/about-us/how-we-spend-our-money",
      "/about-us/spending",
      "/about-us/our-spending",
      "/about-us/guide-information-publication-scheme/transparency-spending",
      "/about-us/key-documents/investing-money-in-your-care",
      "/about-us/corporate-publications/financial-transparency",
      "/what-we-spend",
      "/what-we-spend-and-how-we-spend-it",
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
      "/your-service/transparency/what-we-spend",
      "/about-us/what-we-spend",
      "/about-us/what-we-spend/spend-over-ps500",
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
      "/about-us/democracy-funding-transparency/financial-information",
      "/what-we-do/budget-spending-transparency",
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

const CENTRAL_GOVERNMENT_PATTERNS: TransparencyUrlPattern[] = [
  {
    name: "govuk_spending_25k",
    priority: 1,
    paths: [
      "/government/collections/spending-over-25-000",
      "/government/publications/spending-over-25-000",
    ],
  },
  {
    name: "govuk_transparency",
    priority: 2,
    paths: [
      "/government/collections/transparency-data",
      "/transparency",
    ],
  },
];

// Dynamic slug map: buyer name → GOV.UK URL slug for department-specific spending pages
const GOVUK_DEPT_SLUG_MAP: Record<string, string> = {
  "ministry of defence": "mod",
  "hm revenue & customs": "hmrc",
  "hm revenue and customs": "hmrc",
  "hm treasury": "hm-treasury",
  "home office": "home-office",
  "ministry of justice": "ministry-of-justice",
  "department for education": "department-for-education-dfe",
  "department of health and social care": "dhsc",
  "department for transport": "department-for-transport",
  "department for work and pensions": "dwp",
  "department for environment, food & rural affairs": "defra",
  "department for business and trade": "department-for-business-and-trade",
  "foreign, commonwealth & development office": "fcdo",
  "cabinet office": "cabinet-office",
  "hm courts & tribunals service": "hmcts",
  "crown prosecution service": "cps",
  "nhs england": "nhs-england",
};

/**
 * Get GOV.UK department-specific spending publication paths for a buyer.
 * These are the highest-priority patterns for central government.
 */
export function getGovukDeptPaths(buyerName: string): string[] {
  const nameLower = buyerName.toLowerCase();
  for (const [pattern, slug] of Object.entries(GOVUK_DEPT_SLUG_MAP)) {
    if (nameLower.includes(pattern)) {
      // GOV.UK uses patterns like /government/publications/mod-spending-over-25000-january-to-december-YYYY
      // and /government/publications/mod-spending-over-25000-YYYY
      const year = new Date().getFullYear();
      return [
        `/government/publications/${slug}-spending-over-25000-january-to-december-${year}`,
        `/government/publications/${slug}-spending-over-25000-${year}`,
        `/government/publications/${slug}-spending-over-25000-january-to-december-${year - 1}`,
        `/government/publications/${slug}-spending-over-25-000`,
        `/government/publications/${slug}-spending-over-25000`,
      ];
    }
  }
  return [];
}

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
  central_government: CENTRAL_GOVERNMENT_PATTERNS,
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
