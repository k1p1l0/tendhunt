"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EnrichmentBadge } from "@/components/buyers/enrichment-badge";
import { resolveRegionName } from "@/lib/nuts-regions";
import { getActionCTA } from "@/lib/contract-mechanism";
import {
  ExternalLink,
  Building2,
  Sparkles,
  ChevronDown,
  Lock,
  TrendingUp,
  Globe,
  Linkedin,
  MapPin,
  Users,
  PoundSterling,
  FileText,
  Landmark,
  Mail,
  Phone,
  Circle,
  CircleDot,
  Loader,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ContactData {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  isRevealed?: boolean;
}

interface LinkedinData {
  companyType?: string | null;
  foundedYear?: number | null;
  followerCount?: number | null;
  employeeCountRange?: { start?: number | null; end?: number | null } | null;
  specialities?: unknown[] | null;
  industries?: unknown[] | null;
  locations?: unknown[] | null;
}

interface BuyerData {
  _id: string;
  name: string;
  orgType?: string | null;
  orgSubType?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  enrichmentScore?: number | null;
  linkedinUrl?: string | null;
  contractCount?: number | null;
  description?: string | null;
  address?: string | null;
  region?: string | null;
  sector?: string | null;
  industry?: string | null;
  staffCount?: number | null;
  annualBudget?: number | null;
  contacts?: ContactData[] | null;
  linkedin?: LinkedinData | null;
  democracyPortalUrl?: string | null;
  boardPapersUrl?: string | null;
  lastEnrichedAt?: string | Date | null;
}

interface ContractDetailData {
  _id: string;
  title: string;
  description?: string | null;
  status: string;
  stage?: string | null;
  buyerName: string;
  buyerOrg?: string | null;
  buyerRegion?: string | null;
  buyerId?: string | null;
  source: string;
  sourceUrl?: string | null;
  sector?: string | null;
  cpvCodes?: string[] | null;
  valueMin?: number | null;
  valueMax?: number | null;
  currency?: string | null;
  publishedDate?: string | Date | null;
  deadlineDate?: string | Date | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  vibeScore?: number | null;
  vibeReasoning?: string | null;
  procurementMethod?: string | null;
  procurementMethodDetails?: string | null;
  submissionMethod?: string[] | null;
  submissionPortalUrl?: string | null;
  buyerContact?: {
    name?: string | null;
    email?: string | null;
    telephone?: string | null;
  } | null;
  documents?: Array<{
    id?: string;
    documentType?: string;
    title?: string;
    description?: string;
    url?: string;
    datePublished?: string;
    format?: string;
  }> | null;
  lots?: Array<{
    lotId: string;
    title?: string | null;
    description?: string | null;
    value?: number | null;
    currency?: string;
    contractPeriodDays?: number | null;
    hasRenewal?: boolean;
    renewalDescription?: string | null;
    hasOptions?: boolean;
    optionsDescription?: string | null;
    variantPolicy?: string | null;
    status?: string | null;
    awardCriteria?: Array<{
      name: string;
      criteriaType: string;
      weight?: number | null;
    }>;
  }> | null;
  lotCount?: number | null;
  maxLotsBidPerSupplier?: number | null;
  contractMechanism?: "standard" | "dps" | "framework" | "call_off_dps" | "call_off_framework" | null;
  buyer?: BuyerData | null;
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
});

const numberFormatter = new Intl.NumberFormat("en-GB");

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMin != null && valueMax != null && valueMin !== valueMax) {
    return `${currencyFormatter.format(valueMin)} – ${currencyFormatter.format(valueMax)}`;
  }
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return null;
}

function statusClassName(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15";
    case "AWARDED":
      return "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/15";
    case "CANCELLED":
      return "bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/15";
    default:
      return "";
  }
}

