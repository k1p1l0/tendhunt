/**
 * Ingest full historical Ofsted inspection data from GOV.UK.
 *
 * Downloads "all inspections" CSVs across three eras:
 *   - Era 1 (pre2019): 1 Sep 2015 to 31 Aug 2019 consolidated CSV
 *   - Era 2 (2019-2024): Sep 2024 year-to-date CSV (has Overall effectiveness)
 *   - Era 3 (post2024): Aug 2025 year-to-date CSV (no Overall effectiveness — post-Sep-2024 policy)
 *
 * Builds a per-school inspectionHistory[] array, deduplicates by inspectionNumber,
 * and computes downgrade detection fields (lastDowngradeDate, ratingDirection, downgradeType).
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted-history.ts
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted-history.ts --skip-download
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted-history.ts --dry-run
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { dbConnect } from "../src/lib/mongodb";
import OfstedSchool from "../src/models/ofsted-school";

import type { InspectionEntry } from "../src/models/ofsted-school";

// ---------------------------------------------------------------------------
// CSV sources — three eras of Ofsted data with different column schemas
// ---------------------------------------------------------------------------

type Era = "pre2019" | "2019-2024" | "post2024";

interface CsvSource {
  era: Era;
  url: string;
  filename: string;
  hasOverallEffectiveness: boolean;
  hasTitleRow: boolean;
}

const CSV_SOURCES: CsvSource[] = [
  {
    era: "pre2019",
    url: "https://assets.publishing.service.gov.uk/media/5f6b4b76d3bf7f72337b6ef7/Management_information_-_state-funded_schools_1_September_2015_to_31_August_2019.csv",
    filename: "ofsted-history-2015-2019.csv",
    hasOverallEffectiveness: true,
    hasTitleRow: true,
  },
  {
    era: "2019-2024",
    url: "https://assets.publishing.service.gov.uk/media/678f9d297bb65baf62c2ad69/Management_information_-_state-funded_schools_-_all_inspections_-_year_to_date_published_by_30_Sep_2024.csv",
    filename: "ofsted-history-2019-sep2024.csv",
    hasOverallEffectiveness: true,
    hasTitleRow: false,
  },
  {
    era: "post2024",
    url: "https://assets.publishing.service.gov.uk/media/68bfd548223d92d088f01dd8/Management_information_-_state-funded_schools_-_all_inspections_-_year_to_date_published_by_31_Aug_2025.csv",
    filename: "ofsted-history-post-sep2024.csv",
    hasOverallEffectiveness: false,
    hasTitleRow: false,
  },
];

const CACHE_DIR = path.join(process.cwd(), ".cache");
const SKIP_DOWNLOAD = process.argv.includes("--skip-download");
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGrade(val: string | undefined): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "NULL" || trimmed === "N/A") return null;
  const n = parseInt(trimmed, 10);
  // 9 = "not applicable" marker used by Ofsted; only 1-4 are real grades
  if (isNaN(n) || n < 1 || n > 4) return null;
  return n;
}

function parseDateVal(val: string | undefined): Date | null {
  if (!val || val.trim() === "" || val.trim() === "NULL") return null;
  const trimmed = val.trim();

  // Try DD/MM/YYYY format (Ofsted standard)
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(
      parseInt(ddmmyyyy[3]),
      parseInt(ddmmyyyy[2]) - 1,
      parseInt(ddmmyyyy[1])
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: ISO / other formats
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: string | undefined): number | null {
  if (!val || val.trim() === "" || val.trim() === "NULL") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

async function downloadCsv(source: CsvSource): Promise<string> {
  const filePath = path.join(CACHE_DIR, source.filename);

  if (SKIP_DOWNLOAD && fs.existsSync(filePath)) {
    console.log(`  Skipping download, using cached: ${source.filename}`);
    return filePath;
  }

  console.log(`  Downloading ${source.era} CSV...`);
  const res = await fetch(source.url);
  if (!res.ok)
    throw new Error(
      `Failed to download ${source.era} CSV: ${res.status} ${res.statusText}`
    );

  const buffer = Buffer.from(await res.arrayBuffer());

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
  console.log(
    `  Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB → ${source.filename}`
  );

  return filePath;
}

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

interface CsvRow {
  [key: string]: string;
}

async function parseCsvFile(
  filePath: string,
  hasTitleRow: boolean
): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const stream = fs.createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
        from_line: hasTitleRow ? 2 : 1,
      })
    );

    stream.on("data", (row: CsvRow) => {
      rows.push(row);
    });
    stream.on("end", () => resolve(rows));
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Column mapping per era
// ---------------------------------------------------------------------------

/**
 * Map a raw CSV row to a normalized inspection entry + school metadata.
 * Column names differ across eras:
 *
 * Pre-2019 columns (2015-2019 consolidated):
 *   - Has "Academic year" column
 *   - "Effectiveness of leadership and management"
 *   - "Quality of teaching, learning and assessment" (maps to qualityOfEducation)
 *   - "Personal development, behaviour and welfare" (maps to personalDevelopment + behaviourAndAttitudes combined)
 *   - "Outcomes for pupils" (no direct mapping — stored in leadershipAndManagement fallback? No, skip)
 *   - "Is safeguarding effective?" (slightly different name)
 *   - "16 to 19 study programmes" instead of "Sixth form provision"
 *   - Has "Inspection end date"
 *   - "Did the latest S8 inspection convert to a full inspection?"
 *   - "Outcomes for S8 inspections that did not convert"
 *
 * 2019-2024 columns:
 *   - "Quality of education"
 *   - "Behaviour and attitudes"
 *   - "Personal development"
 *   - "Effectiveness of leadership and management"
 *   - "Safeguarding is effective?" or "Safeguarding is effective"
 *   - "Overall effectiveness" present
 *   - Has "Inspection end date"
 *   - "Did the latest section 8 inspection of a good or non-exempt outstanding school convert to a full inspection?"
 *
 * Post-2024 columns:
 *   - Same as 2019-2024 but NO "Overall effectiveness"
 *   - "Did the latest ungraded inspection convert to a graded inspection?"
 *   - "Web link (opens in new window)" instead of "Web link"
 */

