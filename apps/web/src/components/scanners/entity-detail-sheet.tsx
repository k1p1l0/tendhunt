"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useScannerStore, getScore } from "@/stores/scanner-store";
import type { ScannerType } from "@/models/scanner";
import {
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Tag,
  Sparkles,
  Globe,
  Users,
  TrendingUp,
} from "lucide-react";
import { isTextUseCase } from "@/lib/ai-column-config";
import { SendToInboxButton } from "@/components/inbox/send-to-inbox-button";

import type { PipelineEntityType } from "@/lib/constants/pipeline-stages";

const SCANNER_TO_ENTITY: Record<ScannerType, PipelineEntityType> = {
  rfps: "contract",
  meetings: "signal",
  buyers: "buyer",
};

interface EntityDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: Record<string, unknown> | null;
  scannerType: ScannerType;
  aiColumns: Array<{ columnId: string; name: string; useCase?: string }>;
}

// ── Score display ────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  let cls =
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (score >= 7) {
    cls =
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  } else if (score >= 4) {
    cls =
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
  return (
    <div
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${cls}`}
    >
      {score.toFixed(1)}
    </div>
  );
}

// ── Detail field helpers ─────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm">{String(value)}</p>
        )}
      </div>
    </div>
  );
}

function formatDate(val: unknown): string {
  if (!val) return "";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(val: unknown): string {
  if (val == null) return "";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Type-specific detail sections ────────────────────────────

function ContractDetails({ row }: { row: Record<string, unknown> }) {
  const valueMin = row.valueMin as number | undefined;
  const valueMax = row.valueMax as number | undefined;
  const valueStr =
    valueMin && valueMax
      ? `${formatCurrency(valueMin)} – ${formatCurrency(valueMax)}`
      : formatCurrency(valueMax ?? valueMin) || undefined;

  return (
    <>
      <DetailRow icon={Building2} label="Buyer" value={row.buyerName as string} />
      <DetailRow icon={Tag} label="Sector" value={row.sector as string} />
      <DetailRow icon={MapPin} label="Region" value={row.buyerRegion as string} />
      <DetailRow
        icon={Calendar}
        label="Deadline"
        value={formatDate(row.deadlineDate)}
      />
      <DetailRow
        icon={Calendar}
        label="Published"
        value={formatDate(row.publishedDate)}
      />
      {valueStr && (
        <DetailRow icon={TrendingUp} label="Value" value={valueStr} />
      )}
      <DetailRow icon={Tag} label="Status" value={row.status as string} />
      {row.sourceUrl && (
        <DetailRow
          icon={ExternalLink}
          label="Source"
          value={row.source as string || "View original"}
          href={row.sourceUrl as string}
        />
      )}
    </>
  );
}

function SignalDetails({ row }: { row: Record<string, unknown> }) {
  return (
    <>
      <DetailRow
        icon={Building2}
        label="Organization"
        value={row.organizationName as string}
      />
      <DetailRow icon={Tag} label="Signal Type" value={row.signalType as string} />
      <DetailRow icon={Tag} label="Sector" value={row.sector as string} />
      <DetailRow
        icon={Calendar}
        label="Date"
        value={formatDate(row.sourceDate)}
      />
      <DetailRow icon={Globe} label="Source" value={row.source as string} />
      {row.confidence != null && (
        <DetailRow
          icon={TrendingUp}
          label="Confidence"
          value={`${Math.round(Number(row.confidence) * 100)}%`}
        />
      )}
    </>
  );
}

function BuyerDetails({ row }: { row: Record<string, unknown> }) {
  return (
    <>
      <DetailRow icon={Tag} label="Sector" value={row.sector as string} />
      <DetailRow icon={MapPin} label="Region" value={row.region as string} />
      <DetailRow
        icon={Globe}
        label="Website"
        value={row.website as string}
        href={row.website as string}
      />
      <DetailRow
        icon={Users}
        label="Contacts"
        value={
          row.contactCount != null ? String(row.contactCount) : undefined
        }
      />
      <DetailRow
        icon={TrendingUp}
        label="Contracts"
        value={
          row.contractCount != null ? String(row.contractCount) : undefined
        }
      />
    </>
  );
}

// ── Main component ───────────────────────────────────────────

export function EntityDetailSheet({
  open,
  onOpenChange,
  row,
  scannerType,
  aiColumns,
}: EntityDetailSheetProps) {
  const scores = useScannerStore((s) => s.scores);

  if (!row) return null;

  // Resolve entity name and title
  const entityName = String(
    row.buyerName || row.organizationName || row.name || ""
  );
  const title = String(row.title || row.name || row.organizationName || "");
  const description = String(row.description || row.insight || "");
  const entityId = String(row._id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-lg w-full"
      >
        <SheetHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-lg leading-tight pr-2">
              {title}
            </SheetTitle>
            <SendToInboxButton
              entityType={SCANNER_TO_ENTITY[scannerType]}
              entityId={entityId}
              title={title}
              subtitle={entityName !== title ? entityName : undefined}
              buyerName={String(row.buyerName || row.organizationName || "")}
              value={row.valueMax as number | undefined ?? row.valueMin as number | undefined}
              deadlineDate={row.deadlineDate ? String(row.deadlineDate) : undefined}
              sector={row.sector ? String(row.sector) : undefined}
              logoUrl={row.logoUrl ? String(row.logoUrl) : undefined}
            />
          </div>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          {/* Description / Insight */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description.length > 500
                ? description.slice(0, 500) + "…"
                : description}
            </p>
          )}

          <Separator />

          {/* Entity metadata fields */}
          <div className="space-y-1">
            {scannerType === "rfps" && <ContractDetails row={row} />}
            {scannerType === "meetings" && <SignalDetails row={row} />}
            {scannerType === "buyers" && <BuyerDetails row={row} />}
          </div>

          {/* AI Scores section */}
          {aiColumns.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-[#E5FF00]" />
                  AI Analysis
                </h3>
                {aiColumns.map((col) => {
                  const entry = getScore(scores, col.columnId, entityId);
                  const textMode = isTextUseCase(col.useCase);
                  return (
                    <div
                      key={col.columnId}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {col.name}
                        </span>
                        {!textMode && entry?.score != null && (
                          <ScoreBadge score={entry.score} />
                        )}
                      </div>
                      {textMode ? (
                        entry?.response ? (
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {entry.response}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Not yet analyzed
                          </p>
                        )
                      ) : entry?.reasoning ? (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {entry.reasoning}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Not yet scored
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