function orgTypeLabel(orgType: string): string {
  const labels: Record<string, string> = {
    local_council_london: "London Borough",
    local_council_metro: "Metropolitan Borough",
    local_council_district: "District Council",
    local_council_county: "County Council",
    local_council_unitary: "Unitary Authority",
    nhs_trust_acute: "NHS Trust (Acute)",
    nhs_trust_mental_health: "NHS Trust (Mental Health)",
    nhs_trust_community: "NHS Trust (Community)",
    nhs_trust_ambulance: "NHS Trust (Ambulance)",
    nhs_icb: "NHS ICB",
    police_pcc: "Police / PCC",
    fire_rescue: "Fire & Rescue",
    university: "University",
    fe_college: "FE College",
    mat: "Multi-Academy Trust",
    combined_authority: "Combined Authority",
    national_park: "National Park",
    alb: "Arms-Length Body",
  };
  return (
    labels[orgType] ??
    orgType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return url;
  }
}

function documentTypeLabel(docType: string): string {
  const labels: Record<string, string> = {
    tenderNotice: "Tender Notice",
    biddingDocuments: "Bidding Documents",
    technicalSpecifications: "Technical Specifications",
    evaluationCriteria: "Evaluation Criteria",
    contractSigned: "Contract",
    contractArrangements: "Contract Arrangements",
    clarifications: "Clarifications",
    eligibilityCriteria: "Eligibility Criteria",
  };
  if (labels[docType]) return labels[docType];
  return docType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const isPast = diffMs < 0;

  if (absDays < 1) return isPast ? "today" : "today";
  if (absDays < 30) return isPast ? `${absDays}d ago` : `in ${absDays}d`;
  const months = Math.round(absDays / 30);
  if (months < 12) return isPast ? `${months}mo ago` : `in ${months} month${months > 1 ? "s" : ""}`;
  const years = Math.round(absDays / 365);
  return isPast ? `${years}y ago` : `in ${years} year${years > 1 ? "s" : ""}`;
}

function isFutureEndDate(contractEndDate?: string | Date | null): boolean {
  if (!contractEndDate) return false;
  return new Date(contractEndDate) > new Date();
}

function getMechanismLabel(mechanism: string): string {
  switch (mechanism) {
    case "dps":
      return "DPS";
    case "framework":
      return "Framework";
    case "call_off_dps":
      return "DPS Call-off";
    case "call_off_framework":
      return "Framework Call-off";
    default:
      return "";
  }
}

function mechanismBadgeClassName(mechanism: string): string {
  switch (mechanism) {
    case "dps":
    case "call_off_dps":
      return "bg-purple-500/15 text-purple-400 border-purple-500/20 hover:bg-purple-500/15";
    case "framework":
    case "call_off_framework":
      return "bg-indigo-500/15 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/15";
    default:
      return "";
  }
}

