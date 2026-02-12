"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp } from "lucide-react";

interface VendorData {
  vendor: string;
  total: number;
  count: number;
}

interface SpendVendorsTableProps {
  data: VendorData[];
  totalSpend: number;
  selectedVendor?: string;
  onVendorClick?: (vendor: string) => void;
}

const INITIAL_COUNT = 20;

export function SpendVendorsTable({ data, totalSpend, selectedVendor, onVendorClick }: SpendVendorsTableProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_COUNT);
  const hasMore = sorted.length > INITIAL_COUNT;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vendors</CardTitle>
        <span className="text-sm text-muted-foreground">
          {sorted.length} total
        </span>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Txns</TableHead>
                <TableHead className="w-[180px]">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No vendor data available
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((vendor, index) => {
                  const sharePercent = totalSpend > 0
                    ? Math.round((vendor.total / totalSpend) * 100 * 10) / 10
                    : 0;

                  return (
                    <TableRow
                      key={vendor.vendor}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedVendor === vendor.vendor ? "bg-accent" : ""
                      }`}
                      onClick={() => onVendorClick?.(vendor.vendor)}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
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
                          <span className="text-sm font-medium text-muted-foreground w-[45px] text-right">
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
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                Show top {INITIAL_COUNT}
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Show all {sorted.length} vendors
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
