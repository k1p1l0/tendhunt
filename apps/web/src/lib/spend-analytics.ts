import type { ISpendSummary } from "@/models/spend-summary";
import type { ICompanyProfile } from "@/models/company-profile";

// --- Types ---

export interface SpendMetrics {
  totalSpend: number;
  avgMonthlySpend: number;
  topCategory: string | null;
  topVendor: string | null;
  transactionCount: number;
  dateRange: { earliest: string | null; latest: string | null };
  uniqueVendors: number;
  uniqueCategories: number;
}

export interface ProfileMatch {
  matchedCategories: string[];
  totalMatchedSpend: number;
  matchPercentage: number;
}

export interface RecurringPattern {
  vendor: string;
  category: string;
  frequency: "monthly" | "quarterly";
  averageAmount: number;
}

interface VendorConcentration {
  category: string;
  topVendor: string;
  concentrationPercent: number;
  totalCategorySpend: number;
}

interface SpendGrowthSignal {
  category: string;
  currentYearSpend: number;
  priorYearSpend: number;
  growthPercent: number;
}

export interface VendorMixAnalysis {
  sme: { spend: number; count: number; percentage: number };
  large: { spend: number; count: number; percentage: number };
  smeOpennessScore: number;
  signal: "SME-friendly" | "Mixed" | "Large-org dominated";
}

export interface VendorChurnYear {
  year: number;
  newCount: number;
  retainedCount: number;
  lostCount: number;
  totalVendors: number;
  newVendors: string[];
  lostVendors: string[];
}

export interface VendorChurnAnalysis {
  years: VendorChurnYear[];
  vendorStabilityScore: number;
  signal: "High turnover" | "Moderate stability" | "Very stable";
}

export interface SpendOpportunities {
  profileMatch: ProfileMatch | null;
  recurringPatterns: RecurringPattern[];
  vendorConcentration: VendorConcentration[];
  spendGrowthSignals: SpendGrowthSignal[];
  smeOpenness: VendorMixAnalysis | null;
  vendorStability: VendorChurnAnalysis | null;
}

// --- Helpers ---

function formatDateISO(d: Date | undefined | null): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

// --- Main functions ---

export function computeSpendMetrics(summary: ISpendSummary): SpendMetrics {
  const monthlyTotals = summary.monthlyTotals ?? [];
  const categoryBreakdown = summary.categoryBreakdown ?? [];
  const vendorBreakdown = summary.vendorBreakdown ?? [];

  const totalSpend = summary.totalSpend ?? 0;
  const monthCount = monthlyTotals.length || 1;
  const avgMonthlySpend = totalSpend / monthCount;

  const topCat = categoryBreakdown.length > 0
    ? [...categoryBreakdown].sort((a, b) => b.total - a.total)[0]
    : null;

  const topVend = vendorBreakdown.length > 0
    ? [...vendorBreakdown].sort((a, b) => b.total - a.total)[0]
    : null;

  return {
    totalSpend,
    avgMonthlySpend,
    topCategory: topCat?.category ?? null,
    topVendor: topVend?.vendor ?? null,
    transactionCount: summary.totalTransactions ?? 0,
    dateRange: {
      earliest: formatDateISO(summary.dateRange?.earliest),
      latest: formatDateISO(summary.dateRange?.latest),
    },
    uniqueVendors: vendorBreakdown.length,
    uniqueCategories: categoryBreakdown.length,
  };
}

export function computeSpendOpportunities(
  summary: ISpendSummary,
  userProfile: ICompanyProfile | null,
  contractSectors?: string[]
): SpendOpportunities {
  return {
    profileMatch: computeProfileMatch(summary, userProfile, contractSectors),
    recurringPatterns: computeRecurringPatterns(summary),
    vendorConcentration: computeVendorConcentration(summary),
    spendGrowthSignals: computeSpendGrowthSignals(summary),
    smeOpenness: computeVendorMixAnalysis(summary),
    vendorStability: computeVendorChurnAnalysis(summary),
  };
}

// --- Profile Match ---

