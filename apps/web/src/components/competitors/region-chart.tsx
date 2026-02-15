"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "motion/react";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { ChartConfig } from "@/components/ui/chart";

interface RegionChartProps {
  regions: { name: string; count: number; value: number }[];
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function RegionChart({ regions }: RegionChartProps) {
  if (regions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Geographic Breakdown</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No region data available
        </p>
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    count: {
      label: "Contracts",
      color: "hsl(221, 83%, 53%)",
    },
  };

  const data = regions
    .slice(0, 10)
    .map((r) => ({
      region: r.name.length > 20 ? r.name.slice(0, 18) + "..." : r.name,
      fullName: r.name,
      count: r.count,
      value: r.value,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.15 }}
      className="rounded-lg border bg-card p-6"
    >
      <h3 className="text-sm font-medium mb-4">Geographic Breakdown</h3>
      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="region"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(val, _name, item) => (
                  <span>
                    {item?.payload?.fullName}: <strong>{String(val)}</strong> contracts
                    ({"\u00A3"}{formatValue(item?.payload?.value ?? 0)})
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="hsl(221, 83%, 53%)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </motion.div>
  );
}
