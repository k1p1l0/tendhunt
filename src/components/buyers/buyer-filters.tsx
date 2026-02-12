"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BuyerFiltersProps {
  sectors: string[];
  orgTypes: string[];
  regions: string[];
}

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

export function BuyerFilters({ sectors, orgTypes, regions }: BuyerFiltersProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Sector filter */}
      <Select
        value={searchParams.get("sector") ?? "all"}
        onValueChange={(v) => updateFilter("sector", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Sectors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sectors</SelectItem>
          {sectors.map((sector) => (
            <SelectItem key={sector} value={sector}>
              {sector}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Org Type filter */}
      <Select
        value={searchParams.get("orgType") ?? "all"}
        onValueChange={(v) => updateFilter("orgType", v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Org Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Org Types</SelectItem>
          {orgTypes.map((ot) => (
            <SelectItem key={ot} value={ot}>
              {orgTypeLabel(ot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Region filter */}
      <Select
        value={searchParams.get("region") ?? "all"}
        onValueChange={(v) => updateFilter("region", v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Regions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region} value={region}>
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
