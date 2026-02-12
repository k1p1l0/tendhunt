"use client";

import { motion } from "motion/react";
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

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function SpendRecurringCard({
  recurringPatterns,
}: SpendRecurringCardProps) {
  if (recurringPatterns.length === 0) {
    return (
      <Card className="flex min-h-[350px] flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            </span>
            <CardTitle className="text-lg">Recurring Spend</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-muted-foreground">
            Not enough data to detect recurring patterns
          </p>
        </CardContent>
      </Card>
    );
  }

  const top5 = recurringPatterns.slice(0, 5);

  return (
    <Card className="min-h-[350px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            </span>
            <CardTitle className="text-lg">Recurring Spend</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {recurringPatterns.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Detected recurring vendor patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {top5.map((pattern, index) => (
          <motion.div
            key={`${pattern.vendor}-${pattern.category}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: index * 0.04 }}
            className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {pattern.vendor}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {pattern.category}
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              <Badge
                variant="outline"
                className={
                  pattern.frequency === "monthly"
                    ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                    : "border-blue-500/50 text-blue-600 dark:text-blue-400"
                }
              >
                {pattern.frequency === "monthly" ? "Monthly" : "Quarterly"}
              </Badge>
              <span className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                {gbpCompact.format(pattern.averageAmount)}
              </span>
            </div>
          </motion.div>
        ))}

        {recurringPatterns.length > 5 && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            +{recurringPatterns.length - 5} more patterns
          </p>
        )}
      </CardContent>
    </Card>
  );
}
