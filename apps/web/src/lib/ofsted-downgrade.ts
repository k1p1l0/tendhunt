/**
 * Ofsted downgrade detection utilities.
 *
 * Handles both pre-2024 (overall effectiveness present) and post-Sep-2024
 * (no overall grade — sub-judgement only) inspection comparison.
 *
 * Ofsted grading scale: 1 = Outstanding, 2 = Good, 3 = Requires Improvement, 4 = Inadequate.
 * Higher number = worse grade, so current > previous means a downgrade.
 */

export type RatingDirection = "improved" | "downgraded" | "unchanged";

export interface SubJudgementChange {
  field: string;
  label: string;
  previous: number;
  current: number;
  direction: "improved" | "downgraded" | "unchanged";
}

export interface DowngradeAnalysis {
  direction: RatingDirection;
  /** Which sub-judgement areas were downgraded */
  downgradedAreas: SubJudgementChange[];
  /** Which sub-judgement areas improved */
  improvedAreas: SubJudgementChange[];
  /** Comma-separated field names of downgraded areas */
  downgradeType: string | null;
  /** Whether the overall effectiveness (when present) drove the detection */
  usedOverallEffectiveness: boolean;
}

interface InspectionGrades {
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
}

const SUB_JUDGEMENT_FIELDS: Array<{
  field: keyof InspectionGrades;
  label: string;
}> = [
  { field: "qualityOfEducation", label: "Quality of Education" },
  { field: "behaviourAndAttitudes", label: "Behaviour & Attitudes" },
  { field: "personalDevelopment", label: "Personal Development" },
  { field: "leadershipAndManagement", label: "Leadership & Management" },
];

/**
 * Compare two inspections and detect whether a downgrade occurred.
 *
 * For pre-Sep-2024 inspections (both have overallEffectiveness):
 *   - Uses overall effectiveness as primary signal
 *   - Falls through to sub-judgement comparison if overall is equal
 *
 * For post-Sep-2024 inspections (current lacks overallEffectiveness):
 *   - Compares each sub-judgement grade directly
 *   - ANY sub-judgement dropping = downgrade
 */
export function compareInspections(
  current: InspectionGrades,
  previous: InspectionGrades
): DowngradeAnalysis {
  const downgradedAreas: SubJudgementChange[] = [];
  const improvedAreas: SubJudgementChange[] = [];

  // Check if we can use overall effectiveness
  const hasOverall =
    current.overallEffectiveness != null &&
    previous.overallEffectiveness != null;

  if (hasOverall) {
    const curr = current.overallEffectiveness!;
    const prev = previous.overallEffectiveness!;

    if (curr > prev) {
      // Overall downgraded — also collect sub-judgement details
      collectSubJudgementChanges(
        current,
        previous,
        downgradedAreas,
        improvedAreas
      );
      return {
        direction: "downgraded",
        downgradedAreas,
        improvedAreas,
        downgradeType: "overall",
        usedOverallEffectiveness: true,
      };
    }

    if (curr < prev) {
      collectSubJudgementChanges(
        current,
        previous,
        downgradedAreas,
        improvedAreas
      );
      return {
        direction: "improved",
        downgradedAreas,
        improvedAreas,
        downgradeType: null,
        usedOverallEffectiveness: true,
      };
    }

    // Overall unchanged — fall through to sub-judgement comparison
  }

  // Sub-judgement comparison (primary for post-2024, secondary for pre-2024)
  collectSubJudgementChanges(
    current,
    previous,
    downgradedAreas,
    improvedAreas
  );

  if (downgradedAreas.length > 0) {
    return {
      direction: "downgraded",
      downgradedAreas,
      improvedAreas,
      downgradeType: downgradedAreas.map((a) => a.field).join(","),
      usedOverallEffectiveness: false,
    };
  }

  if (improvedAreas.length > 0) {
    return {
      direction: "improved",
      downgradedAreas,
      improvedAreas,
      downgradeType: null,
      usedOverallEffectiveness: false,
    };
  }

  return {
    direction: "unchanged",
    downgradedAreas: [],
    improvedAreas: [],
    downgradeType: null,
    usedOverallEffectiveness: false,
  };
}

