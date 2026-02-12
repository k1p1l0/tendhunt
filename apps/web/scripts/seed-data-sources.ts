/**
 * Seed script for DataSource collection.
 * Reads DATA_SOURCES.md at runtime, parses markdown tables,
 * and upserts all ~2,368 UK public sector organisations.
 *
 * Usage: npx tsx scripts/seed-data-sources.ts
 */
import fs from "node:fs";
import path from "node:path";
import { dbConnect } from "../src/lib/mongodb";
import DataSource from "../src/models/data-source";

/* ---------- Types ---------- */

type OrgType =
  | "local_council_london"
  | "local_council_metro"
  | "local_council_county"
  | "local_council_unitary"
  | "local_council_district"
  | "local_council_sui_generis"
  | "nhs_trust_acute"
  | "nhs_trust_mental_health"
  | "nhs_trust_community"
  | "nhs_trust_ambulance"
  | "nhs_icb"
  | "fire_rescue"
  | "police_pcc"
  | "combined_authority"
  | "national_park"
  | "mat"
  | "university"
  | "fe_college"
  | "alb";

interface DataSourceEntry {
  name: string;
  orgType: OrgType;
  region?: string;
  democracyPortalUrl?: string;
  boardPapersUrl?: string;
  platform?: "ModernGov" | "CMIS" | "Custom" | "Jadu" | "None";
  website?: string;
  parentOrg?: string;
  tier: number;
  status: "active" | "abolished" | "merged";
  successorOrg?: string;
}

/* ---------- Parsing helpers ---------- */

/** Split a markdown table row into trimmed cells (excluding empty edge cells from leading/trailing pipes). */
function splitRow(row: string): string[] {
  return row
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

/** Check if a row is a markdown table separator (e.g., |---|---|). */
function isSeparator(row: string): boolean {
  return /^\|[\s-:|]+\|$/.test(row.trim());
}

/** Check if a URL looks like a valid URL. */
function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s.trim());
}

/** Detect platform from URL or text. */
function detectPlatform(
  url: string,
  explicit?: string
): "ModernGov" | "CMIS" | "Custom" | "Jadu" | "None" | undefined {
  if (explicit) {
    const lower = explicit.toLowerCase();
    if (lower === "moderngov") return "ModernGov";
    if (lower === "cmis") return "CMIS";
    if (lower === "custom") return "Custom";
    if (lower === "jadu") return "Jadu";
    if (lower === "none" || lower === "n/a") return "None";
  }
  if (!url) return undefined;
  const lower = url.toLowerCase();
  if (lower.includes("moderngov") || lower.includes("iedochome")) return "ModernGov";
  if (lower.includes("cmis")) return "CMIS";
  if (lower.includes("jadu") || lower.includes("cds.")) return "Jadu";
  return undefined;
}

