"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SpendFilters, type SpendFilterState } from "@/components/buyers/spend-filters";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { TransactionDetailSheet } from "@/components/buyers/transaction-detail-sheet";

interface Transaction {
  _id: string;
  date: string | null;
  vendor: string;
  amount: number;
  category: string;
  subcategory?: string | null;
  department?: string | null;
  reference?: string | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

interface SpendBreakdownTableProps {
  buyerId: string;
  initialCategory?: string;
  initialVendor?: string;
  categories: string[];
  vendors: string[];
}

export function SpendBreakdownTable({
  buyerId,
  initialCategory,
  initialVendor,
  categories,
  vendors,
}: SpendBreakdownTableProps) {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SpendFilterState>({
    category: initialCategory,
  });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Update filters when initialCategory changes (chart click)
  useEffect(() => {
    if (initialCategory && initialCategory !== filters.category) {
      setFilters((prev) => ({ ...prev, category: initialCategory }));
      setPage(1);
    }
  }, [initialCategory, filters.category]);

  // Update filters when initialVendor changes (vendor table click)
  useEffect(() => {
    if (initialVendor !== undefined && initialVendor !== filters.vendor) {
      setFilters((prev) => ({ ...prev, vendor: initialVendor || undefined }));
      setPage(1);
    }
  }, [initialVendor, filters.vendor]);

  // Fetch transactions
  useEffect(() => {
    let cancelled = false;

    async function fetchTransactions() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "50",
        });

        if (filters.category) params.set("category", filters.category);
        if (filters.vendor) params.set("vendor", filters.vendor);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.amountMin !== undefined)
          params.set("amountMin", String(filters.amountMin));
        if (filters.amountMax !== undefined)
          params.set("amountMax", String(filters.amountMax));

        const res = await fetch(
          `/api/buyers/${buyerId}/spending/transactions?${params.toString()}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load transactions (${res.status})`);
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, [buyerId, page, filters]);

  const handleFilterChange = (newFilters: SpendFilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (data && page * data.pageSize < data.total) {
      setPage(page + 1);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <span className={isNegative ? "text-destructive" : ""}>
        £{formatted}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpendFilters
          categories={categories}
          vendors={vendors}
          filters={filters}
          onChange={handleFilterChange}
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Info className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No transactions match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting or clearing your filters to see more results.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((tx) => (
                    <TableRow
                      key={tx._id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {tx.vendor}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {tx.department ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[120px] truncate">
                        {tx.reference ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.pageSize + 1}–
                {Math.min(page * data.pageSize, data.total)} of{" "}
                {data.total.toLocaleString()} transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page * data.pageSize >= data.total}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <TransactionDetailSheet
        transaction={selectedTx}
        open={selectedTx !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTx(null);
        }}
      />
    </Card>
  );
}
