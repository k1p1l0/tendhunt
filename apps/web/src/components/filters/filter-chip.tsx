"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterChipProps {
  label: string;
  value: string | null;
  displayValue?: string;
  onSelect: (value: string) => void;
  onClear: () => void;
  options: { value: string; label: string }[];
}

export function FilterChip({
  label,
  value,
  displayValue,
  onSelect,
  onClear,
  options,
}: FilterChipProps) {
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
