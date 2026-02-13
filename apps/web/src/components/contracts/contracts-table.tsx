"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { resolveRegionName } from "@/lib/nuts-regions";
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";

interface ContractRow {
  _id: string;
  title: string;
  buyerName: string;
  buyerId?: string;
  buyerRegion?: string | null;
  buyerLogoUrl?: string | null;
  valueMin?: number | null;
  valueMax?: number | null;
  deadlineDate?: string | Date | null;
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER";
  sector?: string | null;
  status: string;
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return "—";
}

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function sourceLabel(source: string) {
  return source === "FIND_A_TENDER" ? "FTS" : "CF";
}

function statusClassName(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15";
    case "AWARDED":
      return "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/15";
    case "CANCELLED":
      return "bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/15";
    default:
      return "";
  }
}

function BuyerLogo({
  logoUrl,
}: {
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-5 w-5 rounded object-contain bg-muted shrink-0"
      />
    );
  }
  return (
    <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
      <Building2 className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}

export function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
  const router = useRouter();

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No contracts found. Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className="opacity-0 animate-[fadeIn_200ms_ease-out_forwards]"
      style={{ animationFillMode: "both" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) {
              .animate-\\[fadeIn_200ms_ease-out_forwards\\] { animation: none !important; opacity: 1 !important; }
            }
          `,
        }}
      />
      <div className="min-w-[800px]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          <div className="col-span-5 pl-2">Contract & Buyer</div>
          <div className="col-span-2">Value</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Deadline</div>
          <div className="col-span-2">Sector</div>
        </div>

        {/* Rows */}
        <div className="space-y-0.5">
          {contracts.map((contract) => (
            <div
              key={contract._id}
              onClick={() => router.push(`/contracts/${contract._id}`)}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border border-transparent cursor-pointer transition-colors hover:bg-muted/50 hover:border-border group"
            >
              {/* Title & Buyer */}
              <div className="col-span-5 flex flex-col gap-1 pl-2 min-w-0">
                <h3 className="text-sm font-medium line-clamp-1 pr-4 transition-colors group-hover:text-blue-400">
                  {contract.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BuyerLogo logoUrl={contract.buyerLogoUrl} />
                  <span className="truncate">{contract.buyerName}</span>
                  {contract.buyerRegion && (
                    <>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="h-3 w-3" />
                        {resolveRegionName(contract.buyerRegion)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Value */}
              <div
                className="col-span-2 text-sm font-medium"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatValue(contract.valueMin, contract.valueMax)}
              </div>

              {/* Status */}
              <div className="col-span-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${statusClassName(contract.status)}`}
                >
                  {contract.status}
                </Badge>
              </div>

              {/* Deadline & Source */}
              <div className="col-span-2 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {formatDate(contract.deadlineDate) ?? "No deadline"}
                </div>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tight font-semibold">
                  {sourceLabel(contract.source)}
                </span>
              </div>

              {/* Sector */}
              <div className="col-span-2">
                {contract.sector ? (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border line-clamp-1">
                    {contract.sector}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
