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

export interface SpendOpportunities {
  profileMatch: ProfileMatch | null;
  recurringPatterns: RecurringPattern[];
  vendorConcentration: VendorConcentration[];
  spendGrowthSignals: SpendGrowthSignal[];
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
  userProfile: ICompanyProfile | null
): SpendOpportunities {
  return {
    profileMatch: computeProfileMatch(summary, userProfile),
    recurringPatterns: computeRecurringPatterns(summary),
    vendorConcentration: computeVendorConcentration(summary),
    spendGrowthSignals: computeSpendGrowthSignals(summary),
  };
}

// --- Profile Match ---

function computeProfileMatch(
  summary: ISpendSummary,
  userProfile: ICompanyProfile | null
): ProfileMatch | null {
  // null = no profile at all → show "complete your profile" CTA
  if (!userProfile) return null;

  const sectors = [
    ...(userProfile.sectors ?? []),
    ...(userProfile.capabilities ?? []),
    ...(userProfile.keywords ?? []),
  ].map((s) => s.toLowerCase());

  // Profile exists but empty sectors → return 0% match (not null)
  if (sectors.length === 0) {
    return { matchedCategories: [], totalMatchedSpend: 0, matchPercentage: 0 };
  }

  const categories = summary.categoryBreakdown ?? [];
  const totalSpend = summary.totalSpend ?? 0;
  if (totalSpend === 0) {
    return { matchedCategories: [], totalMatchedSpend: 0, matchPercentage: 0 };
  }

  const matchedCategories: string[] = [];
  let totalMatchedSpend = 0;

  for (const cat of categories) {
    const catLower = cat.category.toLowerCase();
    const isMatch = sectors.some(
      (s) => catLower.includes(s) || s.includes(catLower)
    );
    if (isMatch) {
      matchedCategories.push(cat.category);
      totalMatchedSpend += cat.total;
    }
  }

  const matchPercentage =
    totalSpend > 0 ? Math.round((totalMatchedSpend / totalSpend) * 100) : 0;

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
