"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchQueryInput } from "@/components/scanners/search-query-display";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ScannerType } from "@/models/scanner";

interface ScannerCreationFormProps {
  type: ScannerType;
  onSave: (scanner: { _id: string }) => void;
  onCancel: () => void;
}

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
};

const SIGNAL_TYPES = [
  "PROCUREMENT",
  "STAFFING",
  "STRATEGY",
  "FINANCIAL",
  "PROJECTS",
  "REGULATORY",
] as const;

interface Filters {
  sector?: string;
  region?: string;
  valueMin?: string;
  valueMax?: string;
  deadline?: string;
  signalType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function ScannerCreationForm({
  type,
  onSave,
  onCancel,
}: ScannerCreationFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate AI query on mount
  useEffect(() => {
    async function generate() {
      setIsGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/scanners/generate-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate query");
        }
        const data = await res.json();
        setName(data.name || "");
        setDescription(data.description || "");
        setSearchQuery(data.searchQuery || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate query"
        );
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [type]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value || undefined,
    }));
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Scanner name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    // Build clean filters object (only defined values, convert numbers/dates)
    const cleanFilters: Record<string, unknown> = {};
    if (filters.sector) cleanFilters.sector = filters.sector;
    if (filters.region) cleanFilters.region = filters.region;
    if (filters.valueMin) cleanFilters.valueMin = Number(filters.valueMin);
    if (filters.valueMax) cleanFilters.valueMax = Number(filters.valueMax);
    if (filters.deadline) cleanFilters.deadline = filters.deadline;
    if (filters.signalType) cleanFilters.signalType = filters.signalType;
    if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom;
    if (filters.dateTo) cleanFilters.dateTo = filters.dateTo;

    try {
      const res = await fetch("/api/scanners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          searchQuery: searchQuery.trim(),
          filters:
            Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create scanner");
      }

      const data = await res.json();
      onSave({ _id: data.scanner._id });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create scanner"
      );
    } finally {
      setIsCreating(false);
    }
  }

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ""
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isGenerating ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-40 w-full" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Generating AI-powered configuration from your company profile...
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="scanner-name">Scanner Name</Label>
            <Input
              id="scanner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT Services Contract Monitor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanner-description">Description</Label>
            <Textarea
              id="scanner-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this scanner monitor?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanner-query">Search Query</Label>
            <SearchQueryInput
              id="scanner-query"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="e.g. cloud migration OR IT infrastructure OR digital transformation"
            />
            <p className="text-xs text-muted-foreground">
              AI-generated search conditions based on your company profile. The
              scanner uses this to evaluate relevance.
            </p>
          </div>

          {/* Type-specific filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {filtersOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {Object.values(filters).filter(
                      (v) => v !== undefined && v !== ""
                    ).length}
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-3 rounded-lg border p-3">
                {type === "rfps" && (
                  <RfpFilters filters={filters} onChange={updateFilter} />
                )}
                {type === "meetings" && (
                  <MeetingsFilters filters={filters} onChange={updateFilter} />
                )}
                {type === "buyers" && (
                  <BuyersFilters filters={filters} onChange={updateFilter} />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isCreating}>
          Back
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isGenerating || isCreating || !name.trim()}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create & Open"
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Type-specific filter components ---

function RfpFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Sector</Label>
          <Select
            value={filters.sector || "all"}
            onValueChange={(v) => onChange("sector", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Region</Label>
          <Select
            value={filters.region || "all"}
            onValueChange={(v) => onChange("region", v)}
          >
            <SelectTrigger className="h-8 text-xs">
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
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Min Value (GBP)</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder="0"
            value={filters.valueMin || ""}
            onChange={(e) => onChange("valueMin", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max Value (GBP)</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder="No limit"
            value={filters.valueMax || ""}
            onChange={(e) => onChange("valueMax", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Deadline Before</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filters.deadline || ""}
            onChange={(e) => onChange("deadline", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function MeetingsFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Signal Type</Label>
          <Select
            value={filters.signalType || "all"}
            onValueChange={(v) => onChange("signalType", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Signal Types</SelectItem>
              {SIGNAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Org Sector</Label>
          <Select
            value={filters.sector || "all"}
            onValueChange={(v) => onChange("sector", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Date From</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filters.dateFrom || ""}
            onChange={(e) => onChange("dateFrom", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date To</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filters.dateTo || ""}
            onChange={(e) => onChange("dateTo", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function BuyersFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Sector</Label>
        <Select
          value={filters.sector || "all"}
          onValueChange={(v) => onChange("sector", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {SECTORS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Region</Label>
        <Select
          value={filters.region || "all"}
          onValueChange={(v) => onChange("region", v)}
        >
          <SelectTrigger className="h-8 text-xs">
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
      </div>
    </div>
  );
}
