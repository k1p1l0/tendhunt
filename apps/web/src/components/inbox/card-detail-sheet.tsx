"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ExternalLink,
  FileText,
  Building2,
  Zap,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { CardNotes } from "./card-notes";

import type { PipelineCardData } from "@/types/inbox";

interface CardDetailSheetProps {
  card: PipelineCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdate: (id: string, updates: Partial<PipelineCardData>) => void;
  onCardDelete: (id: string) => void;
}

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

const priorityConfig: Record<
  string,
  { label: string; color: string; activeColor: string }
> = {
  LOW: {
    label: "Low",
    color: "text-muted-foreground",
    activeColor: "bg-gray-500/10 text-gray-600 ring-1 ring-gray-400/30",
  },
  MEDIUM: {
    label: "Medium",
    color: "text-muted-foreground",
    activeColor: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-400/30",
  },
  HIGH: {
    label: "High",
    color: "text-muted-foreground",
    activeColor: "bg-red-500/10 text-red-600 ring-1 ring-red-400/30",
  },
};

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getEntityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "contract":
      return `/contracts/${entityId}`;
    case "buyer":
      return `/buyers/${entityId}`;
    default:
      return null;
  }
}

export function CardDetailSheet({
  card,
  open,
  onOpenChange,
  onCardUpdate,
  onCardDelete,
}: CardDetailSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handlePriorityChange = useCallback(
    async (priority: "LOW" | "MEDIUM" | "HIGH") => {
      if (!card || card.priority === priority) return;

      onCardUpdate(card._id, { priority });

      try {
        const res = await fetch(`/api/inbox/${card._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        });

        if (!res.ok) throw new Error("Failed to update priority");
        toast.success(`Priority set to ${priorityConfig[priority].label}`);
      } catch {
        onCardUpdate(card._id, { priority: card.priority });
        toast.error("Failed to update priority");
      }
    },
    [card, onCardUpdate]
  );

  const handleArchive = useCallback(async () => {
    if (!card || isArchiving) return;

    setIsArchiving(true);
    onCardUpdate(card._id, { isArchived: true });

    try {
      const res = await fetch(`/api/inbox/${card._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });

      if (!res.ok) throw new Error("Failed to archive card");
      toast.success("Card archived");
      onOpenChange(false);
    } catch {
      onCardUpdate(card._id, { isArchived: false });
      toast.error("Failed to archive card");
    } finally {
      setIsArchiving(false);
    }
  }, [card, isArchiving, onCardUpdate, onOpenChange]);

  const handleDelete = useCallback(async () => {
    if (!card || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inbox/${card._id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete card");
      toast.success("Card deleted");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onCardDelete(card._id);
    } catch {
      toast.error("Failed to delete card");
    } finally {
      setIsDeleting(false);
    }
  }, [card, isDeleting, onCardDelete, onOpenChange]);

  if (!card) return null;

  const EntityIcon = entityIcons[card.entityType] ?? FileText;
  const badgeColor =
    entityBadgeColors[card.entityType] ?? "bg-muted text-muted-foreground";
  const stageInfo = PIPELINE_STAGES[card.stage];
  const entityHref = getEntityHref(card.entityType, card.entityId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[420px] sm:max-w-[420px] overflow-y-auto p-0"
        >
          <SheetTitle className="sr-only">{card.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Card details for {card.title}
          </SheetDescription>

          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b space-y-2">
              <div className="flex items-start gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded shrink-0 ${badgeColor}`}
                >
                  <EntityIcon className="h-3.5 w-3.5" />
                  {card.entityType}
                </span>
              </div>

              <h2 className="text-lg font-semibold leading-snug pr-6">
                {card.title}
              </h2>

              {card.deadlineDate && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Deadline: {formatShortDate(card.deadlineDate)}</span>
                </div>
              )}
            </div>

            {/* Source link */}
            {entityHref && (
              <div className="px-4 py-3 border-b">
                <Link
                  href={entityHref}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors duration-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View original {card.entityType}
                </Link>
              </div>
            )}

            {/* Details section */}
            <div className="px-4 py-3 border-b space-y-2">
              {card.buyerName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Buyer</span>
                  <span className="font-medium truncate max-w-[220px]">
                    {card.buyerName}
                  </span>
                </div>
              )}

              {card.value != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium">{formatGBP(card.value)}</span>
                </div>
              )}

              {card.sector && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sector</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-medium">
                    {card.sector}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Added</span>
                <span>{formatRelativeDate(card.createdAt)}</span>
              </div>

              {card.stageChangedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stage changed</span>
                  <span>{formatRelativeDate(card.stageChangedAt)}</span>
                </div>
              )}
            </div>

            {/* Priority selector */}
            <div className="px-4 py-3 border-b">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Priority
              </h4>
              <div className="flex gap-1.5">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => {
                  const config = priorityConfig[p];
                  const isActive = card.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ease-out min-h-[36px] ${
                        isActive
                          ? config.activeColor
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                      aria-label={`Set priority to ${config.label}`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage display */}
            <div className="px-4 py-3 border-b">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Stage
              </h4>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${stageInfo.color} ${stageInfo.textColor}`}
              >
                {stageInfo.label}
              </span>
            </div>

            {/* Notes section */}
            <div className="px-4 py-3 border-b flex-1">
              <CardNotes cardId={card._id} />
            </div>

            {/* Actions footer */}
            <div className="px-4 py-3 flex items-center gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[36px]"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[36px]"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{card.title}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
