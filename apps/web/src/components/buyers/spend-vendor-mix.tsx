"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Building2, Users, ChevronRight } from "lucide-react";
import { VendorSizeSheet } from "@/components/buyers/vendor-size-sheet";

import type { VendorMixAnalysis } from "@/lib/spend-analytics";

const COLORS = { sme: "#22c55e", large: "#3b82f6" };

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface SpendVendorMixProps {
  data: VendorMixAnalysis;
  buyerId: string;
}

export function SpendVendorMix({ data, buyerId }: SpendVendorMixProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFilter, setSheetFilter] = useState<"sme" | "large">("sme");

  const chartData = [
    { name: "SME", value: data.sme.spend, count: data.sme.count },
    { name: "Large", value: data.large.spend, count: data.large.count },
  ].filter(d => d.value > 0);

  const signalColor = {
    "SME-friendly": "bg-green-500/15 text-green-600 border-green-500/30",
    "Mixed": "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    "Large-org dominated": "bg-red-500/15 text-red-600 border-red-500/30",
  }[data.signal];

  const handleSizeClick = (size: "sme" | "large") => {
    setSheetFilter(size);
    setSheetOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vendor Size Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.name === "SME" ? COLORS.sme : COLORS.large}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currencyFormatter.format(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{data.smeOpennessScore}</span>
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSizeClick("sme")}
                  className="flex items-center gap-2 text-sm w-full rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted"
                >
                  <Users className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="font-medium">{data.sme.count} SME{data.sme.count !== 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground">
                    {currencyFormatter.format(data.sme.spend)} ({data.sme.percentage}%)
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSizeClick("large")}
                  className="flex items-center gap-2 text-sm w-full rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted"
                >
                  <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium">{data.large.count} Large</span>
                  <span className="text-muted-foreground">
                    {currencyFormatter.format(data.large.spend)} ({data.large.percentage}%)
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </button>
              </div>
            </div>

            <Badge variant="outline" className={signalColor}>
              {data.signal}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      <VendorSizeSheet
        buyerId={buyerId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sizeFilter={sheetFilter}
      />
    </>
  );
}
