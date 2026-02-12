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
  RefreshCw,
  AlertTriangle,
  Target,
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

interface SpendOpportunitiesProps {
  opportunities: {
    profileMatch: ProfileMatch | null;
    recurringPatterns: RecurringPattern[];
    vendorConcentration: VendorConcentration[];
    spendGrowthSignals: SpendGrowthSignal[];
  };
}

export function SpendOpportunities({ opportunities }: SpendOpportunitiesProps) {
  const {
    profileMatch,
    recurringPatterns,
    vendorConcentration,
    spendGrowthSignals,
  } = opportunities;

  const hasAnyOpportunities =
    profileMatch ||
    recurringPatterns.length > 0 ||
    vendorConcentration.length > 0 ||
    spendGrowthSignals.length > 0;

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

      {/* Recurring Patterns */}
      {recurringPatterns.length > 0 && (
        <Card className="border-l-4 border-l-green-500 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Recurring Spend</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-green-500">
                {recurringPatterns.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Recurring spend patterns detected
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Top patterns:</p>
              <div className="space-y-2">
                {recurringPatterns.slice(0, 3).map((pattern, index) => (
                  <div
                    key={index}
                    className="text-sm border-l-2 border-green-200 pl-2 py-1"
                  >
                    <p className="font-medium">{pattern.vendor}</p>
                    <p className="text-muted-foreground text-xs">
                      {pattern.frequency === "monthly" ? "Monthly" : "Quarterly"} •
                      Avg £{pattern.averageAmount.toLocaleString()}
                    </p>
                  </div>
                ))}
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
    </div>
  );
}
