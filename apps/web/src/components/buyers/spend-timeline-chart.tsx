"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyData {
  year: number;
  month: number;
  total: number;
}

interface SpendTimelineChartProps {
  data: MonthlyData[];
}

const chartConfig = {
  total: {
    label: "Monthly Spend",
    color: "#3B82F6",
  },
} satisfies ChartConfig;

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
});

const gbpFull = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const shortMonths = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthLabel(label: string) {
  const [y, m] = label.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  return `${shortMonths[monthIdx]} '${y.slice(2)}`;
}

function computeTimelineTrend(data: MonthlyData[]): number | null {
  if (data.length < 4) return null;
  const sorted = [...data].sort((a, b) => a.year - b.year || a.month - b.month);
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const firstAvg = firstHalf.reduce((s, m) => s + m.total, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, m) => s + m.total, 0) / secondHalf.length;
  if (firstAvg === 0) return null;
  return ((secondAvg - firstAvg) / firstAvg) * 100;
}

export function SpendTimelineChart({ data }: SpendTimelineChartProps) {
  const sorted = [...data].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  const chartData = sorted.map((d) => ({
    month: `${d.year}-${String(d.month).padStart(2, "0")}`,
    total: d.total,
  }));

  const trend = computeTimelineTrend(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Spend Over Time</CardTitle>
          {trend != null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                trend >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <AreaChart
            data={chartData}
            margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" strokeOpacity={0.4} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              interval="preserveStartEnd"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v: number) => gbpCompact.format(v)}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatMonthLabel(label as string)}
                  formatter={(value) => gbpFull.format(value as number)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#spendGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
