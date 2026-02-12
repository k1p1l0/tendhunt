import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

import type { ColumnDef } from "./data-table";
import type { RecentContract, RecentBuyer, RecentSignal } from "@/lib/data";

function relativeTime(date: string | null): string {
  if (!date) return "-";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "-";
  }
}

function formatGBP(min: number | null, max: number | null): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);

  if (min != null && max != null && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return fmt(min);
  if (max != null) return fmt(max);
  return "-";
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return "-";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

// --- Contract Columns ---

const sourceColors: Record<string, string> = {
  FIND_A_TENDER: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  CONTRACTS_FINDER: "bg-green-500/15 text-green-700 dark:text-green-400",
};

const sourceLabels: Record<string, string> = {
  FIND_A_TENDER: "FaT",
  CONTRACTS_FINDER: "CF",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CLOSED: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  AWARDED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const contractColumns: ColumnDef<RecentContract>[] = [
  {
    key: "title",
    label: "Title",
    render: (item) => (
      <span className="max-w-[280px] block truncate" title={item.title}>
        {truncate(item.title, 60)}
      </span>
    ),
  },
  {
    key: "buyerName",
    label: "Buyer",
    render: (item) => (
      <span className="max-w-[200px] block truncate">{item.buyerName}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge
        variant="secondary"
        className={statusColors[item.status] ?? ""}
      >
        {item.status}
      </Badge>
    ),
  },
  {
    key: "source",
    label: "Source",
    render: (item) => (
      <Badge
        variant="secondary"
        className={sourceColors[item.source] ?? ""}
      >
        {sourceLabels[item.source] ?? item.source}
      </Badge>
    ),
  },
  {
    key: "valueMin",
    label: "Value",
    render: (item) => (
      <span className="tabular-nums">
        {formatGBP(item.valueMin, item.valueMax)}
      </span>
    ),
  },
  {
    key: "publishedDate",
    label: "Published",
    render: (item) => (
      <span className="text-muted-foreground text-xs">
        {relativeTime(item.publishedDate)}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Ingested",
    render: (item) => (
      <span className="text-muted-foreground text-xs">
        {relativeTime(item.createdAt)}
      </span>
    ),
  },
];

// --- Buyer Columns ---

function enrichmentScoreColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export const buyerColumns: ColumnDef<RecentBuyer>[] = [
  {
    key: "name",
    label: "Name",
    render: (item) => (
      <span className="max-w-[240px] block truncate font-medium">
        {item.name}
      </span>
    ),
  },
  {
    key: "orgType",
    label: "Org Type",
    render: (item) =>
      item.orgType ? (
        <Badge variant="secondary">{item.orgType}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (item) => (
      <span className="text-sm">{item.sector ?? "-"}</span>
    ),
  },
  {
    key: "region",
    label: "Region",
    render: (item) => (
      <span className="text-sm">{item.region ?? "-"}</span>
    ),
  },
  {
    key: "enrichmentScore",
    label: "Enrichment",
    render: (item) => (
      <span
        className={`font-semibold tabular-nums ${enrichmentScoreColor(item.enrichmentScore)}`}
      >
        {item.enrichmentScore != null ? item.enrichmentScore : "-"}
      </span>
    ),
  },
  {
    key: "contractCount",
    label: "Contracts",
    render: (item) => (
      <span className="tabular-nums">{item.contractCount}</span>
    ),
  },
  {
    key: "createdAt",
    label: "Ingested",
    render: (item) => (
      <span className="text-muted-foreground text-xs">
        {relativeTime(item.createdAt)}
      </span>
    ),
  },
];

// --- Signal Columns ---

const signalTypeColors: Record<string, string> = {
  PROCUREMENT: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  STAFFING: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  STRATEGY: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  FINANCIAL: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PROJECTS: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  REGULATORY: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const signalColumns: ColumnDef<RecentSignal>[] = [
  {
    key: "organizationName",
    label: "Organization",
    render: (item) => (
      <span className="max-w-[200px] block truncate font-medium">
        {item.organizationName}
      </span>
    ),
  },
  {
    key: "signalType",
    label: "Type",
    render: (item) => (
      <Badge
        variant="secondary"
        className={signalTypeColors[item.signalType] ?? ""}
      >
        {item.signalType}
      </Badge>
    ),
  },
  {
    key: "title",
    label: "Title",
    render: (item) => (
      <span className="max-w-[240px] block truncate" title={item.title}>
        {truncate(item.title, 50)}
      </span>
    ),
  },
  {
    key: "sector",
    label: "Sector",
    render: (item) => (
      <span className="text-sm">{item.sector ?? "-"}</span>
    ),
  },
  {
    key: "confidence",
    label: "Confidence",
    render: (item) => (
      <span className="tabular-nums text-sm">
        {Math.round(item.confidence * 100)}%
      </span>
    ),
  },
  {
    key: "sourceDate",
    label: "Source Date",
    render: (item) => (
      <span className="text-muted-foreground text-xs">
        {relativeTime(item.sourceDate)}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Ingested",
    render: (item) => (
      <span className="text-muted-foreground text-xs">
        {relativeTime(item.createdAt)}
      </span>
    ),
  },
];
