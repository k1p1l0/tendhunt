"use client";

import { memo } from "react";
import {
  FileText,
  Building2,
  Zap,
  ExternalLink,
} from "lucide-react";

import type { PipelineCardData } from "@/types/inbox";

interface KanbanCardContentProps {
  card: PipelineCardData;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-red-500",
};

const entityIcons: Record<string, typeof FileText> = {
  contract: FileText,
  buyer: Building2,
  signal: Zap,
};

const entityBadgeColors: Record<string, string> = {
  contract: "bg-blue-500/10 text-blue-600",
  buyer: "bg-emerald-500/10 text-emerald-600",
  signal: "bg-purple-500/10 text-purple-600",
};

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export const KanbanCardContent = memo(function KanbanCardContent({
  card,
}: KanbanCardContentProps) {
  const EntityIcon = entityIcons[card.entityType] ?? FileText;
  const badgeColor = entityBadgeColors[card.entityType] ?? "bg-muted text-muted-foreground";

  return (
    <div className="relative bg-card border rounded-lg p-3 shadow-sm transition-shadow duration-100 ease-in hover:shadow-md cursor-grab active:cursor-grabbing">
      {/* Priority dot */}
      <div
        className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${priorityColors[card.priority] ?? "bg-gray-400"}`}
      />

      {/* Title */}
      <p className="text-sm font-medium leading-snug pr-4 line-clamp-2">
        {card.title}
      </p>

      {/* Subtitle / buyer name */}
      {(card.buyerName || card.subtitle) && (
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {card.buyerName ?? card.subtitle}
        </p>
      )}

      {/* Meta row: value + deadline */}
      {(card.value || card.deadlineDate) && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {card.value != null && (
            <span className="font-medium text-foreground">
              {formatGBP(card.value)}
            </span>
          )}
          {card.deadlineDate && (
            <span>{formatShortDate(card.deadlineDate)}</span>
          )}
        </div>
      )}

      {/* Bottom row: entity badge + addedBy + link */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeColor}`}
        >
          <EntityIcon className="h-3 w-3" />
          {card.entityType}
        </span>

        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {card.addedBy === "auto_rule" ? "auto" : "manual"}
        </span>

        <div className="ml-auto">
          <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors duration-100 ease-in hover:text-foreground" />
        </div>
      </div>
    </div>
  );
});
