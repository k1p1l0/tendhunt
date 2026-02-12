"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Building2, ExternalLink } from "lucide-react";

interface BuyerRow {
  _id: string;
  name: string;
  sector?: string;
  region?: string;
  contractCount: number;
  orgType?: string;
  enrichmentScore?: number;
  website?: string;
}

interface BuyerTableProps {
  buyers: BuyerRow[];
  total: number;
  filteredCount: number;
}

type SortColumn = "name" | "sector" | "region" | "contracts" | "orgType" | "enrichmentScore";

const columns: { key: SortColumn; label: string }[] = [
  { key: "name", label: "Organization" },
  { key: "sector", label: "Sector" },
  { key: "region", label: "Region" },
  { key: "contracts", label: "Contracts" },
  { key: "orgType", label: "Org Type" },
  { key: "enrichmentScore", label: "Score" },
];

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
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function displayDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function BuyerTable({ buyers, total, filteredCount }: BuyerTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentSort = searchParams.get("sort") ?? "name";
  const currentOrder = searchParams.get("order") ?? "asc";

  function handleSort(column: SortColumn) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort === column) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", column);
      params.set("order", "asc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (currentSort !== column) return null;
    return currentOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 inline ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 inline ml-1" />
    );
  }

  if (buyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 gap-3">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No buyer organizations found
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon column={col.key} />
              </TableHead>
            ))}
            <TableHead>Website</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow key={buyer._id}>
              <TableCell>
                <Link
                  href={`/buyers/${buyer._id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {buyer.name}
                </Link>
              </TableCell>
              <TableCell>
                {buyer.sector ? (
                  <Badge variant="outline">{buyer.sector}</Badge>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {buyer.region || (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>{buyer.contractCount}</TableCell>
              <TableCell>
                {buyer.orgType ? (
                  <Badge variant="outline">{orgTypeLabel(buyer.orgType)}</Badge>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {buyer.enrichmentScore != null ? (
                  <span className={`font-medium ${scoreColorClass(buyer.enrichmentScore)}`}>
                    {buyer.enrichmentScore}
                  </span>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {buyer.website ? (
                  <a
                    href={buyer.website.startsWith("http") ? buyer.website : `https://${buyer.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {displayDomain(buyer.website)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > 0 && (
        <div className="px-4 py-3 border-t text-xs text-muted-foreground">
          {filteredCount < total
            ? `Showing ${filteredCount.toLocaleString("en-GB")} of ${total.toLocaleString("en-GB")} buyer organizations`
            : `${total.toLocaleString("en-GB")} buyer organizations`}
        </div>
      )}
    </div>
  );
}