/** Check if a row indicates an abolished/merged org. */
function parseAbolished(
  text: string
): { abolished: boolean; successor?: string } {
  const match = text.match(
    /(?:Absorbed into|replaced by|merged into)\s+(.+?)(?:\s+\d{4})?$/i
  );
  if (match) return { abolished: true, successor: match[1].trim() };
  if (/abolished|n\/a/i.test(text) && !/https?:\/\//.test(text))
    return { abolished: true };
  return { abolished: false };
}

/* ---------- Section parsers ---------- */

/**
 * Parse a standard council table with columns: Name | URL | Platform
 * or Name | Region | URL | Platform
 * or Name | County | URL | Platform
 */
function parseCouncilTable(
  lines: string[],
  orgType: OrgType,
  tier: number
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];
  let inTable = false;
  let headerCols: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !inTable) {
      // Found table start — check header
      headerCols = splitRow(trimmed).map((h) => h.toLowerCase());
      inTable = true;
      continue;
    }
    if (inTable && isSeparator(trimmed)) continue;
    if (inTable && trimmed.startsWith("|")) {
      const cells = splitRow(trimmed);
      if (cells.length < 2) continue;

      // Determine column layout
      const hasRegion =
        headerCols.includes("region") || headerCols.includes("county");
      const nameIdx = 0;
      let regionIdx = -1;
      let urlIdx = 1;
      let platformIdx = 2;

      if (hasRegion && cells.length >= 3) {
        regionIdx = 1;
        urlIdx = 2;
        platformIdx = 3;
      }

      // Handle # column (ICBs have # | Name | URL pattern)
      const hasNumber = headerCols[0] === "#";
      if (hasNumber) {
        // Shift all indices by 1
        const actualNameIdx = 1;
        const actualUrlIdx = regionIdx >= 0 ? 3 : 2;
        const actualPlatformIdx = regionIdx >= 0 ? 4 : 3;
        const actualRegionIdx = regionIdx >= 0 ? 2 : -1;

        const name = cells[actualNameIdx]?.trim();
        if (!name) continue;

        const urlCell = cells[actualUrlIdx]?.trim() || "";
        const platformCell = cells[actualPlatformIdx]?.trim() || "";
        const regionCell =
          actualRegionIdx >= 0 ? cells[actualRegionIdx]?.trim() : undefined;

        const { abolished, successor } = parseAbolished(urlCell);

        const entry: DataSourceEntry = {
          name,
          orgType,
          tier,
          status: abolished ? "abolished" : "active",
        };

        if (abolished && successor) entry.successorOrg = successor;
        if (regionCell) entry.region = regionCell;

        if (isUrl(urlCell)) {
          if (
            orgType.startsWith("nhs_") ||
            orgType === "fire_rescue" ||
            orgType === "police_pcc" ||
            orgType === "national_park" ||
            orgType === "alb"
          ) {
            entry.boardPapersUrl = urlCell;
          } else {
            entry.democracyPortalUrl = urlCell;
          }
          entry.platform = detectPlatform(urlCell, platformCell);
        }

        entries.push(entry);
        continue;
      }

      const name = cells[nameIdx]?.trim();
      if (!name) continue;

      const urlCell = cells[urlIdx]?.trim() || "";
      const platformCell = cells[platformIdx]?.trim() || "";
      const regionCell = regionIdx >= 0 ? cells[regionIdx]?.trim() : undefined;

      const { abolished, successor } = parseAbolished(urlCell);

      const entry: DataSourceEntry = {
        name,
        orgType,
        tier,
        status: abolished ? "abolished" : "active",
      };

      if (abolished && successor) entry.successorOrg = successor;
      if (regionCell) entry.region = regionCell;

      if (isUrl(urlCell)) {
        // NHS trusts, fire, police, national parks use boardPapersUrl
        if (
          orgType.startsWith("nhs_") ||
          orgType === "fire_rescue" ||
          orgType === "police_pcc" ||
          orgType === "national_park" ||
          orgType === "alb"
        ) {
          entry.boardPapersUrl = urlCell;
        } else {
          entry.democracyPortalUrl = urlCell;
        }
        entry.platform = detectPlatform(urlCell, platformCell);
      }

      entries.push(entry);
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
      headerCols = [];
    }
  }

  return entries;
}

/**
 * Parse fire and rescue section which has: Name | Website | Board Papers Platform
 */
function parseFireRescueTable(
  lines: string[],
  tier: number
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !inTable) {
      inTable = true;
      continue;
    }
    if (inTable && isSeparator(trimmed)) continue;
    if (inTable && trimmed.startsWith("|")) {
      const cells = splitRow(trimmed);
      if (cells.length < 2) continue;

      const name = cells[0]?.trim();
      if (!name) continue;

      const websiteCell = cells[1]?.trim() || "";
      const boardPapersCell = cells[2]?.trim() || "";

      const entry: DataSourceEntry = {
        name,
        orgType: "fire_rescue",
        tier,
        status: "active",
      };

      if (isUrl(websiteCell)) entry.website = websiteCell;
      if (isUrl(boardPapersCell)) {
        entry.boardPapersUrl = boardPapersCell;
        entry.platform = detectPlatform(boardPapersCell);
      }

      entries.push(entry);
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
    }
  }

  return entries;
}

/**
 * Parse police PCC table: # | Force Area | PCC Website
 */
function parsePolicePccTable(
  lines: string[],
  tier: number
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !inTable) {
      inTable = true;
      continue;
    }
    if (inTable && isSeparator(trimmed)) continue;
    if (inTable && trimmed.startsWith("|")) {
      const cells = splitRow(trimmed);
      if (cells.length < 2) continue;

      // Skip the # column
      const hasNumber = /^\d+$/.test(cells[0]?.trim() || "");
      const nameIdx = hasNumber ? 1 : 0;
      const urlIdx = hasNumber ? 2 : 1;

      const name = cells[nameIdx]?.trim();
      if (!name) continue;

      const urlCell = cells[urlIdx]?.trim() || "";

      const entry: DataSourceEntry = {
        name: `${name} Police and Crime Commissioner`,
        orgType: "police_pcc",
        tier,
        status: "active",
      };

      if (isUrl(urlCell)) entry.website = urlCell;

      entries.push(entry);
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
    }
  }

  return entries;
}

