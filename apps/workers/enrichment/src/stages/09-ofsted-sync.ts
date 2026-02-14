import Papa from "papaparse";
import type { AnyBulkWriteOperation, Db, Document } from "mongodb";
import type { Env } from "../types";

// ---------------------------------------------------------------------------
// Stage 9: Ofsted Inspection Data Sync
//
// Downloads latest Ofsted "all inspections" CSVs from GOV.UK, diffs against
// existing inspectionHistory per school, inserts only new inspections, and
// recomputes downgrade detection fields.
//
// Self-gating: checks `ofstedsyncmeta.lastSyncedAt` and only runs if >7 days
// have elapsed. This stage is called on every :00 cron after the buyer
// pipeline completes, but the weekly gate prevents redundant processing.
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SYNC_META_COLLECTION = "ofstedsyncmeta";
const SCHOOLS_COLLECTION = "ofstedschools";

type Era = "pre2019" | "2019-2024" | "post2024";

interface CsvSource {
  era: Era;
  url: string;
  hasOverallEffectiveness: boolean;
  hasTitleRow: boolean;
}

const CSV_SOURCES: CsvSource[] = [
  {
    era: "pre2019",
    url: "https://assets.publishing.service.gov.uk/media/5f6b4b76d3bf7f72337b6ef7/Management_information_-_state-funded_schools_1_September_2015_to_31_August_2019.csv",
    hasOverallEffectiveness: true,
    hasTitleRow: true,
  },
  {
    era: "2019-2024",
    url: "https://assets.publishing.service.gov.uk/media/678f9d297bb65baf62c2ad69/Management_information_-_state-funded_schools_-_all_inspections_-_year_to_date_published_by_30_Sep_2024.csv",
    hasOverallEffectiveness: true,
    hasTitleRow: false,
  },
  {
    era: "post2024",
    url: "https://assets.publishing.service.gov.uk/media/68bfd548223d92d088f01dd8/Management_information_-_state-funded_schools_-_all_inspections_-_year_to_date_published_by_31_Aug_2025.csv",
    hasOverallEffectiveness: false,
    hasTitleRow: false,
  },
];

// ---------------------------------------------------------------------------
// Inspection entry shape (mirrors the Mongoose subdocument)
// ---------------------------------------------------------------------------

interface InspectionEntry {
  inspectionNumber: string;
  inspectionDate: Date;
  publicationDate?: Date;
  inspectionType?: string;
  inspectionTypeGrouping?: string;
  reportUrl?: string;
  overallEffectiveness?: number;
  qualityOfEducation?: number;
  behaviourAndAttitudes?: number;
  personalDevelopment?: number;
  leadershipAndManagement?: number;
  safeguarding?: string;
  earlyYears?: number;
  sixthForm?: number;
  categoryOfConcern?: string;
  era: Era;
}

interface ParsedInspection {
  urn: number;
  schoolName: string;
  phase?: string;
  schoolType?: string;
  localAuthority?: string;
  region?: string;
  postcode?: string;
  matUid?: string;
  matName?: string;
  idaciQuintile: number | null;
  totalPupils: number | null;
  inspection: InspectionEntry;
}

interface SyncSummary {
  schoolsUpdated: number;
  newInspectionsInserted: number;
  newDowngradesDetected: number;
  totalCsvRecordsParsed: number;
  skippedGateCheck: boolean;
  errors: number;
}

// ---------------------------------------------------------------------------
// CSV parsing helpers (ported from ingest-ofsted-history.ts)
// ---------------------------------------------------------------------------

function parseGrade(val: string | undefined): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "NULL" || trimmed === "N/A") return null;
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n < 1 || n > 4) return null;
  return n;
}

