"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface SpendFilterState {
  category?: string;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

interface SpendFiltersProps {
  categories: string[];
  vendors: string[];
  filters: SpendFilterState;
  onChange: (filters: SpendFilterState) => void;
}

export function SpendFilters({
  categories,
  vendors,
  filters,
  onChange,
}: SpendFiltersProps) {
  const updateFilter = (key: keyof SpendFilterState, value: string | number | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const clearFilter = (key: keyof SpendFilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const clearAll = () => {
    onChange({});
  };

  const hasFilters =
    filters.category ||
    filters.vendor ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined;

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        {/* Category */}
        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) => updateFilter("category", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.slice(0, 20).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Vendor */}
        <Select
          value={filters.vendor ?? "all"}
          onValueChange={(v) => updateFilter("vendor", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.slice(0, 30).map((vendor) => (
              <SelectItem key={vendor} value={vendor}>
                {vendor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Input
          type="date"
          placeholder="From date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          className="w-[160px]"
        />

        {/* Date To */}
        <Input
          type="date"
          placeholder="To date"
          value={filters.dateTo ?? ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="w-[160px]"
        />

        {/* Amount Min */}
        <Input
          type="number"
          placeholder="Min £"
          value={filters.amountMin ?? ""}
          onChange={(e) =>
            updateFilter("amountMin", e.target.value ? parseFloat(e.target.value) : undefined)
          }
          className="w-[120px]"
          min={0}
          step={100}
        />

        {/* Amount Max */}
        <Input
          type="number"
          placeholder="Max £"
          value={filters.amountMax ?? ""}
          onChange={(e) =>
            updateFilter("amountMax", e.target.value ? parseFloat(e.target.value) : undefined)
          }
          className="w-[120px]"
          min={0}
          step={100}
        />

        {/* Clear All */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-10"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <button
                onClick={() => clearFilter("category")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.vendor && (
            <Badge variant="secondary" className="gap-1">
              Vendor: {filters.vendor}
              <button
                onClick={() => clearFilter("vendor")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {new Date(filters.dateFrom).toLocaleDateString()}
              <button
                onClick={() => clearFilter("dateFrom")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {new Date(filters.dateTo).toLocaleDateString()}
              <button
                onClick={() => clearFilter("dateTo")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.amountMin !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Min: £{filters.amountMin.toLocaleString()}
              <button
                onClick={() => clearFilter("amountMin")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.amountMax !== undefined && (
            <Badge variant="secondary" className="gap-1">
              Max: £{filters.amountMax.toLocaleString()}
              <button
                onClick={() => clearFilter("amountMax")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