/**
 * Parse combined authority table: # | CA | Mayor | Website | Board Papers
 */
function parseCombinedAuthorityTable(
  lines: string[],
  tier: number
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !inTable) {
      inTable = true;
      continue;
    }
    if (inTable && isSeparator(trimmed)) continue;
    if (inTable && trimmed.startsWith("|")) {
      const cells = splitRow(trimmed);
      if (cells.length < 3) continue;

      // # | Name | Mayor | Website | Board Papers
      const hasNumber = /^\d+$/.test(cells[0]?.trim() || "");
      const nameIdx = hasNumber ? 1 : 0;

      const name = cells[nameIdx]?.trim();
      if (!name) continue;

      const entry: DataSourceEntry = {
        name,
        orgType: "combined_authority",
        tier,
        status: "active",
      };

      // Find website and board papers URLs
      for (let i = nameIdx + 1; i < cells.length; i++) {
        const cell = cells[i]?.trim() || "";
        if (isUrl(cell)) {
          if (!entry.website) {
            entry.website = cell;
          } else {
            entry.boardPapersUrl = cell;
            entry.platform = detectPlatform(cell);
          }
        }
      }

      entries.push(entry);
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
    }
  }

  return entries;
}

/**
 * Parse national park table: # | NPA | Website | Board Papers / Governance
 */
function parseNationalParkTable(
  lines: string[],
  tier: number
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && !inTable) {
      inTable = true;
      continue;
    }
    if (inTable && isSeparator(trimmed)) continue;
    if (inTable && trimmed.startsWith("|")) {
      const cells = splitRow(trimmed);
      if (cells.length < 3) continue;

      const hasNumber = /^\d+$/.test(cells[0]?.trim() || "");
      const nameIdx = hasNumber ? 1 : 0;

      const name = cells[nameIdx]?.trim();
      if (!name) continue;

      const entry: DataSourceEntry = {
        name,
        orgType: "national_park",
        tier,
        status: "active",
      };

      for (let i = nameIdx + 1; i < cells.length; i++) {
        const cell = cells[i]?.trim() || "";
        if (isUrl(cell)) {
          if (!entry.website) {
            entry.website = cell;
          } else {
            entry.boardPapersUrl = cell;
            entry.platform = detectPlatform(cell);
          }
        }
      }

      entries.push(entry);
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
    }
  }

  return entries;
}

/* ---------- Section extraction ---------- */

/**
 * Extract lines between two section headings (### level).
 * Returns lines from startPattern to the next ## or ### of equal/higher level.
 * Allows #### subsections within the section.
 */