function parseDateVal(val: string | undefined): Date | null {
  if (!val || val.trim() === "" || val.trim() === "NULL") return null;
  const trimmed = val.trim();

  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(
      parseInt(ddmmyyyy[3]),
      parseInt(ddmmyyyy[2]) - 1,
      parseInt(ddmmyyyy[1])
    );
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: string | undefined): number | null {
  if (!val || val.trim() === "" || val.trim() === "NULL") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

type CsvRow = Record<string, string>;

function getCol(row: CsvRow, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== "") return row[c];
  }
  return undefined;
}

function buildReportUrl(row: CsvRow): string | undefined {
  const webLink = getCol(
    row,
    "Web link",
    "Web link (opens in new window)",
    "Web Link"
  );
  if (!webLink || webLink === "NULL") return undefined;
  return webLink.trim();
}

function mapRow(row: CsvRow, era: Era): ParsedInspection | null {
  const urn = parseNumber(getCol(row, "URN"));
  if (!urn) return null;

  const schoolName = getCol(row, "School name")?.trim();
  if (!schoolName) return null;

  const inspectionNumber = getCol(row, "Inspection number")?.trim();
  if (!inspectionNumber || inspectionNumber === "NULL") return null;

  const inspectionDate = parseDateVal(getCol(row, "Inspection start date"));
  if (!inspectionDate) return null;

  let qualityOfEducation: number | null;
  let behaviourAndAttitudes: number | null;
  let personalDevelopment: number | null;
  let leadershipAndManagement: number | null;
  let safeguarding: string | undefined;
  let earlyYears: number | null;
  let sixthForm: number | null;

  if (era === "pre2019") {
    qualityOfEducation = parseGrade(
      getCol(row, "Quality of teaching, learning and assessment")
    );
    const pdbw = parseGrade(
      getCol(row, "Personal development, behaviour and welfare")
    );
    behaviourAndAttitudes = pdbw;
    personalDevelopment = pdbw;
    leadershipAndManagement = parseGrade(
      getCol(row, "Effectiveness of leadership and management")
    );
    safeguarding =
      getCol(row, "Is safeguarding effective?")?.trim() || undefined;
    earlyYears = parseGrade(
      getCol(row, "Early years provision (where applicable)")
    );
    sixthForm = parseGrade(
      getCol(row, "16 to 19 study programmes (where applicable)")
    );
  } else {
    qualityOfEducation = parseGrade(getCol(row, "Quality of education"));
    behaviourAndAttitudes = parseGrade(
      getCol(row, "Behaviour and attitudes")
    );
    personalDevelopment = parseGrade(getCol(row, "Personal development"));
    leadershipAndManagement = parseGrade(
      getCol(row, "Effectiveness of leadership and management")
    );
    safeguarding =
      getCol(
        row,
        "Safeguarding is effective?",
        "Safeguarding is effective"
      )?.trim() || undefined;
    earlyYears = parseGrade(
      getCol(row, "Early years provision (where applicable)")
    );
    sixthForm = parseGrade(
      getCol(
        row,
        "Sixth form provision (where applicable)",
        "16 to 19 study programmes (where applicable)"
      )
    );
  }

  const overallEffectiveness =
    era !== "post2024"
      ? parseGrade(getCol(row, "Overall effectiveness"))
      : null;

  const hasAnyGrade =
    overallEffectiveness !== null ||
    qualityOfEducation !== null ||
    behaviourAndAttitudes !== null ||
    personalDevelopment !== null ||
    leadershipAndManagement !== null;

  if (!hasAnyGrade) return null;

  const inspection: InspectionEntry = {
    inspectionNumber,
    inspectionDate,
    publicationDate:
      parseDateVal(getCol(row, "Publication date")) ?? undefined,
    inspectionType: getCol(row, "Inspection type")?.trim() || undefined,
    inspectionTypeGrouping:
      getCol(row, "Inspection type grouping")?.trim() || undefined,
    reportUrl: buildReportUrl(row),
    overallEffectiveness: overallEffectiveness ?? undefined,
    qualityOfEducation: qualityOfEducation ?? undefined,
    behaviourAndAttitudes: behaviourAndAttitudes ?? undefined,
    personalDevelopment: personalDevelopment ?? undefined,
    leadershipAndManagement: leadershipAndManagement ?? undefined,
    safeguarding,
    earlyYears: earlyYears ?? undefined,
    sixthForm: sixthForm ?? undefined,
    categoryOfConcern:
      getCol(row, "Category of concern")?.trim() || undefined,
    era,
  };

  return {
    urn,
    schoolName,
    phase: getCol(row, "Ofsted phase")?.trim() || undefined,
    schoolType: getCol(row, "Type of education")?.trim() || undefined,
    localAuthority: getCol(row, "Local authority")?.trim() || undefined,
    region:
      getCol(row, "Region")?.trim() ||
      getCol(row, "Ofsted region")?.trim() ||
      undefined,
    postcode: getCol(row, "Postcode")?.trim() || undefined,
    matUid: getCol(row, "Multi-academy trust UID")?.trim() || undefined,
    matName: getCol(row, "Multi-academy trust name")?.trim() || undefined,
    idaciQuintile: parseNumber(
      getCol(
        row,
        "The income deprivation affecting children index (IDACI) quintile"
      )
    ),
    totalPupils: parseNumber(getCol(row, "Total number of pupils")),
    inspection,
  };
}

