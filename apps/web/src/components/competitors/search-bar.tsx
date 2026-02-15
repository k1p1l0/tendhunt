"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { SearchResultCard } from "./search-result-card";

import type { SupplierSearchResult } from "@/lib/competitors";

interface CompetitorSearchBarProps {
  onSelect?: (result: SupplierSearchResult) => void;
}

export function CompetitorSearchBar({ onSelect }: CompetitorSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useDebouncedCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/competitors/search?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results ?? []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedIndex(-1);
      if (value.trim().length >= 2) {
        setIsLoading(true);
      }
      fetchResults(value);
    },
    [fetchResults]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (result: SupplierSearchResult) => {
      setIsOpen(false);
      setQuery(result.name);
      onSelect?.(result);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, results, selectedIndex, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a supplier or competitor..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="pl-9 pr-9 h-11 text-base"
          autoComplete="off"
          aria-label="Search suppliers"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query.length > 0 ? (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border bg-popover shadow-lg overflow-hidden"
            role="listbox"
          >
            {results.map((result, index) => (
              <SearchResultCard
                key={result.normalizedName}
                result={result}
                isSelected={index === selectedIndex}
                onClick={() => handleSelect(result)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border bg-popover shadow-lg p-4 text-center text-sm text-muted-foreground"
          >
            No suppliers found matching &ldquo;{query}&rdquo;
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
