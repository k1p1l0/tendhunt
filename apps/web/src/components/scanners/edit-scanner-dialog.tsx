"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchQueryInput } from "@/components/scanners/search-query-display";
import { Badge } from "@/components/ui/badge";
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

interface EditScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanner: {
    _id: string;
    name: string;
    type: ScannerType;
    description?: string;
    searchQuery?: string;
    filters?: Record<string, unknown>;
  };
  onSaved: (updated: {
    name: string;
    description: string;
    searchQuery: string;
    filters: Record<string, unknown>;
  }) => void;
}

const TYPE_LABELS: Record<ScannerType, string> = {
  rfps: "RFPs / Contracts",
  meetings: "Meetings",
  buyers: "Buyers",
};

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

export function EditScannerDialog({
  open,
  onOpenChange,
  scanner,
  onSaved,
}: EditScannerDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when dialog opens or scanner changes
  useEffect(() => {
    if (open && scanner) {
      setName(scanner.name);
      setDescription(scanner.description || "");
      setSearchQuery(scanner.searchQuery || "");
      setFilters({
        sector: (scanner.filters?.sector as string) || undefined,
        region: (scanner.filters?.region as string) || undefined,
        valueMin: scanner.filters?.valueMin
          ? String(scanner.filters.valueMin)
          : undefined,
        valueMax: scanner.filters?.valueMax
          ? String(scanner.filters.valueMax)
          : undefined,
        deadline: (scanner.filters?.deadline as string) || undefined,
        signalType: (scanner.filters?.signalType as string) || undefined,
        dateFrom: (scanner.filters?.dateFrom as string) || undefined,
        dateTo: (scanner.filters?.dateTo as string) || undefined,
      });
      setError(null);
    }
  }, [open, scanner]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value || undefined,
    }));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Scanner name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    // Build clean filters
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
      const res = await fetch(`/api/scanners/${scanner._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          searchQuery: searchQuery.trim(),
          filters:
            Object.keys(cleanFilters).length > 0 ? cleanFilters : {},
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update scanner");
      }

      onSaved({
        name: name.trim(),
        description: description.trim(),
        searchQuery: searchQuery.trim(),
        filters: cleanFilters,
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update scanner"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ""
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scanner</DialogTitle>
          <DialogDescription>
            Adjust the filters on your existing scanner. Changes here will only
            apply to new leads going forward. Existing leads remain as-is.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Scanner Type (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Scanner Type:
            </Label>
            <div>
              <Badge variant="outline">{TYPE_LABELS[scanner.type]}</Badge>
            </div>
          </div>

          {/* Scanner Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-scanner-name">
              Scanner Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-scanner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT Services Contract Monitor"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-scanner-description">Description</Label>
            <Input
              id="edit-scanner-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this scanner monitor?"
            />
          </div>

          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="edit-scanner-query">Search Query</Label>
            <SearchQueryInput
              id="edit-scanner-query"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="e.g. cloud migration OR IT infrastructure OR digital transformation"
            />
          </div>

          {/* Filters */}
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
                {TYPE_LABELS[scanner.type]} Filters
                {hasActiveFilters && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {
                      Object.values(filters).filter(
                        (v) => v !== undefined && v !== ""
                      ).length
                    }
                  </span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-3 rounded-lg border p-3">
                {scanner.type === "rfps" && (
                  <RfpFilters filters={filters} onChange={updateFilter} />
                )}
                {scanner.type === "meetings" && (
                  <MeetingsFilters
                    filters={filters}
                    onChange={updateFilter}
                  />
                )}
                {scanner.type === "buyers" && (
                  <BuyersFilters filters={filters} onChange={updateFilter} />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Type-specific filter components (same as create form) ---

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