// Cross-sector keyword mapping: maps profile sector terms to related
// spend category terms found in council accounting codes
const SECTOR_SYNONYMS: Record<string, string[]> = {
  education: ["school", "dsg", "early years", "tuition", "pupil", "academy", "learning", "curriculum", "sen ", "semh", "neet", "college"],
  tutoring: ["tuition", "tutor", "school", "pupil", "learning", "sen "],
  "special educational needs": ["sen ", "semh", "pupil referral", "alternative provision"],
  health: ["nhs", "clinical", "medical", "nursing", "ambulance", "hospital", "care", "therapy"],
  "social care": ["care", "foster", "residential care", "home care", "supported living", "respite", "day care"],
  construction: ["building", "contractor", "maintenance", "repairs", "refurbishment", "demolition"],
  "it services": ["computer", "software", "hardware", "digital", "licence", "cloud", "cyber"],
  software: ["computer software", "licence", "saas", "digital", "application"],
  transport: ["vehicle", "fleet", "hire of transport", "parking"],
  "facilities management": ["cleaning", "security", "grounds maintenance", "catering", "waste"],
  "legal services": ["legal fees", "solicitor", "barrister", "litigation"],
  "financial services": ["audit", "bank", "insurance", "pension", "treasury"],
  consulting: ["consultancy", "consultant", "advisory", "professional fees"],
  housing: ["housing", "tenant", "rent", "void", "leaseholder"],
  "environmental services": ["waste", "recycling", "grounds", "parks", "green"],
};

function expandProfileTerms(terms: string[]): string[] {
  const expanded = new Set(terms);
  for (const term of terms) {
    const synonyms = SECTOR_SYNONYMS[term];
    if (synonyms) {
      for (const s of synonyms) expanded.add(s);
    }
    // Also check partial key matches (e.g. "education management" contains "education")
    for (const [key, synonymList] of Object.entries(SECTOR_SYNONYMS)) {
      if (term.includes(key) || key.includes(term)) {
        for (const s of synonymList) expanded.add(s);
      }
    }
  }
  return [...expanded];
}

function computeProfileMatch(
  summary: ISpendSummary,
  userProfile: ICompanyProfile | null,
  contractSectors?: string[]
): ProfileMatch | null {
  if (!userProfile) return null;

  const rawTerms = [
    ...(userProfile.sectors ?? []),
    ...(userProfile.capabilities ?? []),
    ...(userProfile.keywords ?? []),
  ].map((s) => s.toLowerCase());

  if (rawTerms.length === 0) {
    return { matchedCategories: [], totalMatchedSpend: 0, matchPercentage: 0 };
  }

  const profileTerms = expandProfileTerms(rawTerms);
  const categories = summary.categoryBreakdown ?? [];
  const totalSpend = summary.totalSpend ?? 0;

  const matchedCategories: string[] = [];
  let totalMatchedSpend = 0;

  // Match against spend categories using expanded terms
  if (totalSpend > 0) {
    for (const cat of categories) {
      const catLower = cat.category.toLowerCase();
      const isMatch = profileTerms.some(
        (s) => catLower.includes(s) || s.includes(catLower)
      );
      if (isMatch) {
        matchedCategories.push(cat.category);
        totalMatchedSpend += cat.total;
      }
    }
  }

  // Also match against contract sectors (e.g. "Education & Training")
  if (contractSectors && contractSectors.length > 0) {
    for (const sector of contractSectors) {
      const sectorLower = sector.toLowerCase();
      const alreadyMatched = matchedCategories.some(
        (c) => c.toLowerCase() === sectorLower
      );
      if (alreadyMatched) continue;

      const isMatch = profileTerms.some(
        (s) => sectorLower.includes(s) || s.includes(sectorLower)
      );
      if (isMatch) {
        matchedCategories.push(sector);
      }
    }
  }

  // Calculate spend-based percentage
  let matchPercentage = 0;
  if (totalSpend > 0 && totalMatchedSpend > 0) {
    const rawPercent = (totalMatchedSpend / totalSpend) * 100;
    matchPercentage = rawPercent > 0 && rawPercent < 1
      ? Math.round(rawPercent * 10) / 10
      : Math.round(rawPercent);
  } else if (matchedCategories.length > 0) {
    // Matched via contracts but no spend data overlap — show a base match
    matchPercentage = Math.min(matchedCategories.length * 15, 60);
  }

  return { matchedCategories, totalMatchedSpend, matchPercentage };
}

// --- Recurring Patterns ---

function computeRecurringPatterns(summary: ISpendSummary): RecurringPattern[] {
  // monthlyTotals does not include vendor/category granularity in the schema,
  // so we can only detect category-level recurrence from vendorBreakdown + categoryBreakdown.
  // Since the schema only has aggregate vendor+category breakdowns (not per-month per-vendor),
  // we return empty for now -- this will be enriched when per-month vendor data is available.
  const vendorBreakdown = summary.vendorBreakdown ?? [];
  const monthlyTotals = summary.monthlyTotals ?? [];
  const patterns: RecurringPattern[] = [];

  // Heuristic: vendors that appear with high transaction counts relative to months
  // likely represent recurring spend
  const monthCount = monthlyTotals.length || 1;
  for (const v of vendorBreakdown) {
    if (v.count >= 3 && v.count >= monthCount * 0.5) {
      const avgAmount = v.total / v.count;
      const frequency: "monthly" | "quarterly" =
        v.count >= monthCount * 0.8 ? "monthly" : "quarterly";
      patterns.push({
        vendor: v.vendor,
        category: "", // not available at vendor level
        frequency,
        averageAmount: Math.round(avgAmount * 100) / 100,
      });
    }
  }

  return patterns.slice(0, 10);
}