function ProcurementMechanismSection({
  mechanism,
  status,
  contractEndDate,
}: {
  mechanism: string;
  status: string;
  contractEndDate?: string | Date | null;
}) {
  if (mechanism === "standard" || !mechanism) return null;

  const futureEnd = isFutureEndDate(contractEndDate);
  const endDateFormatted = contractEndDate ? formatDate(contractEndDate) : null;

  let icon: React.ReactNode;
  let title: string;
  let explanation: string;
  let callout: string | null = null;

  switch (mechanism) {
    case "dps":
      icon = <RefreshCw className="h-5 w-5 text-purple-400 shrink-0" />;
      title = "Dynamic Purchasing System (DPS)";
      explanation =
        "This is a Dynamic Purchasing System -- a multi-year procurement framework that periodically reopens for new suppliers to join. Unlike a standard tender, a DPS runs for its full contract period and reopens application windows at intervals.";
      if (status === "CLOSED" && futureEnd) {
        callout = `The current application window is closed, but this DPS runs until ${endDateFormatted}. It will reopen for new applications -- monitor the buyer for the next window.`;
      } else if (status === "OPEN") {
        callout = "The application window is currently open. New suppliers can apply to join this DPS.";
      }
      break;

    case "framework":
      icon = <Layers className="h-5 w-5 text-indigo-400 shrink-0" />;
      title = "Framework Agreement";
      explanation =
        "This is a Framework Agreement -- a pre-established arrangement between the buyer and a set of qualified suppliers. Individual contracts (call-offs) are awarded to framework members throughout the agreement period.";
      if (status === "CLOSED" && futureEnd) {
        callout = `This framework agreement runs until ${endDateFormatted}. While new suppliers cannot join mid-term, monitoring the buyer may reveal when the framework is re-tendered.`;
      }
      break;

    case "call_off_dps":
      icon = <ArrowRight className="h-5 w-5 text-purple-400 shrink-0" />;
      title = "Call-off Contract (from DPS)";
      explanation =
        "This is a call-off contract awarded under a Dynamic Purchasing System. The parent DPS may still be accepting new suppliers.";
      break;

    case "call_off_framework":
      icon = <ArrowRight className="h-5 w-5 text-indigo-400 shrink-0" />;
      title = "Call-off Contract (from Framework Agreement)";
      explanation =
        "This is a call-off contract awarded under a Framework Agreement. The parent Framework may still be accepting new suppliers.";
      break;

    default:
      return null;
  }

  const isAmberCallout = mechanism === "dps" && status === "CLOSED" && futureEnd;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-8 mb-8"
    >
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2.5 mb-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {explanation}
        </p>
        {callout && (
          <div
            className={`mt-3 p-3 rounded-md border text-sm leading-relaxed ${
              isAmberCallout
                ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                : mechanism === "dps"
                  ? "border-purple-500/20 bg-purple-500/5 text-purple-300"
                  : "border-indigo-500/20 bg-indigo-500/5 text-indigo-300"
            }`}
          >
            {callout}
          </div>
        )}
      </div>
    </motion.div>
  );
}

type TimelinePhase = "planning" | "tender" | "award";

