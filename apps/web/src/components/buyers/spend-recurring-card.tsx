"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import type { RecurringPattern } from "@/lib/spend-analytics";

interface SpendRecurringCardProps {
  recurringPatterns: RecurringPattern[];
}

export function SpendRecurringCard({
  recurringPatterns,
}: SpendRecurringCardProps) {
  if (recurringPatterns.length === 0) {
    return (
      <Card className="min-h-[350px] flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Recurring Spend</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Not enough data to detect recurring patterns
          </p>
        </CardContent>
      </Card>
    );
  }

  const top5 = recurringPatterns.slice(0, 5);

  return (
    <Card className="min-h-[350px] border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Recurring Spend</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">
            {recurringPatterns.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Detected recurring vendor patterns
        </p>

        <div className="space-y-2">
          {top5.map((pattern, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {pattern.vendor}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={
                    pattern.frequency === "monthly"
                      ? "border-green-500/50 text-green-600"
                      : "border-blue-500/50 text-blue-600"
                  }
                >
                  {pattern.frequency === "monthly" ? "Monthly" : "Quarterly"}
                </Badge>
                <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                  £{pattern.averageAmount.toLocaleString("en-GB")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {recurringPatterns.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{recurringPatterns.length - 5} more patterns
          </p>
        )}
      </CardContent>
    </Card>
  );
}
