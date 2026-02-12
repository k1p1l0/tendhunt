"use client";

import { useEffect, useState, useMemo } from "react";
import { useVibeStore } from "@/stores/vibe-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ContractData {
  _id: string;
  title: string;
  buyerName: string;
  sector?: string | null;
  valueMin?: number | null;
  valueMax?: number | null;
  buyerRegion?: string | null;
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function ScoreBadge({ score }: { score: number }) {
  let className: string;
  if (score >= 7) {
    className =
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  } else if (score >= 4) {
    className =
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  } else {
    className = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }

  return <Badge className={className}>{score.toFixed(1)}</Badge>;
}

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return null;
}

export function ScoredContractFeed() {
  const scores = useVibeStore((s) => s.scores);
  const threshold = useVibeStore((s) => s.threshold);
  const hideBelow = useVibeStore((s) => s.hideBelow);
  const [contractMap, setContractMap] = useState<Map<string, ContractData>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch contract data on mount
  useEffect(() => {
    async function loadContracts() {
      try {
        const res = await fetch("/api/contracts");
        if (!res.ok) throw new Error("Failed to fetch contracts");
        const data = await res.json();
        const map = new Map<string, ContractData>(
          data.contracts.map((c: ContractData) => [c._id, c])
        );
        setContractMap(map);
      } catch (err) {
        console.error("Failed to load contracts:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadContracts();
  }, []);

  // Sort scores descending and optionally filter by threshold
  const sortedScores = useMemo(() => {
    const entries = Object.entries(scores)
      .map(([contractId, { score, reasoning }]) => ({
        contractId,
        score,
        reasoning,
      }))
      .filter((entry) => {
        if (hideBelow && entry.score < threshold) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
    return entries;
  }, [scores, threshold, hideBelow]);

  const hasScores = Object.keys(scores).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasScores) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No contracts scored yet. Click &quot;Apply &amp; Score&quot; to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {sortedScores.length} scored contract
          {sortedScores.length !== 1 ? "s" : ""}
        </h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sortedScores.map(({ contractId, score, reasoning }) => {
          const contract = contractMap.get(contractId);
          if (!contract) return null;

          const value = formatValue(contract.valueMin, contract.valueMax);

          return (
            <Card key={contractId} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1 text-sm font-medium">
                    {contract.title}
                  </CardTitle>
                  <ScoreBadge score={score} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {contract.buyerName}
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {reasoning}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contract.sector && (
                    <Badge variant="outline" className="text-xs">
                      {contract.sector}
                    </Badge>
                  )}
                  {contract.buyerRegion && (
                    <Badge variant="secondary" className="text-xs">
                      {contract.buyerRegion}
                    </Badge>
                  )}
                  {value && (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
