"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveRegionName } from "@/lib/nuts-regions";

interface ContractCardData {
  _id: string;
  title: string;
  buyerName: string;
  buyerId?: string;
  buyerRegion?: string | null;
  valueMin?: number | null;
  valueMax?: number | null;
  publishedDate?: string | Date | null;
  deadlineDate?: string | Date | null;
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER";
  sector?: string | null;
  vibeScore?: number | null;
  vibeReasoning?: string | null;
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return null;
}

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function sourceLabel(source: string) {
  return source === "FIND_A_TENDER" ? "FaT" : "CF";
}

function ScoreBadge({ score }: { score: number }) {
  let className: string;
  if (score >= 7) {
    className = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  } else if (score >= 4) {
    className = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  } else {
    className = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }

  return (
    <Badge className={className}>
      {score.toFixed(1)}
    </Badge>
  );
}

export function ContractCard({ contract }: { contract: ContractCardData }) {
  const router = useRouter();
  const value = formatValue(contract.valueMin, contract.valueMax);
  const published = formatDate(contract.publishedDate);
  const deadline = formatDate(contract.deadlineDate);

  return (
    <Link href={`/contracts/${contract._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-base">
            {contract.title}
          </CardTitle>
          {contract.buyerId ? (
            <span
              role="link"
              tabIndex={0}
              className="text-sm text-primary hover:underline truncate block cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/buyers/${contract.buyerId}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/buyers/${contract.buyerId}`);
                }
              }}
            >
              {contract.buyerName}
            </span>
          ) : (
            <p className="text-sm text-muted-foreground truncate">
              {contract.buyerName}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {value && (
            <p className="text-sm font-medium">{value}</p>
          )}

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {published && <span>Published: {published}</span>}
            {deadline && <span>Deadline: {deadline}</span>}
            {contract.buyerRegion && (
              <span>{resolveRegionName(contract.buyerRegion)}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {contract.sector && (
              <Badge variant="outline">{contract.sector}</Badge>
            )}
            <Badge variant="secondary">
              {sourceLabel(contract.source)}
            </Badge>
            {contract.vibeScore != null && (
              <ScoreBadge score={contract.vibeScore} />
            )}
          </div>

          {contract.vibeScore != null && contract.vibeReasoning && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {contract.vibeReasoning}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
