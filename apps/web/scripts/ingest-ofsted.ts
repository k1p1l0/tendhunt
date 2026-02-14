/**
 * Ingest Ofsted school inspection data from GOV.UK monthly CSV.
 *
 * Downloads the management information CSV (~16MB, ~22,000 schools),
 * parses it, and bulk upserts into the ofstedschools collection.
 * Then fuzzy-matches schools to buyer orgs via MAT name or Local Authority.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted.ts
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted.ts --skip-download
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { dbConnect } from "../src/lib/mongodb";
import OfstedSchool from "../src/models/ofsted-school";
import Buyer from "../src/models/buyer";

const CSV_URL =
  "https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CSV_PATH = path.join(CACHE_DIR, "ofsted-management-info.csv");

const SKIP_DOWNLOAD = process.argv.includes("--skip-download");

function parseGrade(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1 || n > 4) return null;
  return n;
}

function parseDate(val: string | undefined): Date | null {
  if (!val || val.trim() === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

async function downloadCsv(): Promise<string> {
  if (SKIP_DOWNLOAD && fs.existsSync(CSV_PATH)) {
    console.log("Skipping download, using cached CSV");
    return CSV_PATH;
  }

  console.log("Fetching GOV.UK page for CSV download link...");

  // The GOV.UK page has attachment links - we need to find the CSV link
  const pageRes = await fetch(CSV_URL);
  if (!pageRes.ok) throw new Error(`Failed to fetch GOV.UK page: ${pageRes.status}`);
  const html = await pageRes.text();

  // Find CSV attachment link in the HTML
  const csvMatch = html.match(/href="(https:\/\/assets\.publishing\.service\.gov\.uk[^"]*\.csv)"/);
  if (!csvMatch) {
    // Try alternative link patterns
    const altMatch = html.match(/href="([^"]*management-information[^"]*\.csv)"/i)
      || html.match(/href="([^"]*\.csv)"/i);
    if (!altMatch) {
      throw new Error("Could not find CSV download link on GOV.UK page. The page structure may have changed.");
    }
    const csvUrl = altMatch[1].startsWith("http") ? altMatch[1] : `https://www.gov.uk${altMatch[1]}`;
    return await downloadFile(csvUrl);
  }

  return await downloadFile(csvMatch[1]);
}

async function downloadFile(url: string): Promise<string> {
  console.log(`Downloading CSV from: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download CSV: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(CSV_PATH, buffer);
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB to ${CSV_PATH}`);

  return CSV_PATH;
}

interface CsvRow {
  [key: string]: string;
}

async function parseCsvFile(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const stream = fs.createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      })
    );

    stream.on("data", (row: CsvRow) => rows.push(row));
    stream.on("end", () => resolve(rows));
    stream.on("error", reject);
  });
}

function mapCsvRow(row: CsvRow) {
  // Column names from the CSV (based on research document)
  const urn = parseNumber(row["URN"]);
  if (!urn) return null;

  const name = row["School name"]?.trim();
  if (!name) return null;

  return {
    urn,
    name,
    phase: row["Ofsted phase"]?.trim() || undefined,
    schoolType: row["Type of education"]?.trim() || undefined,
    localAuthority: row["Local authority"]?.trim() || undefined,
    region: row["Region"]?.trim() || row["Ofsted region"]?.trim() || undefined,
    postcode: row["Postcode"]?.trim() || undefined,
    matUid: row["Multi-academy trust UID"]?.trim() || undefined,
    matName: row["Multi-academy trust name"]?.trim() || undefined,
    overallEffectiveness: parseGrade(row["Overall effectiveness"]),
    qualityOfEducation: parseGrade(row["Quality of education"]),
    behaviourAndAttitudes: parseGrade(row["Behaviour and attitudes"]),
    personalDevelopment: parseGrade(row["Personal development"]),
    leadershipAndManagement: parseGrade(row["Effectiveness of leadership and management"]),
    safeguarding: row["Safeguarding is effective"]?.trim() || undefined,
    inspectionDate: parseDate(row["Inspection start date"]),
    publicationDate: parseDate(row["Publication date"]),
    inspectionType: row["Inspection type"]?.trim() || undefined,
    reportUrl: row["Web link"]?.trim() || undefined,
    previousOverallEffectiveness: parseGrade(row["Previous full inspection overall effectiveness"]),
    previousInspectionDate: parseDate(row["Previous inspection start date"]),
    idaciQuintile: parseNumber(row["IDACI quintile"]),
    totalPupils: parseNumber(row["Total number of pupils"]),
  };
}

async function matchBuyers() {
  console.log("\nMatching schools to buyer organisations...");

  const buyers = await Buyer.find({})
    .select("_id name nameLower")
    .lean();

  const buyerByNameLower = new Map<string, string>();
  for (const b of buyers) {
    if (b.nameLower) {
      buyerByNameLower.set(b.nameLower, String(b._id));
    }
  }

  console.log(`Loaded ${buyerByNameLower.size} buyers for matching`);

  // Match by MAT name first, then by Local Authority
  const schools = await OfstedSchool.find({ buyerId: null })
    .select("_id matName localAuthority")
    .lean();

  let matched = 0;
  const bulkOps = [];

  for (const school of schools) {
    let buyerId: string | undefined;

    // Try MAT name match
    if (school.matName) {
      const matLower = school.matName.toLowerCase();
      buyerId = buyerByNameLower.get(matLower);
    }

    // Try Local Authority match
    if (!buyerId && school.localAuthority) {
      const laLower = school.localAuthority.toLowerCase();
      buyerId = buyerByNameLower.get(laLower);
    }

    if (buyerId) {
      bulkOps.push({
        updateOne: {
          filter: { _id: school._id },
          update: { $set: { buyerId } },
        },
      });
      matched++;

      if (bulkOps.length >= 500) {
        await OfstedSchool.bulkWrite(bulkOps);
        bulkOps.length = 0;
      }
    }
  }

  if (bulkOps.length > 0) {
    await OfstedSchool.bulkWrite(bulkOps);
  }

  console.log(`Matched ${matched} of ${schools.length} unlinked schools to buyers`);
}

async function main() {
  await dbConnect();

  // Step 1: Download CSV
  const csvPath = await downloadCsv();

  // Step 2: Parse CSV
  console.log("\nParsing CSV...");
  const rows = await parseCsvFile(csvPath);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // Step 3: Map and filter rows
  const schools = rows
    .map(mapCsvRow)
    .filter((s): s is NonNullable<ReturnType<typeof mapCsvRow>> => s !== null);

  console.log(`Mapped ${schools.length} valid school records`);

  // Step 4: Bulk upsert by URN
  console.log("\nUpserting to MongoDB...");
  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    const bulkOps = batch.map((school) => ({
      updateOne: {
        filter: { urn: school.urn },
        update: { $set: school },
        upsert: true,
      },
    }));

    const result = await OfstedSchool.bulkWrite(bulkOps);
    upserted += result.upsertedCount + result.modifiedCount;

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, schools.length)} / ${schools.length}...`);
    }
  }

  console.log(`Upserted ${upserted} school records`);

  // Step 5: Match schools to buyers
  await matchBuyers();

  // Step 6: Print stats
  const totalCount = await OfstedSchool.countDocuments();
  const linkedCount = await OfstedSchool.countDocuments({ buyerId: { $ne: null } });
  const riCount = await OfstedSchool.countDocuments({
    $or: [
      { overallEffectiveness: { $gte: 3 } },
      { qualityOfEducation: { $gte: 3 } },
      { behaviourAndAttitudes: { $gte: 3 } },
      { personalDevelopment: { $gte: 3 } },
      { leadershipAndManagement: { $gte: 3 } },
    ],
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log("Ofsted Ingestion Summary:");
  console.log(`  Total schools: ${totalCount.toLocaleString()}`);
  console.log(`  Linked to buyers: ${linkedCount.toLocaleString()}`);
  console.log(`  Below Good (any area): ${riCount.toLocaleString()}`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