interface ParsedInspection {
  urn: number;
  schoolName: string;
  phase: string | undefined;
  schoolType: string | undefined;
  localAuthority: string | undefined;
  region: string | undefined;
  postcode: string | undefined;
  matUid: string | undefined;
  matName: string | undefined;
  idaciQuintile: number | null;
  totalPupils: number | null;
  inspection: InspectionEntry;
}

function getCol(
  row: CsvRow,
  ...candidates: string[]
): string | undefined {
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

  const inspectionDate = parseDateVal(
    getCol(row, "Inspection start date")
  );
  if (!inspectionDate) return null;

  // Map sub-judgements based on era
  let qualityOfEducation: number | null;
  let behaviourAndAttitudes: number | null;
  let personalDevelopment: number | null;
  let leadershipAndManagement: number | null;
  let safeguarding: string | undefined;
  let earlyYears: number | null;
  let sixthForm: number | null;

  if (era === "pre2019") {
    // Pre-2019 used different framework names
    qualityOfEducation = parseGrade(
      getCol(row, "Quality of teaching, learning and assessment")
    );
    // "Personal development, behaviour and welfare" combined both areas
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
    // 2019-2024 and post2024 use the same sub-judgement names
    qualityOfEducation = parseGrade(
      getCol(row, "Quality of education")
    );
    behaviourAndAttitudes = parseGrade(
      getCol(row, "Behaviour and attitudes")
    );
    personalDevelopment = parseGrade(
      getCol(row, "Personal development")
    );
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

  // Skip monitoring visits and S8 inspections that didn't produce grades
  if (!hasAnyGrade) return null;

  const inspection: InspectionEntry = {
    inspectionNumber,
    inspectionDate,
    publicationDate: parseDateVal(getCol(row, "Publication date")) ?? undefined,
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
  } as InspectionEntry;

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
    matUid:
      getCol(row, "Multi-academy trust UID")?.trim() || undefined,
    matName:
      getCol(row, "Multi-academy trust name")?.trim() || undefined,
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
// Downgrade detection
// ---------------------------------------------------------------------------

interface DowngradeResult {
  lastDowngradeDate: Date | null;
  ratingDirection: "improved" | "downgraded" | "unchanged" | null;
  downgradeType: string | null;
}

/**
 * Compare consecutive inspections to detect downgrades.
 *
 * For pre-Sep-2024 inspections: compare overallEffectiveness first, fall back to sub-judgements.
 * For post-Sep-2024 inspections: no overall grade — compare sub-judgement grades.
 *
 * A "downgrade" means ANY sub-judgement grade got worse (higher number = worse in Ofsted 1-4 scale).
 */
function detectDowngrades(
  history: InspectionEntry[]
): DowngradeResult {
  if (history.length < 2) {
    return {
      lastDowngradeDate: null,
      ratingDirection: null,
      downgradeType: null,
    };
  }

  // history is sorted newest-first
  let lastDowngradeDate: Date | null = null;
  let latestDirection: "improved" | "downgraded" | "unchanged" | null = null;
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

interface ComparisonResult {
  direction: "improved" | "downgraded" | "unchanged";
  downgradeType: string | null;
}

function compareInspections(
  current: InspectionEntry,
  previous: InspectionEntry
): ComparisonResult {
  // If both have overall effectiveness, use that as primary indicator
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

  // Compare sub-judgements (works for post-Sep-2024 where overall is missing)
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
    return {
      direction: "downgraded",
      downgradeType: downgradedAreas.join(","),
    };
  }
  if (anyImprove) {
    return { direction: "improved", downgradeType: null };
  }
  return { direction: "unchanged", downgradeType: null };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Ofsted Historical Inspection Data Ingestion ===\n");

  if (DRY_RUN) {
    console.log("DRY RUN — will parse and analyze but not write to MongoDB\n");
  }

  if (!DRY_RUN) {
    await dbConnect();
  }

  // Step 1: Download all CSV files
  console.log("Step 1: Download CSV files...");
  const csvFiles: Array<{ source: CsvSource; filePath: string }> = [];
  for (const source of CSV_SOURCES) {
    const filePath = await downloadCsv(source);
    csvFiles.push({ source, filePath });
  }

  // Step 2: Parse all CSVs and normalize inspections
  console.log("\nStep 2: Parse CSVs and map inspection records...");
  const allInspections: ParsedInspection[] = [];
  const inspectionNumbers = new Set<string>();
  let duplicatesSkipped = 0;

  for (const { source, filePath } of csvFiles) {
    console.log(`\n  Parsing ${source.era} (${source.filename})...`);
    const rows = await parseCsvFile(filePath, source.hasTitleRow);
    console.log(`  Raw rows: ${rows.length.toLocaleString()}`);

    let mapped = 0;
    let skipped = 0;

    for (const row of rows) {
      const parsed = mapRow(row, source.era);
      if (!parsed) {
        skipped++;
        continue;
      }

      // Deduplicate by inspection number across all CSVs
      if (inspectionNumbers.has(parsed.inspection.inspectionNumber)) {
        duplicatesSkipped++;
        continue;
      }

      inspectionNumbers.add(parsed.inspection.inspectionNumber);
      allInspections.push(parsed);
      mapped++;
    }

    console.log(
      `  Mapped: ${mapped.toLocaleString()}, Skipped (no grades/invalid): ${skipped.toLocaleString()}`
    );
  }

  console.log(
    `\nTotal inspection records: ${allInspections.length.toLocaleString()}`
  );
  console.log(
    `Duplicates skipped: ${duplicatesSkipped.toLocaleString()}`
  );

  // Step 3: Group inspections by URN (school)
  console.log("\nStep 3: Group inspections by school (URN)...");
  const schoolMap = new Map<
    number,
    {
      meta: Omit<ParsedInspection, "inspection">;
      latestDate: number;
      inspections: InspectionEntry[];
    }
  >();

  for (const parsed of allInspections) {
    const inspTime = new Date(parsed.inspection.inspectionDate).getTime();
    let entry = schoolMap.get(parsed.urn);
    if (!entry) {
      const { inspection, ...meta } = parsed;
      entry = { meta, latestDate: inspTime, inspections: [] };
      schoolMap.set(parsed.urn, entry);
    }
    entry.inspections.push(parsed.inspection);

    // Update school metadata from the most recent inspection
    if (inspTime >= entry.latestDate) {
      const { inspection, ...meta } = parsed;
      entry.meta = meta;
      entry.latestDate = inspTime;
    }
  }

  console.log(
    `Schools with inspection history: ${schoolMap.size.toLocaleString()}`
  );

  // Step 4: Sort inspections and compute downgrade detection per school
  console.log("\nStep 4: Sort inspections and compute downgrade detection...");
  let schoolsWithDowngrade = 0;
  let schoolsImproved = 0;
  let schoolsUnchanged = 0;
  let schoolsSingleInspection = 0;

  const bulkUpdates: Array<{
    urn: number;
    inspectionHistory: InspectionEntry[];
    lastDowngradeDate: Date | null;
    ratingDirection: string | null;
    downgradeType: string | null;
  }> = [];

  for (const [urn, entry] of schoolMap) {
    // Sort newest first
    entry.inspections.sort(
      (a, b) =>
        new Date(b.inspectionDate).getTime() -
        new Date(a.inspectionDate).getTime()
    );

    const downgrade = detectDowngrades(entry.inspections);

    if (entry.inspections.length < 2) {
      schoolsSingleInspection++;
    } else if (downgrade.ratingDirection === "downgraded") {
      schoolsWithDowngrade++;
    } else if (downgrade.ratingDirection === "improved") {
      schoolsImproved++;
    } else {
      schoolsUnchanged++;
    }

    bulkUpdates.push({
      urn,
      inspectionHistory: entry.inspections,
      lastDowngradeDate: downgrade.lastDowngradeDate,
      ratingDirection: downgrade.ratingDirection,
      downgradeType: downgrade.downgradeType,
    });
  }

  console.log(`  Downgraded (latest): ${schoolsWithDowngrade.toLocaleString()}`);
  console.log(`  Improved (latest): ${schoolsImproved.toLocaleString()}`);
  console.log(`  Unchanged (latest): ${schoolsUnchanged.toLocaleString()}`);
  console.log(
    `  Single inspection only: ${schoolsSingleInspection.toLocaleString()}`
  );

  if (DRY_RUN) {
    // Print sample data
    console.log("\n--- Dry Run Sample ---");
    let sampleCount = 0;
    for (const update of bulkUpdates) {
      if (update.ratingDirection === "downgraded" && sampleCount < 3) {
        const school = schoolMap.get(update.urn);
        console.log(
          `\nSchool: ${school?.meta.schoolName} (URN ${update.urn})`
        );
        console.log(`  Inspections: ${update.inspectionHistory.length}`);
        console.log(
          `  Last downgrade: ${update.lastDowngradeDate?.toISOString().slice(0, 10)}`
        );
        console.log(`  Downgrade type: ${update.downgradeType}`);
        for (const insp of update.inspectionHistory.slice(0, 3)) {
          console.log(
            `    ${new Date(insp.inspectionDate).toISOString().slice(0, 10)} — OE:${insp.overallEffectiveness ?? "N/A"} QoE:${insp.qualityOfEducation ?? "N/A"} B&A:${insp.behaviourAndAttitudes ?? "N/A"} PD:${insp.personalDevelopment ?? "N/A"} L&M:${insp.leadershipAndManagement ?? "N/A"} [${insp.era}]`
          );
        }
        sampleCount++;
      }
    }
    console.log("\nDry run complete. No data was written to MongoDB.");
    process.exit(0);
  }

  // Step 5: Bulk write to MongoDB
  console.log("\nStep 5: Writing inspection history to MongoDB...");
  const BATCH_SIZE = 500;
  let processed = 0;
  let upsertedTotal = 0;

  for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
    const batch = bulkUpdates.slice(i, i + BATCH_SIZE);
    const bulkOps = batch.map((update) => ({
      updateOne: {
        filter: { urn: update.urn },
        update: {
          $set: {
            inspectionHistory: update.inspectionHistory,
            lastDowngradeDate: update.lastDowngradeDate,
            ratingDirection: update.ratingDirection,
            downgradeType: update.downgradeType,
          },
        },
      },
    }));

    const result = await OfstedSchool.bulkWrite(bulkOps);
    upsertedTotal += result.modifiedCount + result.upsertedCount;
    processed += batch.length;

    if ((i / BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= bulkUpdates.length) {
      console.log(
        `  Processed ${Math.min(processed, bulkUpdates.length).toLocaleString()} / ${bulkUpdates.length.toLocaleString()}...`
      );
    }
  }

  console.log(`Updated ${upsertedTotal.toLocaleString()} school records`);

  // Step 6: Print summary stats
  const totalSchools = await OfstedSchool.countDocuments();
  const withHistory = await OfstedSchool.countDocuments({
    "inspectionHistory.0": { $exists: true },
  });
  const withDowngrade = await OfstedSchool.countDocuments({
    lastDowngradeDate: { $ne: null },
  });

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentDowngrades = await OfstedSchool.countDocuments({
    lastDowngradeDate: { $gte: threeMonthsAgo },
  });

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthDowngrades = await OfstedSchool.countDocuments({
    lastDowngradeDate: { $gte: sixMonthsAgo },
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log("Ofsted History Ingestion Summary:");
  console.log(`  Total schools in DB: ${totalSchools.toLocaleString()}`);
  console.log(
    `  Schools with inspection history: ${withHistory.toLocaleString()}`
  );
  console.log(
    `  Schools with any downgrade (ever): ${withDowngrade.toLocaleString()}`
  );
  console.log(
    `  Downgrades in last 3 months: ${recentDowngrades.toLocaleString()}`
  );
  console.log(
    `  Downgrades in last 6 months: ${sixMonthDowngrades.toLocaleString()}`
  );
  console.log(`${"=".repeat(60)}\n`);

  // Step 7: Verify index performance
  console.log("Verifying index on lastDowngradeDate...");
  const explain = await OfstedSchool.find({
    lastDowngradeDate: { $gte: threeMonthsAgo },
  })
    .explain("executionStats");

  const execStats = (explain as Record<string, unknown>)?.executionStats as
    | Record<string, unknown>
    | undefined;
  if (execStats) {
    console.log(
      `  Query execution time: ${execStats.executionTimeMillis}ms`
    );
    console.log(`  Documents examined: ${execStats.totalDocsExamined}`);
    console.log(`  Keys examined: ${execStats.totalKeysExamined}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