// ---------------------------------------------------------------------------
// Downgrade detection (inlined to avoid cross-package import)
// ---------------------------------------------------------------------------

type RatingDirection = "improved" | "downgraded" | "unchanged";

interface InspectionGrades {
  overallEffectiveness?: number;
  qualityOfEducation?: number;
  behaviourAndAttitudes?: number;
  personalDevelopment?: number;
  leadershipAndManagement?: number;
}

function compareInspections(
  current: InspectionGrades,
  previous: InspectionGrades
): { direction: RatingDirection; downgradeType: string | null } {
  if (
    current.overallEffectiveness != null &&
    previous.overallEffectiveness != null
  ) {
    if (current.overallEffectiveness > previous.overallEffectiveness) {
      return { direction: "downgraded", downgradeType: "overall" };
    }
    if (current.overallEffectiveness < previous.overallEffectiveness) {
      return { direction: "improved", downgradeType: null };
    }
  }

  const subJudgements: Array<{
    field: string;
    current: number | undefined;
    previous: number | undefined;
  }> = [
    {
      field: "qualityOfEducation",
      current: current.qualityOfEducation,
      previous: previous.qualityOfEducation,
    },
    {
      field: "behaviourAndAttitudes",
      current: current.behaviourAndAttitudes,
      previous: previous.behaviourAndAttitudes,
    },
    {
      field: "personalDevelopment",
      current: current.personalDevelopment,
      previous: previous.personalDevelopment,
    },
    {
      field: "leadershipAndManagement",
      current: current.leadershipAndManagement,
      previous: previous.leadershipAndManagement,
    },
  ];

  let anyDowngrade = false;
  let anyImprove = false;
  const downgradedAreas: string[] = [];

  for (const sub of subJudgements) {
    if (sub.current != null && sub.previous != null) {
      if (sub.current > sub.previous) {
        anyDowngrade = true;
        downgradedAreas.push(sub.field);
      } else if (sub.current < sub.previous) {
        anyImprove = true;
      }
    }
  }

  if (anyDowngrade) {
    return { direction: "downgraded", downgradeType: downgradedAreas.join(",") };
  }
  if (anyImprove) {
    return { direction: "improved", downgradeType: null };
  }
  return { direction: "unchanged", downgradeType: null };
}

