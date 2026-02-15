"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { VendorChurnAnalysis } from "@/lib/spend-analytics";

interface SpendVendorChurnProps {
  data: VendorChurnAnalysis;
}

export function SpendVendorChurn({ data }: SpendVendorChurnProps) {
  const [expanded, setExpanded] = useState(false);

  const chartData = data.years.map(y => ({
    year: String(y.year),
    Retained: y.retainedCount,
    New: y.newCount,
    Lost: -y.lostCount,
  }));

  const signalColor = {
    "High turnover": "bg-green-500/15 text-green-600 border-green-500/30",
    "Moderate stability": "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    "Very stable": "bg-red-500/15 text-red-600 border-red-500/30",
  }[data.signal];

  const latestYear = data.years[data.years.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Vendor Churn</CardTitle>
            <Badge variant="outline" className={signalColor}>
              Stability: {data.vendorStabilityScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} stackOffset="sign">
                <XAxis dataKey="year" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Retained" stackId="a" fill="#6b7280" radius={[2, 2, 0, 0]} />
                <Bar dataKey="New" stackId="a" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Lost" stackId="b" fill="#ef4444" radius={[0, 0, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground">{data.signal}</p>

          {latestYear && (latestYear.newVendors.length > 0 || latestYear.lostVendors.length > 0) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-0 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                <span>{latestYear.year} details</span>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 text-xs"
                >
                  {latestYear.newVendors.length > 0 && (
                    <div>
                      <p className="font-medium text-green-600 mb-1">New vendors:</p>
                      <div className="flex flex-wrap gap-1">
                        {latestYear.newVendors.slice(0, 5).map(v => (
                          <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
                        ))}
                        {latestYear.newVendors.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">+{latestYear.newVendors.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {latestYear.lostVendors.length > 0 && (
                    <div>
                      <p className="font-medium text-red-500 mb-1">No longer used:</p>
                      <div className="flex flex-wrap gap-1">
                        {latestYear.lostVendors.slice(0, 5).map(v => (
                          <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
                        ))}
                        {latestYear.lostVendors.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">+{latestYear.lostVendors.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
