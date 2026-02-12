"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface VendorData {
  vendor: string;
  total: number;
  count: number;
}

interface SpendVendorsTableProps {
  data: VendorData[];
  totalSpend: number;
}

export function SpendVendorsTable({ data, totalSpend }: SpendVendorsTableProps) {
  const top20 = [...data]
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="w-[200px]">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top20.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No vendor data available
                </TableCell>
              </TableRow>
            ) : (
              top20.map((vendor, index) => {
                const sharePercent = totalSpend > 0
                  ? Math.round((vendor.total / totalSpend) * 100 * 10) / 10
                  : 0;

                return (
                  <TableRow
                    key={vendor.vendor}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {vendor.vendor}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      £{vendor.total.toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {vendor.count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={sharePercent} className="h-2 flex-1" />
                        <span className="text-sm font-medium text-muted-foreground w-[50px] text-right">
                          {sharePercent}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