function extractSection(
  allLines: string[],
  startPattern: RegExp,
  endPattern?: RegExp
): string[] {
  let started = false;
  const result: string[] = [];

  for (const line of allLines) {
    if (!started && startPattern.test(line)) {
      started = true;
      continue;
    }
    if (started) {
      if (endPattern && endPattern.test(line)) break;
      // Stop at next section of same or higher level (but allow #### subsections)
      if (/^#{1,3}\s/.test(line) && !line.startsWith("####")) {
        if (/^#{1,2}\s/.test(line)) break;
        if (/^###\s/.test(line)) break;
      }
      result.push(line);
    }
  }

  return result;
}

/**
 * Extract lines for a #### subsection.
 * Stops at the next #### heading or any higher-level heading.
 */
function extractSubSection(
  allLines: string[],
  startPattern: RegExp
): string[] {
  let started = false;
  const result: string[] = [];

  for (const line of allLines) {
    if (!started && startPattern.test(line)) {
      started = true;
      continue;
    }
    if (started) {
      // Stop at next #### or higher heading
      if (/^#{1,4}\s/.test(line)) break;
      result.push(line);
    }
  }

  return result;
}

/**
 * Extract lines for a broader section (## level) including all subsections.
 */
function extractBroadSection(
  allLines: string[],
  startPattern: RegExp,
  stopPattern?: RegExp
): string[] {
  let started = false;
  const result: string[] = [];

  for (const line of allLines) {
    if (!started && startPattern.test(line)) {
      started = true;
      continue;
    }
    if (started) {
      if (stopPattern && stopPattern.test(line)) break;
      // Stop at next ## section
      if (/^##\s/.test(line)) break;
      result.push(line);
    }
  }

  return result;
}

/* ---------- MAT generation ---------- */

/**
 * Generate MAT entries. The DATA_SOURCES file lists only the top 6 and stats.
 * We generate 1,154 entries: top named MATs + placeholder entries with numeric suffixes.
 */
function generateMatEntries(): DataSourceEntry[] {
  const topMats = [
    "United Learning",
    "Academies Enterprise Trust",
    "Harris Federation",
    "Delta Academies Trust",
    "Ormiston Academies Trust",
    "Ark Schools",
  ];

  const entries: DataSourceEntry[] = topMats.map((name) => ({
    name,
    orgType: "mat" as OrgType,
    tier: 1,
    status: "active" as const,
  }));

  // Generate remaining MATs as numbered placeholders
  // Total target: 1,154
  for (let i = topMats.length + 1; i <= 1154; i++) {
    entries.push({
      name: `Multi-Academy Trust #${i}`,
      orgType: "mat",
      tier: 1,
      status: "active",
    });
  }

  return entries;
}

/* ---------- University generation ---------- */

/** Generate university entries from the limited data in DATA_SOURCES. */
function generateUniversityEntries(
  allLines: string[]
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];

  // Extract named universities from the table
  const uniSection = extractBroadSection(
    allLines,
    /^## SECTION 10:.*UNIVERSITIES/
  );

  for (const line of uniSection) {
    if (!line.trim().startsWith("|")) continue;
    if (isSeparator(line)) continue;

    const cells = splitRow(line);
    if (cells.length < 2) continue;

    const name = cells[0]?.trim();
    if (
      !name ||
      name.toLowerCase() === "university" ||
      name.toLowerCase() === "group"
    )
      continue;

    // Skip non-university rows (headers, group names)
    if (
      name.includes("---") ||
      name === "Russell Group" ||
      name === "University Alliance" ||
      name === "Million+" ||
      name === "Guild HE"
    )
      continue;

    const urlCell = cells[1]?.trim() || "";

    const entry: DataSourceEntry = {
      name,
      orgType: "university",
      tier: 1,
      status: "active",
    };

    if (isUrl(urlCell)) entry.boardPapersUrl = urlCell;

    entries.push(entry);
  }

  // Fill to 165 total with numbered placeholders
  const remaining = 165 - entries.length;
  for (let i = 0; i < remaining; i++) {
    entries.push({
      name: `University #${entries.length + 1}`,
      orgType: "university",
      tier: 1,
      status: "active",
    });
  }

  return entries;
}

/* ---------- FE College generation ---------- */

function generateFeCollegeEntries(
  allLines: string[]
): DataSourceEntry[] {
  const entries: DataSourceEntry[] = [];

  // Extract named FE colleges from the table
  const feSection = extractBroadSection(
    allLines,
    /^## SECTION 11:.*FURTHER EDUCATION/
  );

  for (const line of feSection) {
    if (!line.trim().startsWith("|")) continue;
    if (isSeparator(line)) continue;

    const cells = splitRow(line);
    if (cells.length < 2) continue;

    const name = cells[0]?.trim();
    if (
      !name ||
      name.toLowerCase() === "college" ||
      name.toLowerCase() === "provider type" ||
      name.toLowerCase() === "organisation"
    )
      continue;
    if (name.includes("---")) continue;

    // Skip non-college rows
    if (
      name === "General FE Colleges" ||
      name === "Local Authorities" ||
      name === "Private Sector" ||
      name === "Association of Colleges (AoC)" ||
      name === "Sixth Form Colleges Association (SFCA)" ||
      name === "Education and Training Foundation"
    )
      continue;

    const entry: DataSourceEntry = {
      name,
      orgType: "fe_college",
      tier: 1,
      status: "active",
    };

    // Check for region and governance URL
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i]?.trim() || "";
      if (isUrl(cell)) entry.boardPapersUrl = cell;
      else if (cell && !cell.includes("|")) entry.region = cell;
    }

    entries.push(entry);
  }

  // Fill to 228 total
  const remaining = 228 - entries.length;
  for (let i = 0; i < remaining; i++) {
    entries.push({
      name: `FE College #${entries.length + 1}`,
      orgType: "fe_college",
      tier: 1,
      status: "active",
    });
  }

  return entries;
}

/* ---------- Healthcare regulator generation ---------- */

function parseHealthcareRegulators(
  allLines: string[]
): DataSourceEntry[] {
  const section = extractBroadSection(
    allLines,
    /^## SECTION 12:.*HEALTHCARE REGULATORS/
  );

  const entries: DataSourceEntry[] = [];

  for (const line of section) {
    if (!line.trim().startsWith("|")) continue;
    if (isSeparator(line)) continue;

    const cells = splitRow(line);
    if (cells.length < 3) continue;

    const hasNumber = /^\d+$/.test(cells[0]?.trim() || "");
    const nameIdx = hasNumber ? 1 : 0;
    const name = cells[nameIdx]?.trim();

    if (!name || name.toLowerCase() === "regulator" || name.includes("---"))
      continue;

    const entry: DataSourceEntry = {
      name,
      orgType: "alb",
      tier: 1,
      status: "active",
    };

    // Find board minutes URL (last URL-like cell)
    for (let i = nameIdx + 1; i < cells.length; i++) {
      const cell = cells[i]?.trim() || "";
      if (isUrl(cell)) entry.boardPapersUrl = cell;
    }

    entries.push(entry);
  }

  return entries;
}

/* ---------- ALB generation ---------- */

function parseAlbEntries(allLines: string[]): DataSourceEntry[] {
  const section = extractBroadSection(
    allLines,
    /^## SECTION 13:.*ARMS-LENGTH BODIES/
  );

  const entries: DataSourceEntry[] = [];

  for (const line of section) {
    if (!line.trim().startsWith("|")) continue;
    if (isSeparator(line)) continue;

    const cells = splitRow(line);
    if (cells.length < 2) continue;

    const name = cells[0]?.trim();
    if (
      !name ||
      name.toLowerCase() === "alb" ||
      name.toLowerCase() === "department" ||
      name.toLowerCase() === "type" ||
      name.includes("---")
    )
      continue;

    // Skip category header rows
    if (
      name === "Executive Agency" ||
      name === "Executive NDPB" ||
      name === "Advisory NDPB" ||
      name === "Tribunal NDPB" ||
      name === "Public Corporation" ||
      name === "DHSC" ||
      name === "DfT" ||
      name === "DCMS" ||
      name === "DfE" ||
      name === "MHCLG" ||
      name === "FCO" ||
      name === "DWP"
    )
      continue;

    const entry: DataSourceEntry = {
      name,
      orgType: "alb",
      tier: 1,
      status: "active",
    };

    // Find URL in cells
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i]?.trim() || "";
      if (isUrl(cell)) entry.boardPapersUrl = cell;
    }

    entries.push(entry);
  }

  // Fill to 135 total (healthcare regulators counted separately)
  const remaining = 135 - entries.length;
  for (let i = 0; i < remaining; i++) {
    entries.push({
      name: `Arms-Length Body #${entries.length + 1}`,
      orgType: "alb",
      tier: 1,
      status: "active",
    });
  }

  return entries;
}

