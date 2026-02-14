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
  Target,
  Users,
  Shuffle,
} from "lucide-react";

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
    profileMatch,
    recurringPatterns,
    vendorConcentration,
    spendGrowthSignals,
    smeOpenness,
    vendorStability,
  } = opportunities;

  const hasAnyOpportunities =
    profileMatch ||
    vendorConcentration.length > 0 ||
    spendGrowthSignals.length > 0 ||
    smeOpenness ||
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
      {/* Profile Match */}
      {profileMatch && profileMatch.matchedCategories.length > 0 && (
        <Card className="border-l-4 border-l-blue-500 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Profile Match</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-blue-500">
                {profileMatch.matchPercentage}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                £{profileMatch.totalMatchedSpend.toLocaleString()} spent in your sectors
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Top matched categories:</p>
              <div className="flex flex-wrap gap-2">
                {profileMatch.matchedCategories.slice(0, 3).map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
                {profileMatch.matchedCategories.length > 3 && (
                  <Badge variant="outline">
                    +{profileMatch.matchedCategories.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
      {spendGrowthSignals.length > 0 && (
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
                {spendGrowthSignals.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Growing spend categories
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Top growth areas:</p>
              <div className="space-y-2">
                {spendGrowthSignals.slice(0, 3).map((signal, index) => (
                  <div
                    key={index}
                    className="text-sm border-l-2 border-purple-200 pl-2 py-1"
                  >
                    <p className="font-medium">{signal.category}</p>
                    <p className="text-muted-foreground text-xs">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      {signal.growthPercent > 0 ? "+" : ""}
                      {signal.growthPercent}% YoY growth
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
                {vendorStability.signal}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
