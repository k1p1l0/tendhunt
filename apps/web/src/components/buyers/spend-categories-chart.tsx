"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

interface SpendCategoriesChartProps {
  data: CategoryData[];
  onCategoryClick?: (category: string) => void;
}

const CATEGORY_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
];

const chartConfig = {
  total: {
    label: "Total Spend",
    color: "var(--chart-1)",
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

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

export function SpendCategoriesChart({
  data,
  onCategoryClick,
}: SpendCategoriesChartProps) {
  const top10 = data.slice(0, 10);
  const totalSpend = top10.reduce((sum, c) => sum + c.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Spend Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 xl:flex-row">
          {/* Left: Bar chart */}
          <div className="min-w-0 flex-1">
            <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => gbpCompact.format(v)}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  tickFormatter={(v: string) => truncate(v, 18)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {gbpFull.format(value as number)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.payload.count} transaction
                            {item.payload.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="total"
                  radius={[0, 6, 6, 0]}
                  cursor={onCategoryClick ? "pointer" : undefined}
                  onClick={(entry) => {
                    if (onCategoryClick && entry?.category) {
                      onCategoryClick(entry.category);
                    }
                  }}
                >
                  {top10.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Right: Legend panel */}
          <div className="w-full shrink-0 xl:w-48">
            <div className="space-y-2">
              {top10.map((cat, idx) => {
                const pct = totalSpend > 0 ? ((cat.total / totalSpend) * 100).toFixed(1) : "0";
                return (
                  <button
                    key={cat.category}
                    type="button"
                    className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                    onClick={() => onCategoryClick?.(cat.category)}
                  >
                    <span
                      className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {cat.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {gbpCompact.format(cat.total)}
                        <span className="mx-1 text-muted-foreground/50">&middot;</span>
                        {pct}%
                        <span className="mx-1 text-muted-foreground/50">&middot;</span>
                        {cat.count} txn{cat.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
