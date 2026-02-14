"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VendorRow {
  vendor: string;
  vendorNormalized: string;
  totalSpend: number;
  transactionCount: number;
  firstDate: string | null;
  lastDate: string | null;
  categories: string[];
  size: "sme" | "large";
}

interface VendorSizeSheetProps {
  buyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeFilter: "sme" | "large";
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

type SortField = "totalSpend" | "transactionCount" | "vendor";

export function VendorSizeSheet({ buyerId, open, onOpenChange, sizeFilter }: VendorSizeSheetProps) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<SortField>("totalSpend");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetch_() {
      setLoading(true);
      try {
        const res = await fetch(`/api/buyers/${buyerId}/spending/vendors?size=${sizeFilter}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setVendors(data.vendors);
            setTotal(data.total);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch_();
    return () => { cancelled = true; };
  }, [buyerId, sizeFilter, open]);

  const sorted = [...vendors].sort((a, b) => {
    let cmp = 0;
    if (sortField === "totalSpend") cmp = a.totalSpend - b.totalSpend;
    else if (sortField === "transactionCount") cmp = a.transactionCount - b.transactionCount;
    else cmp = a.vendor.localeCompare(b.vendor);
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const isSme = sizeFilter === "sme";
  const title = isSme ? "SME Vendors" : "Large Vendors";
  const icon = isSme
    ? <Users className="h-5 w-5 text-green-500" />
    : <Building2 className="h-5 w-5 text-blue-500" />;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {icon}
            <SheetTitle>{title}</SheetTitle>
            <Badge variant="secondary" className="ml-auto">{total} vendors</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSme
              ? "Vendors with total spend ≤ £500k and ≤ 50 transactions"
              : "Vendors with total spend > £500k or > 50 transactions"}
          </p>
        </SheetHeader>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No vendors found</p>
          ) : (
            <>
              {/* Sort controls */}
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <span>Sort by:</span>
                <Button
                  variant={sortField === "totalSpend" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleSort("totalSpend")}
                >
                  Spend <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant={sortField === "transactionCount" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleSort("transactionCount")}
                >
                  Transactions <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant={sortField === "vendor" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleSort("vendor")}
                >
                  Name <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {/* Vendor list */}
              <div className="space-y-2">
                {sorted.map((v, i) => (
                  <motion.div
                    key={v.vendorNormalized}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
                    className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.vendor}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{v.transactionCount} txn{v.transactionCount !== 1 ? "s" : ""}</span>
                          <span>{formatDate(v.firstDate)} – {formatDate(v.lastDate)}</span>
                        </div>
                        {v.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {v.categories.map(cat => (
                              <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{gbp.format(v.totalSpend)}</p>
                        <p className="text-[10px] text-muted-foreground">{gbpCompact.format(v.totalSpend)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
