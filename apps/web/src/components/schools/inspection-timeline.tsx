"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus,
  FileText,
  Calendar,
} from "lucide-react";
import { compareInspections, gradeToLabel } from "@/lib/ofsted-downgrade";

import type { RatingDirection, SubJudgementChange } from "@/lib/ofsted-downgrade";

export interface InspectionEntryData {
  inspectionNumber: string;
  inspectionDate: string;
  publicationDate?: string | null;
  inspectionType?: string;
  inspectionTypeGrouping?: string;
  reportUrl?: string | null;
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
  safeguarding?: string;
  earlyYears?: number | null;
  sixthForm?: number | null;
  categoryOfConcern?: string;
  era?: string;
}

interface InspectionTimelineProps {
  inspections: InspectionEntryData[];
}

const GRADE_COLORS: Record<number, string> = {
  1: "bg-emerald-500",
  2: "bg-blue-500",
  3: "bg-amber-500",
  4: "bg-red-500",
};

const GRADE_RING_COLORS: Record<number, string> = {
  1: "ring-emerald-500/30",
  2: "ring-blue-500/30",
  3: "ring-amber-500/30",
  4: "ring-red-500/30",
};

const GRADE_TEXT_COLORS: Record<number, string> = {
  1: "text-emerald-600 dark:text-emerald-400",
  2: "text-blue-500 dark:text-blue-400",
  3: "text-amber-600 dark:text-amber-400",
  4: "text-red-500 dark:text-red-400",
};

const BADGE_COLORS: Record<number, string> = {
  1: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  2: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  3: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  4: "bg-red-500/15 text-red-500 border-red-500/20",
};

const DIRECTION_ICONS: Record<RatingDirection, React.ComponentType<{ className?: string }>> = {
  downgraded: TrendingDown,
  improved: TrendingUp,
  unchanged: Minus,
};

const DIRECTION_COLORS: Record<RatingDirection, string> = {
  downgraded: "text-red-500",
  improved: "text-emerald-500",
  unchanged: "text-muted-foreground",
};

const LINE_DIRECTION_COLORS: Record<RatingDirection, string> = {
  downgraded: "from-red-500/40 to-red-500/10",
  improved: "from-emerald-500/40 to-emerald-500/10",
  unchanged: "from-border to-border",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getBestGrade(entry: InspectionEntryData): number | null {
  return entry.overallEffectiveness ?? entry.qualityOfEducation ?? null;
}

function renderSubChanges(changes: SubJudgementChange[], direction: "downgraded" | "improved") {
  if (changes.length === 0) return null;
  const color = direction === "downgraded" ? "text-red-500" : "text-emerald-500";
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {changes.map((c) => (
        <span key={c.field} className={`text-[10px] ${color}`}>
          {c.label}: {gradeToLabel(c.previous)} &rarr; {gradeToLabel(c.current)}
        </span>
      ))}
    </div>
  );
}

