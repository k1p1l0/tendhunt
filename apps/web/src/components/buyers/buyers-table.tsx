"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { resolveRegionName } from "@/lib/nuts-regions";
import { Building2, Globe, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface BuyerRow {
  _id: string;
  name: string;
  sector?: string;
  region?: string;
  contractCount: number;
  orgType?: string;
  enrichmentScore?: number;
  website?: string;
  logoUrl?: string;
}

type SortColumn = "name" | "contracts" | "enrichmentScore";

function orgTypeLabel(orgType: string): string {
  const labels: Record<string, string> = {
    local_council_london: "London Borough",
    local_council_metro: "Metropolitan Borough",
    local_council_metropolitan: "Metropolitan Borough",
    local_council_district: "District Council",
    local_council_county: "County Council",
    local_council_unitary: "Unitary Authority",
    local_council_sui_generis: "Sui Generis",
    local_council_other: "Council",
    nhs_trust_acute: "NHS Trust (Acute)",
    nhs_trust_mental_health: "NHS Trust (Mental Health)",
    nhs_trust_community: "NHS Trust (Community)",
    nhs_trust_ambulance: "NHS Trust (Ambulance)",
    nhs_icb: "NHS ICB",
    nhs_other: "NHS Body",
    police_pcc: "Police / PCC",
    police_force: "Police Force",
    fire_rescue: "Fire & Rescue",
    fire_service: "Fire & Rescue",
    university: "University",
    fe_college: "FE College",
    further_education: "FE College",
    mat: "Multi-Academy Trust",
    multi_academy_trust: "Multi-Academy Trust",
    central_government: "Central Government",
    devolved_government: "Devolved Government",
    housing_association: "Housing Association",
    combined_authority: "Combined Authority",
    national_park: "National Park",
    alb: "Arms-Length Body",
    private_company: "Private Company",
  };
  return labels[orgType] ?? orgType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SortIndicator({ column, currentSort, currentOrder }: { column: SortColumn; currentSort: string; currentOrder: string }) {
  if (currentSort !== column) {
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
  }
  return currentOrder === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1" />
    : <ArrowDown className="h-3 w-3 ml-1" />;
}

export function BuyersTable({
  buyers,
  sort,
  order,
}: {
  buyers: BuyerRow[];
  sort: string;
  order: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleSort = (column: SortColumn) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === column) {
      params.set("order", order === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", column);
      params.set("order", "asc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (buyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          No buyer organizations found
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
      <div className="min-w-[900px]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          <div
            className="col-span-4 pl-2 flex items-center cursor-pointer group transition-colors hover:text-foreground"
            onClick={() => handleSort("name")}
          >
            Organization <SortIndicator column="name" currentSort={sort} currentOrder={order} />
          </div>
          <div className="col-span-2">Sector</div>
          <div className="col-span-2">Region</div>
          <div
            className="col-span-1 text-right pr-4 flex items-center justify-end cursor-pointer group transition-colors hover:text-foreground"
            onClick={() => handleSort("contracts")}
          >
            Contracts <SortIndicator column="contracts" currentSort={sort} currentOrder={order} />
          </div>
          <div className="col-span-2">Org Type</div>
          <div
            className="col-span-1 text-right flex items-center justify-end cursor-pointer group transition-colors hover:text-foreground"
            onClick={() => handleSort("enrichmentScore")}
          >
            Score <SortIndicator column="enrichmentScore" currentSort={sort} currentOrder={order} />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-0.5">
          {buyers.map((buyer) => (
            <div
              key={buyer._id}
              onClick={() => router.push(`/buyers/${buyer._id}`)}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border border-transparent cursor-pointer transition-colors hover:bg-muted/50 hover:border-border group"
            >
              {/* Organization */}
              <div className="col-span-4 flex items-center gap-3 pl-2 min-w-0">
                {buyer.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buyer.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded object-contain bg-muted shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h3 className="text-sm font-medium line-clamp-1 transition-colors group-hover:text-blue-400">
                    {buyer.name}
                  </h3>
                  {buyer.website && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-colors group-hover:text-muted-foreground truncate">
                      <Globe className="h-3 w-3 shrink-0" />
                      {getDomain(buyer.website)}
                    </div>
                  )}
                </div>
              </div>

              {/* Sector */}
              <div className="col-span-2">
                {buyer.sector ? (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border line-clamp-1">
                    {buyer.sector}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Region */}
              <div className="col-span-2 text-xs text-muted-foreground truncate">
                {buyer.region ? resolveRegionName(buyer.region) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Contracts */}
              <div
                className="col-span-1 text-sm font-medium text-right pr-4"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {buyer.contractCount}
              </div>

              {/* Org Type */}
              <div className="col-span-2">
                {buyer.orgType ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {orgTypeLabel(buyer.orgType)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {/* Score */}
              <div
                className="col-span-1 text-right text-sm font-medium"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {buyer.enrichmentScore != null ? (
                  <span className={scoreColorClass(buyer.enrichmentScore)}>
                    {buyer.enrichmentScore}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
