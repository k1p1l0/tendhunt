"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
    color: "var(--chart-2)",
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
  // label is "YYYY-MM"
  const [y, m] = label.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  return `${shortMonths[monthIdx]} ${y.slice(2)}`;
}

export function SpendTimelineChart({ data }: SpendTimelineChartProps) {
  // Sort chronologically and transform to chart format
  const sorted = [...data].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  const chartData = sorted.map((d) => ({
    month: `${d.year}-${String(d.month).padStart(2, "0")}`,
    total: d.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <LineChart
            data={chartData}
            margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => gbpCompact.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatMonthLabel(label as string)}
                  formatter={(value) => gbpFull.format(value as number)}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
