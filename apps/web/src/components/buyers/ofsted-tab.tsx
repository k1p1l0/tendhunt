"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { gradeToLabel } from "@/lib/ofsted-downgrade";

interface InspectionHistoryEntry {
  inspectionNumber: string;
  inspectionDate: string;
  publicationDate?: string | null;
  inspectionType?: string;
  reportUrl?: string | null;
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
  era?: string;
}

export interface OfstedSchoolData {
  _id: string;
  urn: number;
  name: string;
  phase?: string;
  schoolType?: string;
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
  inspectionDate?: string | null;
  totalPupils?: number | null;
  idaciQuintile?: number | null;
  reportUrl?: string | null;
  postcode?: string | null;
  ratingDirection?: string | null;
  lastDowngradeDate?: string | null;
  inspectionHistory?: InspectionHistoryEntry[];
}

interface OfstedTabProps {
  schools: OfstedSchoolData[];
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

const IDACI_LABELS: Record<number, string> = {
  1: "Most deprived",
  2: "More deprived",
  3: "Average",
  4: "Less deprived",
  5: "Least deprived",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const numberFormatter = new Intl.NumberFormat("en-GB");

function formatDate(date?: string | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function getWorstRating(school: OfstedSchoolData): number | null {
  const ratings = [
    school.overallEffectiveness,
    school.qualityOfEducation,
    school.behaviourAndAttitudes,
    school.personalDevelopment,
    school.leadershipAndManagement,
  ].filter((r): r is number => r != null);

  if (ratings.length === 0) return null;
  return Math.max(...ratings);
}

function renderRatingBadge(grade: number | null | undefined) {
  if (grade == null) {
    return (
      <Badge variant="outline" className="text-xs">
        Not graded
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`text-xs ${GRADE_COLORS[grade] ?? ""}`}>
      {GRADE_LABELS[grade] ?? `Grade ${grade}`}
    </Badge>
  );
}

function InspectionHistoryTimeline({ entries }: { entries: InspectionHistoryEntry[] }) {
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
      ),
    [entries]
  );

  if (sorted.length === 0) return null;

  return (
    <div className="mt-3 pl-2 border-l-2 border-border space-y-2">
      {sorted.map((entry, i) => {
        const grade = entry.overallEffectiveness ?? entry.qualityOfEducation ?? null;
        return (
          <div key={entry.inspectionNumber || i} className="pl-3 py-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">
                {formatDate(entry.inspectionDate)}
              </span>
              {grade != null && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[grade] ?? ""}`}
                >
                  {gradeToLabel(grade)}
                </Badge>
              )}
              {entry.inspectionType && (
                <span className="text-[10px] text-muted-foreground">
                  {entry.inspectionType}
                </span>
              )}
              {entry.reportUrl && (
                <a
                  href={entry.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="View report"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OfstedTab({ schools }: OfstedTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const [expandedSchoolIds, setExpandedSchoolIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (schoolId: string) => {
    setExpandedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  };

  const stats = useMemo(() => {
    const total = schools.length;
    const goodPlus = schools.filter((s) => {
      const worst = getWorstRating(s);
      return worst != null && worst <= 2;
    }).length;
    const belowGood = schools.filter((s) => {
      const worst = getWorstRating(s);
      return worst != null && worst >= 3;
    }).length;
    const recentDowngrades = schools.filter(
      (s) => s.ratingDirection === "downgraded"
    ).length;
    const goodPlusPercent = total > 0 ? Math.round((goodPlus / total) * 100) : 0;

    return { total, goodPlus, belowGood, goodPlusPercent, recentDowngrades };
  }, [schools]);

  const sortedSchools = useMemo(
    () =>
      [...schools].sort((a, b) => {
        const ra = getWorstRating(a) ?? 0;
        const rb = getWorstRating(b) ?? 0;
        return rb - ra;
      }),
    [schools]
  );

  if (schools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <GraduationCap className="h-10 w-10" />
        <p className="text-sm">No linked Ofsted schools found for this buyer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.total}
          </div>
          <div className="text-xs text-muted-foreground">Schools</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-lg font-semibold text-emerald-500" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.goodPlusPercent}%
          </div>
          <div className="text-xs text-muted-foreground">Good or Better</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-lg font-semibold text-emerald-500" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.goodPlus}
          </div>
          <div className="text-xs text-muted-foreground">Good+</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-lg font-semibold text-amber-500" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.belowGood}
          </div>
          <div className="text-xs text-muted-foreground">Below Good</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
          <div className="text-lg font-semibold text-red-500" style={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.recentDowngrades}
          </div>
          <div className="text-xs text-muted-foreground">Downgraded</div>
        </div>
      </div>

      {/* Schools list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedSchools.map((school, index) => {
            const worst = getWorstRating(school);
            const date = formatDate(school.inspectionDate);
            const isBelowGood = worst != null && worst >= 3;
            const isExpanded = expandedSchoolIds.has(school._id);
            const hasHistory = school.inspectionHistory && school.inspectionHistory.length > 0;

            return (
              <motion.div
                key={school._id}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
              >
                <Card className={isBelowGood ? "border-amber-500/20" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/schools/${school.urn}`}
                            className="text-sm font-medium truncate hover:underline transition-colors"
                          >
                            {school.name}
                          </Link>
                          {school.phase && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {school.phase}
                            </Badge>
                          )}
                          {school.ratingDirection === "downgraded" && (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          {school.ratingDirection === "improved" && (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {renderRatingBadge(worst)}
                          {date && (
                            <span className="text-xs text-muted-foreground">
                              Inspected {date}
                            </span>
                          )}
                          {school.totalPupils != null && (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {numberFormatter.format(school.totalPupils)} pupils
                            </span>
                          )}
                          {school.idaciQuintile != null && (
                            <span className="text-xs text-muted-foreground">
                              IDACI: {IDACI_LABELS[school.idaciQuintile] ?? `Q${school.idaciQuintile}`}
                            </span>
                          )}
                        </div>

                        {/* Individual ratings for below-good schools */}
                        {isBelowGood && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {school.qualityOfEducation != null && school.qualityOfEducation >= 3 && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[school.qualityOfEducation]}`}>
                                Quality of Education: {GRADE_LABELS[school.qualityOfEducation]}
                              </Badge>
                            )}
                            {school.behaviourAndAttitudes != null && school.behaviourAndAttitudes >= 3 && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[school.behaviourAndAttitudes]}`}>
                                Behaviour: {GRADE_LABELS[school.behaviourAndAttitudes]}
                              </Badge>
                            )}
                            {school.personalDevelopment != null && school.personalDevelopment >= 3 && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[school.personalDevelopment]}`}>
                                Personal Dev: {GRADE_LABELS[school.personalDevelopment]}
                              </Badge>
                            )}
                            {school.leadershipAndManagement != null && school.leadershipAndManagement >= 3 && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${GRADE_COLORS[school.leadershipAndManagement]}`}>
                                Leadership: {GRADE_LABELS[school.leadershipAndManagement]}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Expandable inspection history */}
                        {hasHistory && isExpanded && (
                          <motion.div
                            initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <InspectionHistoryTimeline entries={school.inspectionHistory!} />
                          </motion.div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasHistory && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleExpanded(school._id)}
                            aria-label={isExpanded ? "Collapse history" : "Show history"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Link
                          href={`/schools/${school.urn}`}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="View school detail"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        {school.reportUrl && (
                          <a
                            href={school.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="View Ofsted report"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
