"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "motion/react";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { ChartConfig } from "@/components/ui/chart";

interface TimelineChartProps {
  timeline: { year: number; month: number; count: number; value: number }[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Contract Activity Timeline</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No timeline data available
        </p>
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    count: {
      label: "Contracts",
      color: "hsl(142, 71%, 45%)",
    },
    value: {
      label: "Value",
      color: "hsl(221, 83%, 53%)",
    },
  };

  const data = timeline.map((t) => ({
    label: `${MONTH_NAMES[t.month - 1]} ${t.year}`,
    count: t.count,
    value: t.value,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.2 }}
      className="rounded-lg border bg-card p-6"
    >
      <h3 className="text-sm font-medium mb-4">Contract Activity Timeline</h3>
      <ChartContainer config={chartConfig} className="h-[240px] w-full">
        <AreaChart
          data={data}
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
        >
          <defs>
            <linearGradient id="gradientCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(val, name) => (
                  <span>
                    {name === "count" ? "Contracts" : "Value"}:{" "}
                    <strong>
                      {name === "value"
                        ? `\u00A3${formatValue(Number(val))}`
                        : String(val)}
                    </strong>
                  </span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(142, 71%, 45%)"
            fill="url(#gradientCount)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </motion.div>
  );
}
