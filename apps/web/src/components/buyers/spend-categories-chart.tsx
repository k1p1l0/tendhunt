"use client";

import {
  Bar,
  BarChart,
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

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

interface SpendCategoriesChartProps {
  data: CategoryData[];
  onCategoryClick?: (category: string) => void;
}

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Spend Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
          <BarChart
            data={top10}
            layout="vertical"
            margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => gbpCompact.format(v)}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={140}
              tickFormatter={(v: string) => truncate(v, 20)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {gbpFull.format(value as number)}
                      </span>
                      <span className="text-muted-foreground text-xs">
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
              fill="var(--color-total)"
              radius={[0, 4, 4, 0]}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(entry) => {
                if (onCategoryClick && entry?.category) {
                  onCategoryClick(entry.category);
                }
              }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