function detectDowngrades(
  history: InspectionEntry[]
): {
  lastDowngradeDate: Date | null;
  ratingDirection: RatingDirection | null;
  downgradeType: string | null;
} {
  if (history.length < 2) {
    return { lastDowngradeDate: null, ratingDirection: null, downgradeType: null };
  }

  let lastDowngradeDate: Date | null = null;
  let latestDirection: RatingDirection | null = null;
  let latestDowngradeType: string | null = null;

  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const previous = history[i + 1];
    const comparison = compareInspections(current, previous);

    if (i === 0) {
      latestDirection = comparison.direction;
      if (comparison.direction === "downgraded") {
        latestDowngradeType = comparison.downgradeType;
      }
    }

    if (comparison.direction === "downgraded" && !lastDowngradeDate) {
      lastDowngradeDate = current.inspectionDate;
      if (i === 0) {
        latestDowngradeType = comparison.downgradeType;
      }
    }
  }

  return {
    lastDowngradeDate,
    ratingDirection: latestDirection,
    downgradeType: latestDowngradeType,
  };
}

// ---------------------------------------------------------------------------
// CSV download + parse
// ---------------------------------------------------------------------------

async function downloadAndParseCsv(
  source: CsvSource
): Promise<ParsedInspection[]> {
  console.log(`  Downloading ${source.era} CSV from GOV.UK...`);
  const res = await fetch(source.url);
  if (!res.ok) {
    throw new Error(
      `Failed to download ${source.era} CSV: ${res.status} ${res.statusText}`
    );
  }

  let text = await res.text();
  console.log(
    `  Downloaded ${source.era}: ${(text.length / 1024 / 1024).toFixed(1)} MB`
  );

  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // For files with a title row (pre-2019), skip the first line
  if (source.hasTitleRow) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline > -1) {
      text = text.slice(firstNewline + 1);
    }
  }

  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  console.log(`  Parsed ${source.era}: ${parsed.data.length.toLocaleString()} rows`);

  const results: ParsedInspection[] = [];
  for (const row of parsed.data) {
    const mapped = mapRow(row, source.era);
    if (mapped) results.push(mapped);
  }

  console.log(
    `  Mapped ${source.era}: ${results.length.toLocaleString()} inspections with grades`
  );
  return results;
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncOfstedInspections(
  db: Db,
  _env: Env
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    schoolsUpdated: 0,
    newInspectionsInserted: 0,
    newDowngradesDetected: 0,
    totalCsvRecordsParsed: 0,
    skippedGateCheck: false,
    errors: 0,
  };

  // ── Weekly gate check ──────────────────────────────────────
  const metaCol = db.collection(SYNC_META_COLLECTION);
  const meta = await metaCol.findOne({ key: "ofsted_sync" });
  const lastSyncedAt = meta?.lastSyncedAt as Date | undefined;

  if (lastSyncedAt) {
    const elapsed = Date.now() - lastSyncedAt.getTime();
    if (elapsed < SYNC_INTERVAL_MS) {
      const daysAgo = (elapsed / (24 * 60 * 60 * 1000)).toFixed(1);
      console.log(
        `Ofsted sync skipped: last synced ${daysAgo} days ago (gate: 7 days)`
      );
      summary.skippedGateCheck = true;
      return summary;
    }
  }

  console.log("=== Ofsted Inspection Data Sync ===");

  // ── Step 1: Download and parse all CSVs ──────────────────
  const allInspections: ParsedInspection[] = [];
  const inspectionNumbers = new Set<string>();
  let duplicatesSkipped = 0;

  for (const source of CSV_SOURCES) {
    try {
      const parsed = await downloadAndParseCsv(source);
      for (const p of parsed) {
        if (inspectionNumbers.has(p.inspection.inspectionNumber)) {
          duplicatesSkipped++;
          continue;
        }
        inspectionNumbers.add(p.inspection.inspectionNumber);
        allInspections.push(p);
      }
    } catch (err) {
      summary.errors++;
      console.error(
        `Failed to download/parse ${source.era}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  summary.totalCsvRecordsParsed = allInspections.length;
  console.log(
    `Total CSV inspections: ${allInspections.length.toLocaleString()} (${duplicatesSkipped} cross-file duplicates skipped)`
  );

  if (allInspections.length === 0) {
    console.log("No inspections parsed — aborting sync");
    return summary;
  }

  // ── Step 2: Group by URN ─────────────────────────────────
  const schoolMap = new Map<
    number,
    { meta: Omit<ParsedInspection, "inspection">; latestDate: number; inspections: InspectionEntry[] }
  >();

  for (const parsed of allInspections) {
    const inspTime = parsed.inspection.inspectionDate.getTime();
    let entry = schoolMap.get(parsed.urn);
    if (!entry) {
      const { inspection: _insp, ...meta } = parsed;
      entry = { meta, latestDate: inspTime, inspections: [] };
      schoolMap.set(parsed.urn, entry);
    }
    entry.inspections.push(parsed.inspection);

    if (inspTime >= entry.latestDate) {
      const { inspection: _insp, ...meta } = parsed;
      entry.meta = meta;
      entry.latestDate = inspTime;
    }
  }

  console.log(`Schools in CSVs: ${schoolMap.size.toLocaleString()}`);

  // ── Step 3: Diff against existing data, batch by batch ───
  const schoolsCol = db.collection(SCHOOLS_COLLECTION);
  const urns = Array.from(schoolMap.keys());
  const BATCH_SIZE = 200;

  for (let i = 0; i < urns.length; i += BATCH_SIZE) {
    const batchUrns = urns.slice(i, i + BATCH_SIZE);

    // Fetch existing schools in this batch
    const existingSchools = await schoolsCol
      .find(
        { urn: { $in: batchUrns } },
        { projection: { urn: 1, inspectionHistory: 1 } }
      )
      .toArray();

    const existingMap = new Map<number, { inspectionNumbers: Set<string>; history: InspectionEntry[] }>();
    for (const school of existingSchools) {
      const history = (school.inspectionHistory ?? []) as InspectionEntry[];
      const numbers = new Set<string>(
        history.map((h) => h.inspectionNumber)
      );
      existingMap.set(school.urn as number, { inspectionNumbers: numbers, history });
    }

    const bulkOps: AnyBulkWriteOperation<Document>[] = [];

    for (const urn of batchUrns) {
      const csvEntry = schoolMap.get(urn)!;

      const existing = existingMap.get(urn);
      const existingNumbers = existing?.inspectionNumbers ?? new Set<string>();
      const existingHistory = existing?.history ?? [];

      // Find new inspections not already in the school's history
      const newInspections = csvEntry.inspections.filter(
        (insp) => !existingNumbers.has(insp.inspectionNumber)
      );

      if (newInspections.length === 0 && existing) {
        // No new data — skip this school
        continue;
      }

      // Merge: existing + new, sort newest-first, deduplicate
      const mergedHistory = [...existingHistory, ...newInspections];
      mergedHistory.sort(
        (a, b) =>
          new Date(b.inspectionDate).getTime() -
          new Date(a.inspectionDate).getTime()
      );

      // Deduplicate by inspectionNumber (keep first = newest)
      const seen = new Set<string>();
      const deduped: InspectionEntry[] = [];
      for (const entry of mergedHistory) {
        if (!seen.has(entry.inspectionNumber)) {
          seen.add(entry.inspectionNumber);
          deduped.push(entry);
        }
      }

      // Recompute downgrade detection on the full merged history
      const downgrade = detectDowngrades(deduped);

      // Track new downgrades: if latest inspection is new AND it's a downgrade
      if (
        newInspections.length > 0 &&
        deduped.length >= 2 &&
        downgrade.ratingDirection === "downgraded"
      ) {
        const latestInspNum = deduped[0].inspectionNumber;
        const isLatestNew = newInspections.some(
          (ni) => ni.inspectionNumber === latestInspNum
        );
        if (isLatestNew) {
          summary.newDowngradesDetected++;
        }
      }

      summary.newInspectionsInserted += newInspections.length;

      // Build the update — upsert so new schools from CSV are also created
      const meta = csvEntry.meta;
      const setFields: Record<string, unknown> = {
        inspectionHistory: deduped,
        lastDowngradeDate: downgrade.lastDowngradeDate,
        ratingDirection: downgrade.ratingDirection,
        downgradeType: downgrade.downgradeType,
        lastSyncedAt: new Date(),
      };

      // Update school metadata from latest CSV data (only for upserts or refreshes)
      if (meta.schoolName) setFields.name = meta.schoolName;
      if (meta.phase) setFields.phase = meta.phase;
      if (meta.schoolType) setFields.schoolType = meta.schoolType;
      if (meta.localAuthority) setFields.localAuthority = meta.localAuthority;
      if (meta.region) setFields.region = meta.region;
      if (meta.postcode) setFields.postcode = meta.postcode;
      if (meta.matUid) setFields.matUid = meta.matUid;
      if (meta.matName) setFields.matName = meta.matName;
      if (meta.idaciQuintile != null) setFields.idaciQuintile = meta.idaciQuintile;
      if (meta.totalPupils != null) setFields.totalPupils = meta.totalPupils;

      // Update top-level rating fields from the newest inspection
      const latest = deduped[0];
      if (latest) {
        if (latest.overallEffectiveness != null)
          setFields.overallEffectiveness = latest.overallEffectiveness;
        if (latest.qualityOfEducation != null)
          setFields.qualityOfEducation = latest.qualityOfEducation;
        if (latest.behaviourAndAttitudes != null)
          setFields.behaviourAndAttitudes = latest.behaviourAndAttitudes;
        if (latest.personalDevelopment != null)
          setFields.personalDevelopment = latest.personalDevelopment;
        if (latest.leadershipAndManagement != null)
          setFields.leadershipAndManagement = latest.leadershipAndManagement;
        setFields.inspectionDate = latest.inspectionDate;
        if (latest.publicationDate) setFields.publicationDate = latest.publicationDate;
        if (latest.inspectionType) setFields.inspectionType = latest.inspectionType;
        if (latest.reportUrl) setFields.reportUrl = latest.reportUrl;
        if (latest.safeguarding) setFields.safeguarding = latest.safeguarding;

        // Set previous inspection fields from second-newest
        if (deduped.length >= 2) {
          const prev = deduped[1];
          if (prev.overallEffectiveness != null) {
            setFields.previousOverallEffectiveness = prev.overallEffectiveness;
          }
          setFields.previousInspectionDate = prev.inspectionDate;
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { urn },
          update: { $set: setFields },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      try {
        const result = await schoolsCol.bulkWrite(bulkOps, { ordered: false });
        summary.schoolsUpdated +=
          result.modifiedCount + result.upsertedCount;
      } catch (err) {
        summary.errors++;
        console.error(
          `Bulk write error for batch ${i}-${i + BATCH_SIZE}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    if ((i / BATCH_SIZE) % 20 === 0 || i + BATCH_SIZE >= urns.length) {
      console.log(
        `  Sync progress: ${Math.min(i + BATCH_SIZE, urns.length).toLocaleString()} / ${urns.length.toLocaleString()} schools processed`
      );
    }
  }

  // ── Step 4: Update sync timestamp ────────────────────────
  await metaCol.updateOne(
    { key: "ofsted_sync" },
    {
      $set: {
        lastSyncedAt: new Date(),
        lastSummary: {
          schoolsUpdated: summary.schoolsUpdated,
          newInspectionsInserted: summary.newInspectionsInserted,
          newDowngradesDetected: summary.newDowngradesDetected,
          totalCsvRecordsParsed: summary.totalCsvRecordsParsed,
          errors: summary.errors,
        },
      },
    },
    { upsert: true }
  );

  console.log("=== Ofsted Sync Summary ===");
  console.log(`  Schools updated: ${summary.schoolsUpdated.toLocaleString()}`);
  console.log(
    `  New inspections inserted: ${summary.newInspectionsInserted.toLocaleString()}`
  );
  console.log(
    `  New downgrades detected: ${summary.newDowngradesDetected}`
  );
  console.log(`  Errors: ${summary.errors}`);
  console.log("=== Ofsted Sync Complete ===");

  return summary;
}
