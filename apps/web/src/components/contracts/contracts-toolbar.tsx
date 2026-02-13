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
import { Search, Plus, X, ArrowUpDown } from "lucide-react";

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

export function ContractsToolbar({
  total,
  filtered,
}: {
  total: number;
  filtered: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (key === "value") {
      if (value) {
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
    } else if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const currentSort = searchParams.get("sort") ?? "date";
  const currentSector = searchParams.get("sector");
  const currentRegion = searchParams.get("region");
  const currentMinValue = searchParams.get("minValue");
  const currentMaxValue = searchParams.get("maxValue");
  const currentValueRange = currentMinValue
    ? currentMaxValue
      ? `${currentMinValue}-${currentMaxValue}`
      : `${currentMinValue}-`
    : null;

  const currentValueLabel = currentValueRange
    ? VALUE_RANGES.find((r) => {
        const encoded = r.max != null ? `${r.min}-${r.max}` : `${r.min}-`;
        return encoded === currentValueRange;
      })?.label ?? currentValueRange
    : undefined;

  const toggleSort = () => {
    updateFilter("sort", currentSort === "date" ? "score" : "date");
  };

  return (
    <div>
      {/* Search + Filters row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts, buyers, or CPV codes..."
              defaultValue={searchParams.get("query")?.toString()}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="hidden md:block h-6 w-px bg-border mx-2" />

          {/* Filter chips */}
          <div className="hidden md:flex items-center gap-2">
            <FilterChip
              label="Sector"
              value={currentSector}
              onSelect={(v) => updateFilter("sector", v)}
              onClear={() => updateFilter("sector", null)}
              options={SECTORS.map((s) => ({ value: s, label: s }))}
            />
            <FilterChip
              label="Region"
              value={currentRegion}
              displayValue={
                currentRegion ? REGIONS[currentRegion] ?? currentRegion : undefined
              }
              onSelect={(v) => updateFilter("region", v)}
              onClear={() => updateFilter("region", null)}
              options={Object.entries(REGIONS).map(([code, name]) => ({
                value: code,
                label: name,
              }))}
            />
            <FilterChip
              label="Value"
              value={currentValueRange}
              displayValue={currentValueLabel}
              onSelect={(v) => updateFilter("value", v)}
              onClear={() => updateFilter("value", null)}
              options={VALUE_RANGES.map((r) => ({
                value: r.max != null ? `${r.min}-${r.max}` : `${r.min}-`,
                label: r.label,
              }))}
            />
          </div>
        </div>

        {/* Count + Sort */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {filtered === total
              ? `${total.toLocaleString()} contracts`
              : `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>
              Sort by: {currentSort === "score" ? "AI Score" : "Newest"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
