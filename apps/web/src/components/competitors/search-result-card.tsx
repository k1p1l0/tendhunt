"use client";

import { useRouter } from "next/navigation";
import { FileText, Building2, PoundSterling, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { SupplierSearchResult } from "@/lib/competitors";

interface SearchResultCardProps {
  result: SupplierSearchResult;
  isSelected?: boolean;
  onClick?: () => void;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function SearchResultCard({
  result,
  isSelected,
  onClick,
}: SearchResultCardProps) {
  const router = useRouter();

  const handleClick = () => {
    onClick?.();
    router.push(
      `/competitors/${encodeURIComponent(result.name)}`
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
        isSelected
          ? "bg-accent"
          : "hover:bg-accent/50"
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{result.name}</span>
          {result.sectors.length > 0 && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {result.sectors[0]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {result.contractCount} contract{result.contractCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <PoundSterling className="h-3 w-3" />
            {formatValue(result.totalValue)}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {result.activeBuyerCount} buyer{result.activeBuyerCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