function ContractTimeline({
  stage,
  status,
  title,
  publishedDate,
  deadlineDate,
  contractStartDate,
  contractEndDate,
}: {
  stage?: string | null;
  status: string;
  title: string;
  publishedDate?: string | Date | null;
  deadlineDate?: string | Date | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
}) {
  const currentPhase: TimelinePhase =
    stage === "PLANNING" ? "planning" : stage === "AWARD" ? "award" : "tender";

  const published = publishedDate ? formatDate(publishedDate) : null;
  const deadline = deadlineDate ? formatDate(deadlineDate) : null;
  const deadlineDateObj = deadlineDate ? new Date(deadlineDate) : null;
  const deadlineRelative = deadlineDateObj ? relativeTime(deadlineDateObj) : null;
  const startDate = contractStartDate ? formatDate(contractStartDate) : null;
  const endDate = contractEndDate ? formatDate(contractEndDate) : null;
  const endDateObj = contractEndDate ? new Date(contractEndDate) : null;
  const endDateRelative = endDateObj ? relativeTime(endDateObj) : null;

  const hasTenderData = currentPhase === "tender" || (currentPhase === "award" && deadlineDate != null);

  const phases: {
    id: TimelinePhase;
    label: string;
    isActive: boolean;
    isCompleted: boolean;
    hasData: boolean;
  }[] = [
    {
      id: "planning",
      label: "Pre-tender",
      isActive: currentPhase === "planning",
      isCompleted: currentPhase === "tender" || currentPhase === "award",
      hasData: false,
    },
    {
      id: "tender",
      label: "Tender",
      isActive: currentPhase === "tender",
      isCompleted: currentPhase === "award" && hasTenderData,
      hasData: hasTenderData,
    },
    {
      id: "award",
      label: status === "AWARDED" || status === "CLOSED" ? "Awarded contract" : "Award",
      isActive: currentPhase === "award",
      isCompleted: false,
      hasData: currentPhase === "award",
    },
  ];

  return (
    <div className="mt-8 mb-8">
      <h3 className="text-lg font-medium mb-5">Timeline</h3>
      <div className="space-y-0">
        {phases.map((phase, idx) => {
          const isLast = idx === phases.length - 1;
          const isCurrent = phase.isActive;
          const showNotIdentified = !phase.hasData && !isCurrent;

          return (
            <div key={phase.id} className="flex gap-4">
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                {isCurrent ? (
                  <CircleDot className="h-5 w-5 text-blue-500 shrink-0" />
                ) : phase.isCompleted ? (
                  <Circle className="h-5 w-5 text-muted-foreground/60 fill-muted-foreground/20 shrink-0" />
                ) : (
                  <Loader className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                )}
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[24px] ${
                      phase.isCompleted ? "bg-muted-foreground/30" : "bg-border"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-baseline gap-4">
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? "text-blue-500"
                        : phase.isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {phase.label}
                  </span>
                  {showNotIdentified && (
                    <span className="text-sm text-muted-foreground/50">
                      Not identified
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-sm text-muted-foreground truncate max-w-xs">
                      {title}
                      <span className="text-xs text-muted-foreground/60 ml-2">(Current page)</span>
                    </span>
                  )}
                </div>

                {/* Tender phase dates */}
                {phase.id === "tender" && phase.hasData && (
                  <div className="mt-2 space-y-1.5">
                    {published && currentPhase === "tender" && (
                      <div className="flex items-baseline gap-6">
                        <span className="text-sm text-muted-foreground w-20">Published</span>
                        <span className="text-sm">{published}</span>
                      </div>
                    )}
                    {deadline && (
                      <div className="flex items-baseline gap-6">
                        <span className="text-sm text-muted-foreground w-20">Deadline</span>
                        <span className="text-sm">
                          {deadline}
                          {deadlineRelative && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {deadlineRelative}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Award phase dates */}
                {phase.id === "award" && isCurrent && (
                  <div className="mt-2 space-y-1.5">
                    {published && (
                      <div className="flex items-baseline gap-6">
                        <span className="text-sm text-muted-foreground w-20">Published</span>
                        <span className="text-sm">{published}</span>
                      </div>
                    )}
                    {startDate && (
                      <div className="flex items-baseline gap-6">
                        <span className="text-sm text-muted-foreground w-20">Start</span>
                        <span className="text-sm">{startDate}</span>
                      </div>
                    )}
                    {endDate && (
                      <div className="flex items-baseline gap-6">
                        <span className="text-sm text-muted-foreground w-20">Expiry</span>
                        <span className="text-sm">
                          {endDate}
                          {endDateRelative && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {endDateRelative}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function VibeScoreCircle({ score }: { score: number }) {
  let colorClass = "text-red-500 border-red-500/30 bg-red-500/10";
  if (score >= 7)
    colorClass = "text-lime-400 border-lime-400/30 bg-lime-400/10";
  else if (score >= 4)
    colorClass = "text-amber-500 border-amber-500/30 bg-amber-500/10";

  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-bold ${colorClass}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {score.toFixed(1)}
    </div>
  );
}

function BuyerIntelligenceCard({ buyer }: { buyer: BuyerData }) {
  const hasLinkedin = buyer.linkedin != null;
  const employeeRange = buyer.linkedin?.employeeCountRange;
  const industries = (buyer.linkedin?.industries ?? [])
    .map((i) => (typeof i === "string" ? i : (i as Record<string, string>)?.localizedName ?? null))
    .filter(Boolean);
  const specialities = (buyer.linkedin?.specialities ?? [])
    .map((s) => (typeof s === "string" ? s : null))
    .filter(Boolean) as string[];

  return (
    <div
      className="p-5 rounded-xl bg-card border border-border"
      style={{
        opacity: 0,
        animation: "sidebarCardIn 200ms ease-out 200ms both",
      }}
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Buyer Intelligence
      </h3>

      {/* Logo + Name + Type */}
      <div className="flex items-center gap-3 mb-4">
        {buyer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={buyer.logoUrl}
            alt=""
            className="h-12 w-12 rounded-lg object-contain bg-muted shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/buyers/${buyer._id}`}
            className="text-sm font-semibold transition-colors hover:text-blue-400 block truncate"
          >
            {buyer.name}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {buyer.orgType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {orgTypeLabel(buyer.orgType)}
              </Badge>
            )}
            {buyer.industry && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {buyer.industry}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {buyer.description && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          {buyer.description}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {buyer.contractCount != null && buyer.contractCount > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {numberFormatter.format(buyer.contractCount)}
              </div>
              <div className="text-[10px] text-muted-foreground">Contracts</div>
            </div>
          </div>
        )}
        {buyer.staffCount != null && buyer.staffCount > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {numberFormatter.format(buyer.staffCount)}
              </div>
              <div className="text-[10px] text-muted-foreground">Staff</div>
            </div>
          </div>
        )}
        {buyer.annualBudget != null && buyer.annualBudget > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <PoundSterling className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {currencyFormatter.format(buyer.annualBudget)}
              </div>
              <div className="text-[10px] text-muted-foreground">Annual Budget</div>
            </div>
          </div>
        )}
        {employeeRange?.start != null && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {numberFormatter.format(employeeRange.start)}
                {employeeRange.end ? `\u2013${numberFormatter.format(employeeRange.end)}` : "+"}
              </div>
              <div className="text-[10px] text-muted-foreground">Employees (LI)</div>
            </div>
          </div>
        )}
        {hasLinkedin && buyer.linkedin?.foundedYear && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium">{buyer.linkedin.foundedYear}</div>
              <div className="text-[10px] text-muted-foreground">Founded</div>
            </div>
          </div>
        )}
        {hasLinkedin && buyer.linkedin?.followerCount != null && buyer.linkedin.followerCount > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
            <Linkedin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {numberFormatter.format(buyer.linkedin.followerCount)}
              </div>
              <div className="text-[10px] text-muted-foreground">Followers</div>
            </div>
          </div>
        )}
      </div>

      {/* LinkedIn Industries & Specialities */}
      {industries.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Industries</div>
          <div className="flex flex-wrap gap-1">
            {industries.map((ind, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {String(ind)}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {specialities.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Specialities</div>
          <div className="flex flex-wrap gap-1">
            {specialities.map((spec, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                {spec}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {(buyer.address || buyer.region) && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{buyer.address ?? resolveRegionName(buyer.region)}</span>
        </div>
      )}

      {/* Enrichment Score */}
      {buyer.enrichmentScore != null && buyer.enrichmentScore > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border mb-3">
          <span className="text-xs text-muted-foreground">Enrichment Score</span>
          <EnrichmentBadge score={buyer.enrichmentScore} size="sm" />
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
        {buyer.website && (
          <a
            href={buyer.website.startsWith("http") ? buyer.website : `https://${buyer.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
          >
            <Globe className="h-3 w-3" />
            {getDomain(buyer.website)}
          </a>
        )}
        {buyer.linkedinUrl && (
          <a
            href={buyer.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
          >
            <Linkedin className="h-3 w-3" />
            LinkedIn
          </a>
        )}
        {buyer.democracyPortalUrl && (
          <a
            href={buyer.democracyPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
          >
            <Landmark className="h-3 w-3" />
            Democracy Portal
          </a>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full" asChild>
        <Link href={`/buyers/${buyer._id}`}>View Full Buyer Profile</Link>
      </Button>
    </div>
  );
}

function BuyerContactCard({
  buyerContact,
}: {
  buyerContact: NonNullable<ContractDetailData["buyerContact"]>;
}) {
  return (
    <div
      className="p-5 rounded-xl bg-card border border-border"
      style={{
        opacity: 0,
        animation: "sidebarCardIn 200ms ease-out 250ms both",
      }}
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Contact from Notice
      </h3>
      <div className="space-y-2">
        {buyerContact.name && (
          <div className="text-sm font-medium">{buyerContact.name}</div>
        )}
        {buyerContact.email && (
          <a
            href={`mailto:${buyerContact.email}`}
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> {buyerContact.email}
          </a>
        )}
        {buyerContact.telephone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {buyerContact.telephone}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsSection({
  documents,
  submissionPortalUrl,
}: {
  documents: NonNullable<ContractDetailData["documents"]>;
  submissionPortalUrl?: string | null;
}) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Documents</h3>
      <div className="space-y-2">
        {documents.map((doc, idx) => (
          <div
            key={doc.id || idx}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {doc.title || (doc.documentType ? documentTypeLabel(doc.documentType) : "Document")}
                </span>
                {doc.format && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase shrink-0">
                    {doc.format.replace(/^application\//, "").replace(/^(vnd\.\w+\.)/, "").split(/[.+]/).pop()}
                  </Badge>
                )}
              </div>
              {doc.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {doc.description}
                </div>
              )}
            </div>
            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 ml-3"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              </a>
            ) : submissionPortalUrl ? (
              <a
                href={submissionPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 ml-3"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View on Portal
                </Button>
              </a>
            ) : (
              <Badge variant="secondary" className="shrink-0 ml-3">
                On portal
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LotItem({
  lot,
  index,
}: {
  lot: NonNullable<ContractDetailData["lots"]>[number];
  index: number;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              Lot {index + 1}
            </span>
            <span className="text-sm font-medium truncate">
              {lot.title || "Untitled Lot"}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lot.value != null && (
              <span className="text-sm font-mono text-lime-400/90">
                {currencyFormatter.format(lot.value)}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 py-3 space-y-3 border-x border-b border-border rounded-b-lg">
          {lot.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {lot.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {lot.contractPeriodDays != null && (
              <Badge variant="secondary">{lot.contractPeriodDays} days</Badge>
            )}
            {lot.hasRenewal && <Badge variant="outline">Renewable</Badge>}
            {lot.hasOptions && <Badge variant="outline">Options</Badge>}
            {lot.status && <Badge variant="outline">{lot.status}</Badge>}
          </div>
          {lot.awardCriteria && lot.awardCriteria.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Award Criteria
              </div>
              <div className="space-y-1.5">
                {lot.awardCriteria.map((c, ci) => (
                  <div key={ci} className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    {c.weight != null && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-lime-400/70 rounded-full"
                            style={{ width: `${c.weight}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                          {c.weight}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function LotsSection({
  lots,
  lotCount,
  maxLotsBidPerSupplier,
  submissionPortalUrl,
}: {
  lots: NonNullable<ContractDetailData["lots"]>;
  lotCount?: number | null;
  maxLotsBidPerSupplier?: number | null;
  submissionPortalUrl?: string | null;
}) {
  const displayCount = lotCount ?? lots.length;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Lots ({displayCount})</h3>
        {maxLotsBidPerSupplier != null && (
          <Badge variant="outline">Max {maxLotsBidPerSupplier} lots per supplier</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        This tender is divided into {displayCount} lot{displayCount > 1 ? "s" : ""}.
        {maxLotsBidPerSupplier != null
          ? ` You can bid on up to ${maxLotsBidPerSupplier} lot${maxLotsBidPerSupplier > 1 ? "s" : ""}.`
          : displayCount > 1
            ? " You can bid on any or all lots."
            : ""}
        {submissionPortalUrl && (
          <>
            {" Submit your bid via the "}
            <a
              href={submissionPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
            >
              e-tendering portal <ExternalLink className="h-3 w-3" />
            </a>
            .
          </>
        )}
      </p>
      <div className="space-y-3">
        {lots.map((lot, idx) => (
          <LotItem key={lot.lotId || idx} lot={lot} index={idx} />
        ))}
      </div>
    </div>
  );
}

export function ContractDetailView({
  contract,
}: {
  contract: ContractDetailData;
}) {
  const value = formatValue(contract.valueMin, contract.valueMax);
  const published = formatDate(contract.publishedDate);
  const deadline = formatDate(contract.deadlineDate);
  const contacts = contract.buyer?.contacts?.filter((c) => c.name) ?? [];

  const hasBuyerContact =
    contract.buyerContact != null &&
    (contract.buyerContact.name != null || contract.buyerContact.email != null);

  const procedureLabel =
    contract.procurementMethodDetails ??
    contract.procurementMethod ??
    contract.stage ??
    "\u2014";

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      {/* Left Main Content */}
      <div
        className="flex-1 overflow-y-auto p-8 lg:border-r border-border"
        style={{
          opacity: 0,
          animation: "detailFadeIn 200ms ease-out forwards",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes detailFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes sidebarCardIn { from { opacity: 0; } to { opacity: 1; } }
              @media (prefers-reduced-motion: reduce) {
                [style*="detailFadeIn"], [style*="sidebarCardIn"] { animation: none !important; opacity: 1 !important; }
              }
            `,
          }}
        />
        <div className="max-w-4xl">
          {/* Hero Metadata */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {contract.contractMechanism &&
             contract.contractMechanism !== "standard" &&
             contract.status === "CLOSED" &&
             isFutureEndDate(contract.contractEndDate) ? (
              <Badge className="text-sm px-3 py-1 bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/15">
                Window Closed
              </Badge>
            ) : (
              <Badge
                className={`text-sm px-3 py-1 ${statusClassName(contract.status)}`}
              >
                {contract.status}
              </Badge>
            )}
            {contract.contractMechanism &&
             contract.contractMechanism !== "standard" && (
              <Badge
                className={`text-sm px-3 py-1 ${mechanismBadgeClassName(contract.contractMechanism)}`}
              >
                {getMechanismLabel(contract.contractMechanism)}
              </Badge>
            )}
            {contract.sector && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {contract.sector}
              </Badge>
            )}
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground font-mono">
              {contract.source}
            </span>
          </div>

          {/* Adaptive Apply CTA */}
          {(() => {
            const cta = getActionCTA(
              contract.contractMechanism,
              contract.status,
              contract.contractEndDate,
              contract.sourceUrl
            );
            const targetUrl = contract.submissionPortalUrl ?? contract.sourceUrl;

            if (cta.disabled) {
              return (
                <div className="flex items-center justify-between p-4 mb-6 rounded-lg border border-border bg-muted/30 opacity-60">
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">{cta.label}</div>
                  </div>
                </div>
              );
            }

            if (!targetUrl) return null;

            const borderColor =
              cta.variant === "default"
                ? "border-lime-400/30 bg-lime-400/5 hover:bg-lime-400/10"
                : cta.variant === "secondary"
                  ? "border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10"
                  : "border-border bg-muted/30 hover:bg-muted/50";
            const textColor =
              cta.variant === "default"
                ? "text-lime-400"
                : cta.variant === "secondary"
                  ? "text-amber-400"
                  : "text-muted-foreground";

            return (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-4 mb-6 rounded-lg border transition-colors group ${borderColor}`}
              >
                <div>
                  <div className={`text-sm font-semibold ${textColor}`}>{cta.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {getDomain(targetUrl)}
                  </div>
                </div>
                <ExternalLink className={`h-5 w-5 ${textColor} shrink-0 transition-transform group-hover:translate-x-0.5`} />
              </a>
            );
          })()}

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-muted/50 rounded-lg border border-border mb-8">
            <DetailRow
              label="Value Range"
              value={
                <span
                  className="font-mono text-lime-400/90"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {value ?? "Not specified"}
                </span>
              }
            />
            <DetailRow label="Deadline" value={deadline ?? "No deadline"} />
            <DetailRow
              label="Region"
              value={resolveRegionName(contract.buyerRegion)}
            />
            <DetailRow label="Published" value={published ?? "Unknown"} />
            <DetailRow label="Procedure" value={procedureLabel} />
            <DetailRow label="Notice Type" value={contract.status} />
            {contract.lotCount != null && contract.lotCount > 0 && (
              <DetailRow
                label="Lots"
                value={
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {contract.lotCount}
                  </span>
                }
              />
            )}
            <DetailRow
              label="CPV Codes"
              value={
                contract.cpvCodes && contract.cpvCodes.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {contract.cpvCodes.map((code) => (
                      <span
                        key={code}
                        className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border w-fit"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  "\u2014"
                )
              }
            />
            <DetailRow
              label="Original Source"
              value={
                contract.sourceUrl ? (
                  <a
                    href={contract.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300 text-xs mt-1"
                  >
                    View Notice <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  "\u2014"
                )
              }
            />
          </div>

          {/* Timeline */}
          <ContractTimeline
            stage={contract.stage}
            status={contract.status}
            title={contract.title}
            publishedDate={contract.publishedDate}
            deadlineDate={contract.deadlineDate}
            contractStartDate={contract.contractStartDate}
            contractEndDate={contract.contractEndDate}
          />

          {/* Description */}
          <div className="max-w-none">
            <h3 className="text-lg font-medium mb-4">Description</h3>
            {contract.description ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {contract.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No description available
              </p>
            )}
          </div>

          {/* Procurement Mechanism */}
          {contract.contractMechanism &&
           contract.contractMechanism !== "standard" && (
            <ProcurementMechanismSection
              mechanism={contract.contractMechanism}
              status={contract.status}
              contractEndDate={contract.contractEndDate}
            />
          )}

          {/* Documents */}
          {contract.documents && contract.documents.length > 0 && (
            <DocumentsSection
              documents={contract.documents}
              submissionPortalUrl={contract.submissionPortalUrl}
            />
          )}

          {/* Lots */}
          {contract.lots && contract.lots.length > 0 && (
            <LotsSection
              lots={contract.lots}
              lotCount={contract.lotCount}
              maxLotsBidPerSupplier={contract.maxLotsBidPerSupplier}
              submissionPortalUrl={contract.submissionPortalUrl}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[400px] overflow-y-auto p-6 bg-muted/30 space-y-6">
        {/* AI Vibe Score Card */}
        {contract.vibeScore != null && (
          <div
            className="p-5 rounded-xl bg-card border border-border shadow-sm relative overflow-hidden"
            style={{
              opacity: 0,
              animation: "sidebarCardIn 200ms ease-out 100ms both",
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lime-400" />
                  <span className="text-lime-400">AI Vibe Match</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Suitability analysis
                </p>
              </div>
              <VibeScoreCircle score={contract.vibeScore} />
            </div>

            {contract.vibeReasoning && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-snug">
                  {contract.vibeReasoning}
                </p>
                <button className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-lime-400 w-full mt-2">
                  Why this matches <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Buyer Intelligence Card */}
        {contract.buyer && <BuyerIntelligenceCard buyer={contract.buyer} />}

        {/* Contact from Notice Card */}
        {hasBuyerContact && (
          <BuyerContactCard
            buyerContact={contract.buyerContact as NonNullable<ContractDetailData["buyerContact"]>}
          />
        )}

        {/* Key Contacts Card */}
        <div
          className="p-5 rounded-xl bg-card border border-border"
          style={{
            opacity: 0,
            animation: "sidebarCardIn 200ms ease-out 300ms both",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Key Contacts
            </h3>
            {contacts.length > 0 && (
              <span className="text-[10px] bg-lime-400/10 text-lime-400 px-1.5 py-0.5 rounded border border-lime-400/20">
                {contacts.length} Found
              </span>
            )}
          </div>
          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{contact.name}</div>
                      {contact.title && (
                        <div className="text-xs text-muted-foreground truncate">{contact.title}</div>
                      )}
                    </div>
                    {!contact.isRevealed && (
                      <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                    )}
                  </div>
                  {contact.isRevealed && (contact.email || contact.phone) && (
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-blue-400 transition-colors hover:text-blue-300"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  )}
                  {!contact.isRevealed && (
                    <div className="mt-2">
                      <Button variant="secondary" size="sm" className="w-full h-7 text-xs">
                        Unlock Email (1 Credit)
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center border border-dashed border-border rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No direct contacts identified yet.
              </p>
            </div>
          )}
        </div>

        {/* Related Signals Card */}
        <div
          className="p-5 rounded-xl bg-card border border-border"
          style={{
            opacity: 0,
            animation: "sidebarCardIn 200ms ease-out 400ms both",
          }}
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Related Signals
          </h3>
          <div className="p-4 text-center border border-dashed border-border rounded-lg">
            <TrendingUp className="h-4 w-4 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No recent buying signals found.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
