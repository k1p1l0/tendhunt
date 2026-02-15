"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion } from "motion/react";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { ChartConfig } from "@/components/ui/chart";

interface SectorChartProps {
  sectors: { name: string; count: number; value: number }[];
}

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)",
  "hsl(160, 60%, 45%)",
  "hsl(25, 95%, 53%)",
  "hsl(280, 65%, 60%)",
];

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function SectorChart({ sectors }: SectorChartProps) {
  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium mb-4">Sector Breakdown</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No sector data available
        </p>
      </div>
    );
  }

  const chartConfig: ChartConfig = {};
  sectors.forEach((s, i) => {
    chartConfig[s.name] = {
      label: s.name,
      color: COLORS[i % COLORS.length],
    };
  });

  const data = sectors.map((s, i) => ({
    name: s.name,
    value: s.count,
    totalValue: s.value,
    fill: COLORS[i % COLORS.length],
  }));

  const totalContracts = sectors.reduce((sum, s) => sum + s.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
      className="rounded-lg border bg-card p-6"
    >
      <h3 className="text-sm font-medium mb-4">Sector Breakdown</h3>
      <div className="flex items-start gap-6">
        <ChartContainer config={chartConfig} className="h-[180px] w-[180px] shrink-0">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(val, name) => (
                    <span>
                      {name}: <strong>{String(val)}</strong> contracts
                    </span>
                  )}
                />
              }
            />
          </PieChart>
        </ChartContainer>

        <div className="flex-1 space-y-1.5 min-w-0">
          {sectors.slice(0, 6).map((sector, i) => {
            const pct = totalContracts > 0
              ? ((sector.count / totalContracts) * 100).toFixed(0)
              : "0";
            return (
              <div key={sector.name} className="flex items-center gap-2 text-sm">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-muted-foreground flex-1">
                  {sector.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pct}%
                </span>
                <span className="text-xs font-medium tabular-nums w-14 text-right">
                  {sector.count}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                  {"\u00A3"}{formatValue(sector.value)}
                </span>
              </div>
            );
          })}
          {sectors.length > 6 && (
            <p className="text-xs text-muted-foreground pt-1">
              +{sectors.length - 6} more sectors
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
