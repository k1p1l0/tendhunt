"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SECTORS = [
  "Health & Social",
  "Construction",
  "Business Services",
  "Transport",
  "IT Services",
  "Software",
  "Architecture & Engineering",
  "Education & Training",
  "Research & Development",
  "Defence",
  "Environmental Services",
  "Utilities",
  "Legal Services",
  "Financial Services",
  "Facilities Management",
  "Food & Catering",
  "Telecommunications",
  "Publishing & Printing",
  "Industrial Equipment",
  "Medical Equipment",
] as const;

const REGIONS: Record<string, string> = {
  UKC: "North East England",
  UKD: "North West England",
  UKE: "Yorkshire and The Humber",
  UKF: "East Midlands",
  UKG: "West Midlands",
  UKH: "East of England",
  UKI: "London",
  UKJ: "South East England",
  UKK: "South West England",
  UKL: "Wales",
  UKM: "Scotland",
  UKN: "Northern Ireland",
  UK: "UK-wide",
  UNSPECIFIED: "Nationwide / Unspecified",
};

const VALUE_RANGES = [
  { label: "Under 100K", min: 0, max: 100000 },
  { label: "100K - 500K", min: 100000, max: 500000 },
  { label: "500K - 1M", min: 500000, max: 1000000 },
  { label: "1M - 10M", min: 1000000, max: 10000000 },
  { label: "10M - 100M", min: 10000000, max: 100000000 },
  { label: "Over 100M", min: 100000000, max: undefined },
] as const;

function encodeValueRange(min: number, max: number | undefined) {
  return max != null ? `${min}-${max}` : `${min}-`;
}

export function ContractFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (key === "value") {
      // Special handling for value range: parse composite min-max format
      if (value && value !== "all") {
        const [minStr, maxStr] = value.split("-");
        params.set("minValue", minStr);
        if (maxStr) {
          params.set("maxValue", maxStr);
        } else {
          params.delete("maxValue");
        }
      } else {
        params.delete("minValue");
        params.delete("maxValue");
      }
      // Don't set the "value" key itself in params
    } else {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    replace(`${pathname}?${params.toString()}`);
  };

  // Reconstruct current value range from minValue/maxValue params
  const currentMinValue = searchParams.get("minValue");
  const currentMaxValue = searchParams.get("maxValue");
  let currentValueRange = "all";
  if (currentMinValue) {
    currentValueRange = currentMaxValue
      ? `${currentMinValue}-${currentMaxValue}`
      : `${currentMinValue}-`;
  }

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
          {SECTORS.map((sector) => (
            <SelectItem key={sector} value={sector}>
              {sector}
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
          {Object.entries(REGIONS).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value range filter */}
      <Select
        value={currentValueRange}
        onValueChange={(v) => updateFilter("value", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Any Value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Value</SelectItem>
          {VALUE_RANGES.map((range) => {
            const encoded = encodeValueRange(range.min, range.max);
            return (
              <SelectItem key={encoded} value={encoded}>
                {range.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Sort order */}
      <Select
        value={searchParams.get("sort") ?? "date"}
        onValueChange={(v) => updateFilter("sort", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Newest First" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Newest First</SelectItem>
          <SelectItem value="score">AI Score</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
