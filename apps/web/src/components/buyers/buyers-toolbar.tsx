"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Plus, X } from "lucide-react";
import { resolveRegionName } from "@/lib/nuts-regions";

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

function FilterChip({
  label,
  value,
  displayValue,
  onSelect,
  onClear,
  options,
}: {
  label: string;
  value: string | null;
  displayValue?: string;
  onSelect: (value: string) => void;
  onClear: () => void;
  options: { value: string; label: string }[];
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  if (value) {
    return (
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{displayValue ?? value}</span>
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <Plus className="h-3 w-3" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            ref={inputRef}
            placeholder={`Search ${label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              className="w-full rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No results
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BuyersToolbar({
  total,
  filtered,
  sectors,
  orgTypes,
  regions,
}: {
  total: number;
  filtered: number;
  sectors: string[];
  orgTypes: string[];
  regions: string[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("q")?.toString() ?? ""
  );

  const syncSearchToUrl = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    syncSearchToUrl(term);
  };

  const currentSector = searchParams.get("sector");
  const currentOrgType = searchParams.get("orgType");
  const currentRegion = searchParams.get("region");

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-search-input
              placeholder="Search buyers..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="hidden md:block h-6 w-px bg-border mx-2" />

          <div className="hidden md:flex items-center gap-2">
            <FilterChip
              label="Sector"
              value={currentSector}
              onSelect={(v) => updateFilter("sector", v)}
              onClear={() => updateFilter("sector", null)}
              options={sectors.map((s) => ({ value: s, label: s }))}
            />
            <FilterChip
              label="Org Type"
              value={currentOrgType}
              displayValue={currentOrgType ? orgTypeLabel(currentOrgType) : undefined}
              onSelect={(v) => updateFilter("orgType", v)}
              onClear={() => updateFilter("orgType", null)}
              options={orgTypes.map((ot) => ({ value: ot, label: orgTypeLabel(ot) }))}
            />
            <FilterChip
              label="Region"
              value={currentRegion}
              displayValue={currentRegion ? resolveRegionName(currentRegion) : undefined}
              onSelect={(v) => updateFilter("region", v)}
              onClear={() => updateFilter("region", null)}
              options={regions.map((r) => ({ value: r, label: resolveRegionName(r) }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {filtered === total
              ? `${total.toLocaleString()} buyers`
              : `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
}