function collectSubJudgementChanges(
  current: InspectionGrades,
  previous: InspectionGrades,
  downgradedAreas: SubJudgementChange[],
  improvedAreas: SubJudgementChange[]
): void {
  for (const { field, label } of SUB_JUDGEMENT_FIELDS) {
    const curr = current[field];
    const prev = previous[field];

    if (curr == null || prev == null) continue;

    if (curr > prev) {
      downgradedAreas.push({
        field,
        label,
        previous: prev,
        current: curr,
        direction: "downgraded",
      });
    } else if (curr < prev) {
      improvedAreas.push({
        field,
        label,
        previous: prev,
        current: curr,
        direction: "improved",
      });
    }
  }
}

/**
 * Detect downgrades across a school's full inspection history.
 *
 * Expects history sorted newest-first. Compares each consecutive pair
 * and returns the overall direction for the most recent transition,
 * plus the date of the most recent downgrade in the entire history.
 */
export function detectDowngradesFromHistory(
  history: (InspectionGrades & { inspectionDate: Date | string })[]
): {
  lastDowngradeDate: Date | null;
  ratingDirection: RatingDirection | null;
  downgradeType: string | null;
  latestAnalysis: DowngradeAnalysis | null;
} {
  if (!history || history.length < 2) {
    return {
      lastDowngradeDate: null,
      ratingDirection: null,
      downgradeType: null,
      latestAnalysis: null,
    };
  }

  let lastDowngradeDate: Date | null = null;
  let latestDirection: RatingDirection | null = null;
  let latestDowngradeType: string | null = null;
  let latestAnalysis: DowngradeAnalysis | null = null;

  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const previous = history[i + 1];

    const analysis = compareInspections(current, previous);

    if (i === 0) {
      latestDirection = analysis.direction;
      latestAnalysis = analysis;
      if (analysis.direction === "downgraded") {
        latestDowngradeType = analysis.downgradeType;
      }
    }

    if (analysis.direction === "downgraded" && !lastDowngradeDate) {
      lastDowngradeDate = new Date(current.inspectionDate);
      if (i === 0) {
        latestDowngradeType = analysis.downgradeType;
      }
    }
  }

  return {
    lastDowngradeDate,
    ratingDirection: latestDirection,
    downgradeType: latestDowngradeType,
    latestAnalysis,
  };
}

// ── Display helpers ─────────────────────────────────────────

const GRADE_LABELS: Record<number, string> = {
  1: "Outstanding",
  2: "Good",
  3: "Requires Improvement",
  4: "Inadequate",
};

export function gradeToLabel(grade: number | null | undefined): string {
  if (grade == null) return "N/A";
  return GRADE_LABELS[grade] ?? `Grade ${grade}`;
}

export function gradeToShortLabel(grade: number | null | undefined): string {
  if (grade == null) return "N/A";
  switch (grade) {
    case 1:
      return "Outstanding";
    case 2:
      return "Good";
    case 3:
      return "RI";
    case 4:
      return "Inadequate";
    default:
      return `${grade}`;
  }
}

/**
 * Human-readable downgrade type label from the comma-separated field string.
 * e.g. "qualityOfEducation,behaviourAndAttitudes" → "Quality of Ed, Behaviour"
 */
export function downgradeTypeToLabel(downgradeType: string | null): string {
  if (!downgradeType) return "";
  if (downgradeType === "overall") return "Overall Rating";

  const fieldLabels: Record<string, string> = {
    qualityOfEducation: "Quality of Ed",
    behaviourAndAttitudes: "Behaviour",
    personalDevelopment: "Personal Dev",
    leadershipAndManagement: "Leadership",
  };

  return downgradeType
    .split(",")
    .map((f) => fieldLabels[f] ?? f)
    .join(", ");
}