// --- Vendor Concentration ---

function computeVendorConcentration(
  summary: ISpendSummary
): VendorConcentration[] {
  const vendorBreakdown = summary.vendorBreakdown ?? [];
  const totalSpend = summary.totalSpend ?? 0;
  if (totalSpend === 0 || vendorBreakdown.length === 0) return [];

  const sorted = [...vendorBreakdown].sort((a, b) => b.total - a.total);
  const results: VendorConcentration[] = [];

  // Check if top vendors dominate
  let cumulativeSpend = 0;
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    cumulativeSpend += sorted[i].total;
    const concentrationPercent = Math.round(
      (cumulativeSpend / totalSpend) * 100
    );

    if (concentrationPercent > 60) {
      results.push({
        category: "Overall",
        topVendor: sorted[0].vendor,
        concentrationPercent,
        totalCategorySpend: totalSpend,
      });
      break;
    }
  }

  return results;
}

// --- Spend Growth Signals ---

function computeSpendGrowthSignals(
  summary: ISpendSummary
): SpendGrowthSignal[] {
  const monthlyTotals = summary.monthlyTotals ?? [];
  if (monthlyTotals.length < 13) return []; // Need at least 13 months for YoY

  // Sort chronologically
  const sorted = [...monthlyTotals].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  // Split into recent 12 and prior 12
  const recent12 = sorted.slice(-12);
  const prior12 = sorted.slice(-24, -12);

  if (prior12.length < 6) return []; // Not enough prior data

  const recentTotal = recent12.reduce((sum, m) => sum + m.total, 0);
  const priorTotal = prior12.reduce((sum, m) => sum + m.total, 0);

  if (priorTotal === 0) return [];

  const growthPercent = Math.round(
    ((recentTotal - priorTotal) / priorTotal) * 100
  );

  if (growthPercent > 20) {
    return [
      {
        category: "Overall Spend",
        currentYearSpend: recentTotal,
        priorYearSpend: priorTotal,
        growthPercent,
      },
    ];
  }

  return [];
}

// --- Vendor Mix Analysis ---

export function computeVendorMixAnalysis(summary: ISpendSummary): VendorMixAnalysis | null {
  const breakdown = summary.vendorSizeBreakdown;
  if (!breakdown?.sme && !breakdown?.large) return null;

  const smeSpend = breakdown?.sme?.totalSpend ?? 0;
  const largeSpend = breakdown?.large?.totalSpend ?? 0;
  const total = smeSpend + largeSpend;
  if (total === 0) return null;

  const smePct = Math.round((smeSpend / total) * 100);
  const score = summary.smeOpennessScore ?? smePct;

  let signal: VendorMixAnalysis["signal"] = "Mixed";
  if (smePct > 50) signal = "SME-friendly";
  else if (smePct < 20) signal = "Large-org dominated";

  return {
    sme: { spend: smeSpend, count: breakdown?.sme?.vendorCount ?? 0, percentage: smePct },
    large: { spend: largeSpend, count: breakdown?.large?.vendorCount ?? 0, percentage: 100 - smePct },
    smeOpennessScore: score,
    signal,
  };
}

// --- Vendor Churn Analysis ---

export function computeVendorChurnAnalysis(summary: ISpendSummary): VendorChurnAnalysis | null {
  const sets = summary.yearlyVendorSets;
  if (!sets || sets.length < 2) return null;

  const sorted = [...sets].sort((a, b) => a.year - b.year);
  const years: VendorChurnYear[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevVendors = sorted[i - 1].vendors ?? [];
    const currVendors = sorted[i].vendors ?? [];
    const prevSet = new Set(prevVendors);
    const currSet = new Set(currVendors);
    const retained = [...currSet].filter(v => prevSet.has(v));
    const newVendors = [...currSet].filter(v => !prevSet.has(v));
    const lost = [...prevSet].filter(v => !currSet.has(v));

    years.push({
      year: sorted[i].year,
      newCount: newVendors.length,
      retainedCount: retained.length,
      lostCount: lost.length,
      totalVendors: currSet.size,
      newVendors: newVendors.slice(0, 10),
      lostVendors: lost.slice(0, 10),
    });
  }

  const score = summary.vendorStabilityScore ?? 50;
  let signal: VendorChurnAnalysis["signal"] = "Moderate stability";
  if (score < 40) signal = "High turnover";
  else if (score > 70) signal = "Very stable";

  return { years, vendorStabilityScore: score, signal };
}
