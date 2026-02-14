"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  AlertTriangle,
  Shuffle,
} from "lucide-react";

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface ProfileMatch {
  matchedCategories: string[];
  totalMatchedSpend: number;
  matchPercentage: number;
}

interface RecurringPattern {
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

interface SmeOpennessData {
  smeOpennessScore: number;
  signal: string;
  sme: { percentage: number; count: number };
}

interface VendorStabilityData {
  vendorStabilityScore: number;
  signal: string;
}

interface SpendOpportunitiesProps {
  opportunities: {
    profileMatch: ProfileMatch | null;
    recurringPatterns: RecurringPattern[];
    vendorConcentration: VendorConcentration[];
    spendGrowthSignals: SpendGrowthSignal[];
    smeOpenness?: SmeOpennessData | null;
    vendorStability?: VendorStabilityData | null;
  };
}

export function SpendOpportunities({ opportunities }: SpendOpportunitiesProps) {
  const {
    vendorConcentration,
    spendGrowthSignals,
    vendorStability,
  } = opportunities;

  const hasAnyOpportunities =
    vendorConcentration.length > 0 ||
    spendGrowthSignals.length > 0 ||
    vendorStability;

  if (!hasAnyOpportunities) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No opportunity insights available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Vendor Concentration */}
      {vendorConcentration.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Vendor Concentration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-amber-500">
                {vendorConcentration.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Categories with concentrated spend
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Concentrated areas:</p>
              <div className="space-y-2">
                {vendorConcentration.slice(0, 3).map((conc, index) => (
                  <div
                    key={index}
                    className="text-sm border-l-2 border-amber-200 pl-2 py-1"
                  >
                    <p className="font-medium">{conc.category}</p>
                    <p className="text-muted-foreground text-xs">
                      {conc.topVendor} • {conc.concentrationPercent}% concentration
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spend Growth */}
      {spendGrowthSignals.length > 0 && spendGrowthSignals[0] && (
        <Card className="border-l-4 border-l-purple-500 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">Spend Growth</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-purple-500">
                +{spendGrowthSignals[0].growthPercent}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Year-over-year spend increase
              </p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recent 12 months</span>
                <span className="font-medium">
                  {gbpCompact.format(spendGrowthSignals[0].currentYearSpend)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prior 12 months</span>
                <span className="font-medium">
                  {gbpCompact.format(spendGrowthSignals[0].priorYearSpend)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This buyer is spending significantly more than last year — a sign of growing procurement activity.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vendor Stability */}
      {vendorStability && (
        <Card className="border-l-4 border-l-orange-500 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Vendor Stability</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-orange-500">
                {vendorStability.vendorStabilityScore}/100
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {vendorStability.vendorStabilityScore < 40
                  ? "Only " + vendorStability.vendorStabilityScore + "% of vendors are retained year-over-year"
                  : vendorStability.vendorStabilityScore > 70
                    ? vendorStability.vendorStabilityScore + "% of vendors return each year"
                    : vendorStability.vendorStabilityScore + "% vendor retention rate"}
              </p>
            </div>
            <Badge variant="outline" className={
              vendorStability.vendorStabilityScore < 40
                ? "bg-green-500/15 text-green-600 border-green-500/30"
                : vendorStability.vendorStabilityScore > 70
                  ? "bg-red-500/15 text-red-600 border-red-500/30"
                  : "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
            }>
              {vendorStability.vendorStabilityScore < 40 ? "Open to new suppliers" : vendorStability.vendorStabilityScore > 70 ? "Hard to break in" : "Moderate openness"}
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {vendorStability.vendorStabilityScore < 40
                ? "This buyer regularly changes vendors — they're open to working with new suppliers."
                : vendorStability.vendorStabilityScore > 70
                  ? "This buyer tends to stick with the same vendors — breaking in may require a strong differentiator."
                  : "This buyer retains some vendors but also brings in new ones."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