function renderGradeRow(label: string, grade: number | null | undefined) {
  if (grade == null) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${BADGE_COLORS[grade] ?? ""}`}>
        {gradeToLabel(grade)}
      </Badge>
    </div>
  );
}

export function InspectionTimeline({ inspections }: InspectionTimelineProps) {
  const prefersReducedMotion = useReducedMotion();

  // Sort newest first, compute direction between consecutive inspections
  const entries = useMemo(() => {
    const sorted = [...inspections].sort(
      (a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
    );

    return sorted.map((entry, i) => {
      let direction: RatingDirection | null = null;
      let analysis: { downgradedAreas: SubJudgementChange[]; improvedAreas: SubJudgementChange[] } | null = null;

      if (i < sorted.length - 1) {
        const previous = sorted[i + 1];
        const result = compareInspections(entry, previous);
        direction = result.direction;
        analysis = {
          downgradedAreas: result.downgradedAreas,
          improvedAreas: result.improvedAreas,
        };
      }

      return { ...entry, direction, analysis };
    });
  }, [inspections]);

  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Calendar className="h-10 w-10" />
          <p className="text-sm">No inspection history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Inspection History
          <Badge variant="secondary" className="text-xs ml-1">
            {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Visual grade chart */}
        {inspections.length >= 2 && (
          <div className="mb-6">
            <RatingChart inspections={entries} />
          </div>
        )}

        {/* Timeline entries */}
        <div className="relative">
          <AnimatePresence mode="popLayout">
            {entries.map((entry, index) => {
              const grade = getBestGrade(entry);
              const isFirst = index === 0;
              const isLast = index === entries.length - 1;
              const DirectionIcon = entry.direction
                ? DIRECTION_ICONS[entry.direction]
                : null;

              return (
                <motion.div
                  key={entry.inspectionNumber}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(index * 0.04, 0.5),
                    ease: "easeOut",
                  }}
                  className="relative flex gap-4"
                >
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center w-8 shrink-0">
                    {/* Dot */}
                    <div
                      className={`w-4 h-4 rounded-full ring-4 z-10 ${
                        grade != null
                          ? `${GRADE_COLORS[grade]} ${GRADE_RING_COLORS[grade]}`
                          : "bg-muted ring-border"
                      } ${isFirst ? "w-5 h-5" : ""}`}
                    />
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 min-h-[24px] bg-gradient-to-b ${
                          entry.direction
                            ? LINE_DIRECTION_COLORS[entry.direction]
                            : "from-border to-border"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content card */}
                  <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                    <div className="rounded-lg border border-border bg-card p-4 hover:border-foreground/10 transition-colors duration-150">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium">
                            {dateFormatter.format(new Date(entry.inspectionDate))}
                          </span>
                          {entry.direction && DirectionIcon && (
                            <DirectionIcon
                              className={`h-3.5 w-3.5 ${DIRECTION_COLORS[entry.direction]}`}
                            />
                          )}
                          {isFirst && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Latest
                            </Badge>
                          )}
                        </div>
                        {entry.reportUrl && (
                          <a
                            href={entry.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="View Ofsted report"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      {/* Inspection type */}
                      <div className="flex items-center gap-2 mb-2">
                        {entry.inspectionType && (
                          <span className="text-xs text-muted-foreground">
                            {entry.inspectionType}
                          </span>
                        )}
                        {entry.era && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {entry.era}
                          </Badge>
                        )}
                      </div>

                      {/* Overall grade */}
                      {grade != null && (
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-lg font-bold ${GRADE_TEXT_COLORS[grade] ?? ""}`}
                          >
                            {grade}
                          </span>
                          <span className={`text-sm font-medium ${GRADE_TEXT_COLORS[grade] ?? ""}`}>
                            {gradeToLabel(grade)}
                          </span>
                          {entry.overallEffectiveness == null && entry.qualityOfEducation != null && (
                            <span className="text-[10px] text-muted-foreground">(no overall grade)</span>
                          )}
                        </div>
                      )}

                      {/* Sub-judgements */}
                      <div className="space-y-1">
                        {renderGradeRow("Quality of Education", entry.qualityOfEducation)}
                        {renderGradeRow("Behaviour & Attitudes", entry.behaviourAndAttitudes)}
                        {renderGradeRow("Personal Development", entry.personalDevelopment)}
                        {renderGradeRow("Leadership & Management", entry.leadershipAndManagement)}
                        {entry.earlyYears != null && renderGradeRow("Early Years", entry.earlyYears)}
                        {entry.sixthForm != null && renderGradeRow("Sixth Form", entry.sixthForm)}
                      </div>

                      {/* Safeguarding */}
                      {entry.safeguarding && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs">
                          <span className="text-muted-foreground">Safeguarding:</span>
                          <span
                            className={
                              entry.safeguarding.toLowerCase() === "yes"
                                ? "text-emerald-600"
                                : "text-red-500"
                            }
                          >
                            {entry.safeguarding}
                          </span>
                        </div>
                      )}

                      {/* Category of concern */}
                      {entry.categoryOfConcern && entry.categoryOfConcern.toLowerCase() !== "null" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] mt-2 bg-red-500/10 text-red-500 border-red-500/20"
                        >
                          {entry.categoryOfConcern}
                        </Badge>
                      )}

                      {/* Direction change details */}
                      {entry.analysis && (
                        <>
                          {renderSubChanges(entry.analysis.downgradedAreas, "downgraded")}
                          {renderSubChanges(entry.analysis.improvedAreas, "improved")}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mini rating chart (visual sparkline of grades over time) ────────

function RatingChart({ inspections }: { inspections: InspectionEntryData[] }) {
  const prefersReducedMotion = useReducedMotion();

  // Oldest first for chart
  const chronological = useMemo(
    () =>
      [...inspections]
        .filter((i) => getBestGrade(i) != null)
        .sort(
          (a, b) =>
            new Date(a.inspectionDate).getTime() -
            new Date(b.inspectionDate).getTime()
        ),
    [inspections]
  );

  if (chronological.length < 2) return null;

  const width = 100;
  const height = 40;
  const padX = 8;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = chronological.map((entry, i) => {
    const grade = getBestGrade(entry)!;
    const x = padX + (i / (chronological.length - 1)) * innerW;
    // Grade 1 = top, grade 4 = bottom
    const y = padY + ((grade - 1) / 3) * innerH;
    return { x, y, grade, date: entry.inspectionDate };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">Rating over time</span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Outstanding (1)</span>
          <span>Inadequate (4)</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-20"
        preserveAspectRatio="none"
      >
        {/* Grid lines for each grade */}
        {[1, 2, 3, 4].map((g) => {
          const y = padY + ((g - 1) / 3) * innerH;
          return (
            <line
              key={g}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Line path */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={prefersReducedMotion ? {} : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Data points */}
        {points.map((p, i) => {
          const color =
            p.grade === 1
              ? "#22c55e"
              : p.grade === 2
                ? "#3b82f6"
                : p.grade === 3
                  ? "#f59e0b"
                  : "#ef4444";
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.8}
              fill={color}
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.2,
                delay: 0.3 + i * 0.1,
              }}
            >
              <title>
                {dateFormatter.format(new Date(p.date))}: {gradeToLabel(p.grade)}
              </title>
            </motion.circle>
          );
        })}
      </svg>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>{dateFormatter.format(new Date(chronological[0].inspectionDate))}</span>
        <span>{dateFormatter.format(new Date(chronological[chronological.length - 1].inspectionDate))}</span>
      </div>
    </div>
  );
}
