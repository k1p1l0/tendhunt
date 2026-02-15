"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MapPin,
  Users,
  GraduationCap,
  Calendar,
  ExternalLink,
  Building2,
  ArrowUpRight,
} from "lucide-react";

import type { RatingDirection } from "@/lib/ofsted-downgrade";

interface SchoolHeaderProps {
  school: {
    name: string;
    urn: number;
    phase?: string;
    schoolType?: string;
    localAuthority?: string;
    region?: string;
    postcode?: string;
    matName?: string;
    overallEffectiveness?: number | null;
    qualityOfEducation?: number | null;
    behaviourAndAttitudes?: number | null;
    personalDevelopment?: number | null;
    leadershipAndManagement?: number | null;
    safeguarding?: string;
    inspectionDate?: string | null;
    totalPupils?: number | null;
    idaciQuintile?: number | null;
    reportUrl?: string | null;
    ratingDirection?: RatingDirection | null;
    buyerId?: string | null;
    buyerName?: string | null;
  };
}

const GRADE_LABELS: Record<number, string> = {
  1: "Outstanding",
  2: "Good",
  3: "Requires Improvement",
  4: "Inadequate",
};

const GRADE_COLORS: Record<number, string> = {
  1: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  2: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  3: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  4: "bg-red-500/15 text-red-500 border-red-500/20",
};

const DIRECTION_BADGE: Record<string, { label: string; cls: string }> = {
  downgraded: { label: "Downgraded", cls: "bg-red-500/15 text-red-500 border-red-500/20" },
  improved: { label: "Improved", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  unchanged: { label: "Unchanged", cls: "bg-muted text-muted-foreground border-border" },
};

const IDACI_LABELS: Record<number, string> = {
  1: "Most deprived",
  2: "More deprived",
  3: "Average",
  4: "Less deprived",
  5: "Least deprived",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const numberFormatter = new Intl.NumberFormat("en-GB");

function renderRatingBadge(grade: number | null | undefined, label?: string) {
  if (grade == null) return null;
  return (
    <Badge variant="outline" className={`text-xs ${GRADE_COLORS[grade] ?? ""}`}>
      {label ? `${label}: ` : ""}{GRADE_LABELS[grade] ?? `Grade ${grade}`}
    </Badge>
  );
}

export function SchoolHeader({ school }: SchoolHeaderProps) {
  const inspectionDateStr = school.inspectionDate
    ? dateFormatter.format(new Date(school.inspectionDate))
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
      {/* Icon */}
      <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border">
        <GraduationCap className="w-10 h-10 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        {/* Buyer link if connected */}
        {school.buyerId && school.buyerName && (
          <Link
            href={`/buyers/${school.buyerId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <Building2 className="h-3 w-3" />
            {school.buyerName}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}

        <h2 className="text-2xl font-bold tracking-tight mb-1.5">
          {school.name}
        </h2>

        <div className="flex flex-col gap-3">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {school.overallEffectiveness != null && (
              renderRatingBadge(school.overallEffectiveness)
            )}
            {school.ratingDirection && DIRECTION_BADGE[school.ratingDirection] && (
              <Badge
                variant="outline"
                className={`text-xs ${DIRECTION_BADGE[school.ratingDirection].cls}`}
              >
                {DIRECTION_BADGE[school.ratingDirection].label}
              </Badge>
            )}
            {school.phase && (
              <Badge variant="outline" className="rounded-full">
                {school.phase}
              </Badge>
            )}
            {school.schoolType && (
              <Badge variant="outline" className="rounded-full">
                {school.schoolType}
              </Badge>
            )}
            {school.matName && (
              <Badge variant="secondary" className="rounded-full text-xs">
                MAT: {school.matName}
              </Badge>
            )}
          </div>

          {/* Sub-judgement ratings */}
          <div className="flex flex-wrap items-center gap-1.5">
            {renderRatingBadge(school.qualityOfEducation, "Quality of Ed")}
            {renderRatingBadge(school.behaviourAndAttitudes, "Behaviour")}
            {renderRatingBadge(school.personalDevelopment, "Personal Dev")}
            {renderRatingBadge(school.leadershipAndManagement, "Leadership")}
            {school.safeguarding && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  school.safeguarding.toLowerCase() === "yes"
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                    : "bg-red-500/15 text-red-500 border-red-500/20"
                }`}
              >
                Safeguarding: {school.safeguarding}
              </Badge>
            )}
          </div>

          {/* Info Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {(school.localAuthority || school.region) && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {school.localAuthority ?? school.region}
                {school.postcode && ` (${school.postcode})`}
              </span>
            )}
            {inspectionDateStr && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last inspected {inspectionDateStr}
              </span>
            )}
            {school.totalPupils != null && school.totalPupils > 0 && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {numberFormatter.format(school.totalPupils)} pupils
              </span>
            )}
            {school.idaciQuintile != null && (
              <span className="flex items-center gap-2 text-xs">
                IDACI: {IDACI_LABELS[school.idaciQuintile] ?? `Q${school.idaciQuintile}`}
              </span>
            )}
            {school.reportUrl && (
              <a
                href={school.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Latest report
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Large overall rating circle */}
      {school.overallEffectiveness != null && (
        <div className="flex-shrink-0 self-center md:self-start md:mt-2">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              school.overallEffectiveness === 1
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                : school.overallEffectiveness === 2
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : school.overallEffectiveness === 3
                    ? "border-amber-500 bg-amber-500/10 text-amber-600"
                    : "border-red-500 bg-red-500/10 text-red-500"
            }`}
          >
            <span className="text-2xl font-bold">{school.overallEffectiveness}</span>
          </div>
        </div>
      )}
    </div>
  );
}
