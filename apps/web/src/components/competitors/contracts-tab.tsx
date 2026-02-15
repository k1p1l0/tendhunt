"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CompetitorContract, ContractSortField, SortDirection } from "@/lib/competitors";

interface ContractsTabProps {
  supplierName: string;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `\u00A3${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}K`;
  if (value > 0) return `\u00A3${value.toFixed(0)}`;
  return "\u2014";
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "AWARDED":
      return "default";
    case "OPEN":
      return "secondary";
    case "CLOSED":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export function ContractsTab({ supplierName }: ContractsTabProps) {
  const [contracts, setContracts] = useState<CompetitorContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<ContractSortField>("awardDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
      const res = await fetch(
        `/api/competitors/${encodeURIComponent(supplierName)}/contracts?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch contracts");
      const data = await res.json();
      setContracts(data.contracts ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setContracts([]);
      setError("Failed to load contracts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [supplierName, page, sortBy, sortDir]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleSort = useCallback(
    (field: ContractSortField) => {
      if (sortBy === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const renderSortButton = (field: ContractSortField, label: string) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortBy === field ? "text-foreground" : "text-muted-foreground/50"}`} />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} contract{total !== 1 ? "s" : ""}
        </p>
        <Select
          value={`${sortBy}-${sortDir}`}
          onValueChange={(val) => {
            const [field, dir] = val.split("-") as [ContractSortField, SortDirection];
            setSortBy(field);
            setSortDir(dir);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="awardDate-desc">Newest first</SelectItem>
            <SelectItem value="awardDate-asc">Oldest first</SelectItem>
            <SelectItem value="value-desc">Highest value</SelectItem>
            <SelectItem value="value-asc">Lowest value</SelectItem>
            <SelectItem value="buyerName-asc">Buyer A-Z</SelectItem>
            <SelectItem value="buyerName-desc">Buyer Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <AlertCircle className="h-8 w-8 text-destructive/60 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContracts}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </motion.div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No contracts found
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>{renderSortButton("buyerName", "Buyer")}</TableHead>
                  <TableHead className="text-right">
                    {renderSortButton("value", "Value")}
                  </TableHead>
                  <TableHead>{renderSortButton("awardDate", "Date")}</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {contracts.map((contract, i) => (
                    <motion.tr
                      key={contract._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.15,
                        delay: Math.min(i * 0.02, 0.2),
                      }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <TableCell className="font-medium max-w-0">
                        <Link
                          href={`/contracts/${contract._id}`}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                        >
                          <span className="truncate">{contract.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {contract.buyerId ? (
                          <Link
                            href={`/buyers/${contract.buyerId}`}
                            className="text-muted-foreground hover:text-primary transition-colors truncate block"
                          >
                            {contract.buyerName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground truncate block">
                            {contract.buyerName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatValue(contract.value)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(contract.awardDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColor(contract.status)}
                          className="text-[10px]"
                        >
                          {contract.status}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