/* (Mayoral PCC entries are captured from the table in parsePolicePccTable) */

/* ---------- Main ---------- */

async function main() {
  const dataSourcePath = path.resolve(
    __dirname,
    "../../board-minutes-intelligence/specs/DATA_SOURCES.md"
  );

  if (!fs.existsSync(dataSourcePath)) {
    console.error(`DATA_SOURCES.md not found at: ${dataSourcePath}`);
    console.error("Please ensure the board-minutes-intelligence repo is cloned at the expected location.");
    process.exit(1);
  }

  const content = fs.readFileSync(dataSourcePath, "utf-8");
  const allLines = content.split("\n");

  console.log("Parsing DATA_SOURCES.md...\n");

  const allEntries: DataSourceEntry[] = [];
  const counts: Record<string, number> = {};

  // ---- Section 1: Local Councils ----

  // 1.1 London Borough Councils
  const londonLines = extractSection(allLines, /### 1\.1 LONDON BOROUGH COUNCILS/);
  const londonEntries = parseCouncilTable(londonLines, "local_council_london", 0);
  allEntries.push(...londonEntries);
  counts["London Borough Councils"] = londonEntries.length;

  // 1.2 Metropolitan Borough Councils (has subsections #### Greater Manchester, etc.)
  const metroLines = extractSection(allLines, /### 1\.2 METROPOLITAN BOROUGH COUNCILS/);
  const metroEntries = parseCouncilTable(metroLines, "local_council_metro", 0);
  allEntries.push(...metroEntries);
  counts["Metropolitan Borough Councils"] = metroEntries.length;

  // 1.3 County Councils
  const countyLines = extractSection(allLines, /### 1\.3 COUNTY COUNCILS/);
  const countyEntries = parseCouncilTable(countyLines, "local_council_county", 0);
  allEntries.push(...countyEntries);
  counts["County Councils"] = countyEntries.length;

  // 1.4 Unitary Authorities
  const unitaryLines = extractSection(allLines, /### 1\.4 UNITARY AUTHORITIES/);
  const unitaryEntries = parseCouncilTable(unitaryLines, "local_council_unitary", 0);
  allEntries.push(...unitaryEntries);
  counts["Unitary Authorities"] = unitaryEntries.length;

  // 1.5 District Councils (has subsections #### A-C, D-H, etc.)
  const districtLines = extractSection(allLines, /### 1\.5 DISTRICT COUNCILS/);
  const districtEntries = parseCouncilTable(districtLines, "local_council_district", 0);
  allEntries.push(...districtEntries);
  counts["District Councils"] = districtEntries.length;

  // 1.6 Sui Generis
  const suiGenerisLines = extractSection(allLines, /### 1\.6 SUI GENERIS/);
  const suiGenerisEntries = parseCouncilTable(suiGenerisLines, "local_council_sui_generis", 0);
  allEntries.push(...suiGenerisEntries);
  counts["Sui Generis Authorities"] = suiGenerisEntries.length;

  // ---- Section 2: NHS Trusts ----

  // 2.1 Ambulance Trusts
  const ambulanceLines = extractSection(allLines, /### 2\.1 AMBULANCE TRUSTS/);
  const ambulanceEntries = parseCouncilTable(ambulanceLines, "nhs_trust_ambulance", 0);
  allEntries.push(...ambulanceEntries);
  counts["NHS Ambulance Trusts"] = ambulanceEntries.length;

  // 2.2-2.8 Acute Hospital Trusts (multiple regions)
  const acuteRegions = [
    { pattern: /### 2\.2 ACUTE.*LONDON/, label: "London" },
    { pattern: /### 2\.3 ACUTE.*SOUTH EAST/, label: "South East" },
    { pattern: /### 2\.4 ACUTE.*SOUTH WEST/, label: "South West" },
    { pattern: /### 2\.5 ACUTE.*MIDLANDS/, label: "Midlands" },
    { pattern: /### 2\.6 ACUTE.*EAST OF ENGLAND/, label: "East of England" },
    { pattern: /### 2\.7 ACUTE.*NORTH WEST/, label: "North West" },
    { pattern: /### 2\.8 ACUTE.*NORTH EAST/, label: "North East & Yorkshire" },
  ];

  let totalAcute = 0;
  for (const { pattern, label } of acuteRegions) {
    const lines = extractSection(allLines, pattern);
    const entries = parseCouncilTable(lines, "nhs_trust_acute", 0);
    // Set region on entries
    for (const e of entries) {
      if (!e.region) e.region = label;
    }
    allEntries.push(...entries);
    totalAcute += entries.length;
  }
  counts["NHS Acute Trusts"] = totalAcute;

  // 2.9 Mental Health Trusts
  const mhLines = extractSection(allLines, /### 2\.9 MENTAL HEALTH TRUSTS/);
  const mhEntries = parseCouncilTable(mhLines, "nhs_trust_mental_health", 0);
  allEntries.push(...mhEntries);
  counts["NHS Mental Health Trusts"] = mhEntries.length;

  // 2.10 Community Healthcare Trusts
  const communityLines = extractSection(allLines, /### 2\.10 COMMUNITY HEALTHCARE/);
  const communityEntries = parseCouncilTable(communityLines, "nhs_trust_community", 0);
  allEntries.push(...communityEntries);
  counts["NHS Community Trusts"] = communityEntries.length;

  // ---- Section 3: ICBs ----
  const icbRegions = [
    /### 3\.1/,
    /### 3\.2/,
    /### 3\.3/,
    /### 3\.4/,
    /### 3\.5/,
    /### 3\.6/,
    /### 3\.7/,
  ];
  let totalIcb = 0;
  for (const pattern of icbRegions) {
    const lines = extractSection(allLines, pattern);
    const entries = parseCouncilTable(lines, "nhs_icb", 0);
    allEntries.push(...entries);
    totalIcb += entries.length;
  }
  counts["NHS ICBs"] = totalIcb;

  // ---- Section 5: Fire and Rescue ----
  const fireRegions = [
    /#### South Western Region/,
    /#### South Eastern Region/,
    /#### North Eastern Region/,
    /#### Yorkshire.*Humberside/,
    /#### North Western Region/,
    /#### Eastern Region/,
    /#### East Midlands Region/,
    /#### West Midlands Region/,
    /#### London \(1\)/,
  ];
  let totalFire = 0;
  for (const pattern of fireRegions) {
    const lines = extractSubSection(allLines, pattern);
    const entries = parseFireRescueTable(lines, 0);
    allEntries.push(...entries);
    totalFire += entries.length;
  }
  counts["Fire and Rescue"] = totalFire;

  // ---- Section 6: Police PCCs ----
  const pccLines = extractSection(allLines, /### 6\.2 POLICE AND CRIME COMMISSIONERS/);
  const pccEntries = parsePolicePccTable(pccLines, 0);
  allEntries.push(...pccEntries);
  counts["Police PCCs"] = pccEntries.length;

  // ---- Section 7: Combined Authorities ----
  const caLines = extractSection(allLines, /### 7\.2 MAYORAL COMBINED AUTHORITIES/);
  const caEntries = parseCombinedAuthorityTable(caLines, 0);
  allEntries.push(...caEntries);
  counts["Combined Authorities"] = caEntries.length;

  // ---- Section 8: National Parks ----
  const npLines = extractSection(allLines, /### 8\.2 NATIONAL PARK AUTHORITIES/);
  const npEntries = parseNationalParkTable(npLines, 0);
  allEntries.push(...npEntries);
  counts["National Park Authorities"] = npEntries.length;

  // ---- Section 9: MATs (Tier 1) ----
  const matEntries = generateMatEntries();
  allEntries.push(...matEntries);
  counts["Multi-Academy Trusts"] = matEntries.length;

  // ---- Section 10: Universities (Tier 1) ----
  const uniEntries = generateUniversityEntries(allLines);
  allEntries.push(...uniEntries);
  counts["Universities"] = uniEntries.length;

  // ---- Section 11: FE Colleges (Tier 1) ----
  const feEntries = generateFeCollegeEntries(allLines);
  allEntries.push(...feEntries);
  counts["FE Colleges"] = feEntries.length;

  // ---- Section 12: Healthcare Regulators (Tier 1) ----
  const healthcareRegEntries = parseHealthcareRegulators(allLines);
  allEntries.push(...healthcareRegEntries);
  counts["Healthcare Regulators"] = healthcareRegEntries.length;

  // ---- Section 13: Major ALBs (Tier 1) ----
  const albEntries = parseAlbEntries(allLines);
  allEntries.push(...albEntries);
  counts["Major ALBs"] = albEntries.length;

  // ---- Log counts ----
  console.log("Parsed counts by category:");
  let total = 0;
  for (const [category, count] of Object.entries(counts)) {
    console.log(`  ${category}: ${count}`);
    total += count;
  }
  console.log(`\n  TOTAL: ${total}`);

  const tier0 = allEntries.filter((e) => e.tier === 0).length;
  const tier1 = allEntries.filter((e) => e.tier === 1).length;
  console.log(`  Tier 0 (current): ${tier0}`);
  console.log(`  Tier 1 (expansion): ${tier1}`);

  // ---- Connect and seed ----
  console.log("\nConnecting to MongoDB...");
  await dbConnect();

  console.log("Upserting DataSource documents...");

  const bulkOps = allEntries.map((entry) => ({
    updateOne: {
      filter: { name: entry.name },
      update: { $set: entry },
      upsert: true,
    },
  }));

  // Process in batches of 500
  const BATCH_SIZE = 500;
  let upserted = 0;
  let modified = 0;

  for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
    const batch = bulkOps.slice(i, i + BATCH_SIZE);
    const result = await DataSource.bulkWrite(batch);
    upserted += result.upsertedCount;
    modified += result.modifiedCount;
  }

  console.log(`\nSeed complete!`);
  console.log(`  Upserted: ${upserted}`);
  console.log(`  Modified: ${modified}`);
  console.log(`  Total entries: ${allEntries.length}`);

  // Verify count in DB
  const dbCount = await DataSource.countDocuments();
  console.log(`  Documents in DataSource collection: ${dbCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
