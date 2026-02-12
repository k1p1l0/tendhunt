/**
 * Unified single-buyer enrichment script.
 *
 * Runs ALL enrichment steps for one buyer inline (no worker imports):
 *   1. Logo + LinkedIn (Apify harvestapi/linkedin-company + logo.dev CDN)
 *   2. Governance URLs (copy from DataSource)
 *   3. ModernGov board documents (SOAP API)
 *   4. Key personnel extraction (Claude Haiku)
 *   5. Spend discovery + ingest (pattern match → CSV → parse → aggregate)
 *   6. Enrichment score computation
 *
 * Each step is independent — failures don't block subsequent steps.
 *
 * Usage:
 *   cd apps/web
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/enrich-buyer.ts "Bristol City Council"
 */
import { MongoClient, ObjectId } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BUYER_NAME = process.argv[2] || "Bristol City Council";
const MONGODB_URI = process.env.MONGODB_URI!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN ?? "";
const LOGO_DEV_SECRET_KEY = process.env.LOGO_DEV_SECRET_KEY ?? "";

if (!MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }

const SEP = "═".repeat(60);
const DASH = "─".repeat(60);
const UA = "Mozilla/5.0 (compatible; TendHunt/1.0; enrichment-script)";

// ---------------------------------------------------------------------------
// Shared fetch helper with timeout
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, opts: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 15000, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: Logo + LinkedIn enrichment
// ═══════════════════════════════════════════════════════════════════════════

function extractDomain(website: string): string | null {
  try { return new URL(website).hostname; } catch { return null; }
}

function buildLogoDevUrl(domain: string, token: string): string {
  return `https://img.logo.dev/${domain}?token=${token}&size=128&format=png`;
}

async function callApifyActor(actorId: string, input: Record<string, unknown>, apiToken: string): Promise<unknown[]> {
  const encodedActorId = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${apiToken}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      timeout: 120_000,
    });
    if (!res.ok) { console.warn(`  Apify ${actorId} returned ${res.status}`); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`  Apify call failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

interface LogoLinkedinResult {
  logoUrl?: string;
  linkedinUrl?: string;
  staffCount?: number;
  description?: string;
  address?: string;
  industry?: string;
  linkedin?: Record<string, unknown>;
}

async function enrichLogoLinkedin(buyer: Record<string, unknown>): Promise<LogoLinkedinResult> {
  const result: LogoLinkedinResult = {};

  // Apify LinkedIn lookup
  if (APIFY_API_TOKEN) {
    console.log("  Calling Apify harvestapi/linkedin-company...");
    const results = await callApifyActor(
      "harvestapi/linkedin-company",
      { searches: [buyer.name as string] },
      APIFY_API_TOKEN
    );
    if (results.length > 0) {
      const r = results[0] as Record<string, unknown>;
      const linkedinUrl = String(r.linkedinUrl || "");
      const logo = String(r.logo || "");

      if (linkedinUrl.includes("linkedin.com/")) {
        result.linkedinUrl = linkedinUrl;
        console.log(`  ✓ LinkedIn: ${linkedinUrl}`);
      }
      if (logo.startsWith("http")) {
        result.logoUrl = logo;
        console.log(`  ✓ Logo (LinkedIn): ${logo.slice(0, 80)}`);
      }
      const employeeCount = r.employeeCount as number | undefined;
      if (employeeCount && !buyer.staffCount) result.staffCount = employeeCount;
      const desc = String(r.description || "");
      if (desc && !buyer.description) result.description = desc;

      const locations = r.locations as Array<Record<string, unknown>> | undefined;
      const hq = locations?.find((l) => l.headquarter);
      const locText = (hq?.parsed as Record<string, unknown>)?.text;
      if (locText && typeof locText === "string") result.address = locText;

      const industries = r.industries as Array<Record<string, unknown>> | undefined;
      const primary = industries?.[0];
      const industryName = typeof primary === "string"
        ? primary
        : (primary as Record<string, unknown>)?.name as string | undefined;
      if (industryName) result.industry = industryName;

      // Full LinkedIn subdocument
      result.linkedin = {
        id: String(r.id || ""),
        universalName: String(r.universalName || ""),
        tagline: String(r.tagline || ""),
        companyType: String(r.companyType || ""),
        foundedYear: (r.foundedOn as Record<string, unknown>)?.year ?? null,
        followerCount: r.followerCount ?? null,
        employeeCountRange: r.employeeCountRange ?? null,
        specialities: r.specialities ?? [],
        industries: industries ?? [],
        locations: locations ?? [],
        logos: r.logos ?? [],
        backgroundCovers: r.backgroundCovers ?? [],
        phone: r.phone ?? null,
        fundingData: r.fundingData ?? null,
        lastFetchedAt: new Date(),
      };
    } else {
      console.log("  ○ No LinkedIn results");
    }
  } else {
    console.log("  ○ APIFY_API_TOKEN not set — skipping LinkedIn");
  }

  // logo.dev CDN fallback
  if (!result.logoUrl && LOGO_DEV_SECRET_KEY) {
    const website = buyer.website as string | undefined;
    if (website) {
      const domain = extractDomain(website);
      if (domain) {
        result.logoUrl = buildLogoDevUrl(domain, LOGO_DEV_SECRET_KEY);
        console.log(`  ✓ Logo (logo.dev): ${result.logoUrl.slice(0, 60)}...`);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: Governance URLs from DataSource
// ═══════════════════════════════════════════════════════════════════════════

interface GovernanceResult {
  democracyPortalUrl?: string;
  democracyPlatform?: string;
  boardPapersUrl?: string;
  website?: string;
}

async function enrichGovernanceUrls(
  db: ReturnType<MongoClient["db"]>,
  buyer: Record<string, unknown>
): Promise<GovernanceResult> {
  const result: GovernanceResult = {};
  const dataSourceId = buyer.dataSourceId;
  if (!dataSourceId) {
    console.log("  ○ No dataSourceId — skipping governance URLs");
    return result;
  }

  const ds = await db.collection("datasources").findOne({
    _id: dataSourceId instanceof ObjectId ? dataSourceId : new ObjectId(String(dataSourceId)),
  });
  if (!ds) {
    console.log("  ○ DataSource not found");
    return result;
  }

  if (ds.democracyPortalUrl) {
    result.democracyPortalUrl = ds.democracyPortalUrl as string;
    console.log(`  ✓ Democracy portal: ${result.democracyPortalUrl}`);
  }
  if (ds.platform) {
    result.democracyPlatform = ds.platform as string;
    console.log(`  ✓ Platform: ${result.democracyPlatform}`);
  }
  if (ds.boardPapersUrl) {
    result.boardPapersUrl = ds.boardPapersUrl as string;
    console.log(`  ✓ Board papers: ${result.boardPapersUrl}`);
  }
  if (ds.website && !buyer.website) {
    result.website = ds.website as string;
    console.log(`  ✓ Website (from DS): ${result.website}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: ModernGov board documents (SOAP API)
// ═══════════════════════════════════════════════════════════════════════════

interface ModernGovMeeting {
  id: number;
  committeeId: number;
  committeeName: string;
  date: string;
  title: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
});

function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function formatDateForSoap(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function parseMeetingDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

async function testModernGovConnection(baseUrl: string): Promise<boolean> {
  const soapBody = `<GetCommitteesByUser xmlns="http://tempuri.org/"><lUserID>0</lUserID></GetCommitteesByUser>`;
  const url = `${baseUrl.replace(/\/$/, "")}/mgWebService.asmx`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "http://tempuri.org/GetCommitteesByUser" },
      body: buildSoapEnvelope(soapBody),
      timeout: 5000,
    });
    return res.ok;
  } catch { return false; }
}

async function getModernGovMeetings(baseUrl: string, startDate: string, endDate: string): Promise<ModernGovMeeting[]> {
  const soapBody = `<GetMeetings xmlns="http://tempuri.org/"><sStartDate>${startDate}</sStartDate><sEndDate>${endDate}</sEndDate></GetMeetings>`;
  const url = `${baseUrl.replace(/\/$/, "")}/mgWebService.asmx`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "http://tempuri.org/GetMeetings" },
      body: buildSoapEnvelope(soapBody),
      timeout: 15000,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const envelope = xmlParser.parse(xml);
    const resultXml = envelope?.Envelope?.Body?.GetMeetingsResponse?.GetMeetingsResult;
    if (!resultXml || typeof resultXml !== "string") return [];
    const innerDoc = xmlParser.parse(resultXml);
    const meetings = innerDoc?.Meetings?.Meeting;
    if (!meetings) return [];
    const arr = Array.isArray(meetings) ? meetings : [meetings];
    return arr.map((m: Record<string, unknown>) => ({
      id: Number(m["@_id"] || m.Id || m.id || 0),
      committeeId: Number(m.CommitteeId || m.committeeid || 0),
      committeeName: String(m.CommitteeName || m.committeename || "Unknown"),
      date: String(m.Date || m.date || ""),
      title: String(m.Title || m.title || m.CommitteeName || m.committeename || "Meeting"),
    }));
  } catch (err) {
    console.warn(`  ModernGov error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function enrichModernGov(
  db: ReturnType<MongoClient["db"]>,
  buyerId: ObjectId,
  buyerName: string,
  democracyPortalUrl: string | undefined,
  democracyPlatform: string | undefined
): Promise<number> {
  if (democracyPlatform !== "ModernGov" || !democracyPortalUrl) {
    console.log(`  ○ Not ModernGov (platform=${democracyPlatform ?? "none"}) — skipping`);
    return 0;
  }

  const isAlive = await testModernGovConnection(democracyPortalUrl);
  if (!isAlive) {
    console.log(`  ✗ ModernGov API unreachable at ${democracyPortalUrl}`);
    return 0;
  }

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const meetings = await getModernGovMeetings(democracyPortalUrl, formatDateForSoap(oneYearAgo), formatDateForSoap(now));

  if (meetings.length === 0) {
    console.log(`  ○ No meetings found for "${buyerName}"`);
    return 0;
  }

  console.log(`  Found ${meetings.length} meetings`);

  const boardDocs = meetings.map((m) => ({
    buyerId,
    dataSourceName: buyerName,
    title: m.title || m.committeeName || "Meeting",
    meetingDate: parseMeetingDate(m.date),
    committeeId: String(m.committeeId),
    committeeName: m.committeeName,
    documentType: "minutes",
    sourceUrl: `${democracyPortalUrl.replace(/\/$/, "")}/mgConvert2PDF.aspx?ID=${m.id}`,
    extractionStatus: "pending",
  }));

  const ops = boardDocs.map((doc) => ({
    updateOne: {
      filter: { buyerId: doc.buyerId, sourceUrl: doc.sourceUrl },
      update: { $set: { ...doc, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      upsert: true,
    },
  }));
  const result = await db.collection("boarddocuments").bulkWrite(ops, { ordered: false });
  const total = result.upsertedCount + result.modifiedCount;
  console.log(`  ✓ Upserted ${total} board documents`);

  // Mark buyer
  await db.collection("buyers").updateOne(
    { _id: buyerId },
    { $set: { lastEnrichedAt: new Date(), updatedAt: new Date() }, $addToSet: { enrichmentSources: "moderngov" } }
  );

  return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: Key personnel extraction (Claude Haiku)
// ═══════════════════════════════════════════════════════════════════════════

function parsePersonnelJson(text: string): Array<{ name: string; title?: string; role?: string; department?: string; email?: string; confidence?: number }> {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry: unknown): entry is { name: string } =>
        typeof entry === "object" && entry !== null && "name" in entry &&
        typeof (entry as Record<string, unknown>).name === "string" && (entry as Record<string, unknown>).name !== ""
    );
  } catch { return []; }
}

async function enrichKeyPersonnel(
  db: ReturnType<MongoClient["db"]>,
  anthropic: Anthropic,
  buyerId: ObjectId,
  buyer: Record<string, unknown>
): Promise<number> {
  // Fetch board documents with extracted text
  const boardDocs = await db.collection("boarddocuments")
    .find({ buyerId, extractionStatus: "extracted", textContent: { $exists: true, $ne: "" } })
    .sort({ updatedAt: -1 }).limit(3).toArray();

  let combinedText = "";
  for (const doc of boardDocs) {
    if (!doc.textContent) continue;
    const remaining = 8000 - combinedText.length;
    if (remaining <= 0) break;
    combinedText += (doc.textContent as string).slice(0, remaining) + "\n\n";
  }
  combinedText = combinedText.trim();

  if (!combinedText) {
    console.log("  ○ No extracted text from board documents — skipping personnel");
    await db.collection("buyers").updateOne(
      { _id: buyerId },
      { $set: { lastEnrichedAt: new Date(), updatedAt: new Date() }, $addToSet: { enrichmentSources: "personnel" } }
    );
    return 0;
  }

  console.log(`  Calling Claude Haiku for personnel extraction (${combinedText.length} chars)...`);
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20250401",
    max_tokens: 1024,
    system: `You are extracting key personnel from UK public sector organization governance pages.
Extract ONLY people with procurement-relevant roles: chief executives, directors, board members, procurement leads, finance directors, treasurers, chairs.
Return a JSON array. If no relevant personnel found, return [].`,
    messages: [{
      role: "user",
      content: `Organization: ${buyer.name}
Organization type: ${buyer.orgType ?? "unknown"}

Governance page content:
${combinedText.slice(0, 8000)}

Extract key personnel as a JSON array with fields:
- name (string, required)
- title (string, job title as written)
- role (one of: chief_executive, director, board_member, procurement_lead, finance_director, cfo, chair, councillor, committee_chair)
- department (string, if mentioned)
- email (string, if found on page)
- confidence (number 0-100, how certain this extraction is correct)`,
    }],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
  const personnel = parsePersonnelJson(responseText);

  if (personnel.length > 0) {
    const sourceUrl = boardDocs[0]?.sourceUrl as string | undefined;
    const ops = personnel.map((p) => ({
      updateOne: {
        filter: { buyerId, name: p.name },
        update: {
          $set: { buyerId, name: p.name, title: p.title, role: p.role, department: p.department, email: p.email, confidence: p.confidence, extractionMethod: "claude_haiku", sourceUrl, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }));
    const result = await db.collection("keypersonnel").bulkWrite(ops, { ordered: false });
    const total = result.upsertedCount + result.modifiedCount;
    console.log(`  ✓ Extracted ${total} key personnel`);
    personnel.slice(0, 5).forEach((p) => console.log(`    - ${p.name} (${p.role ?? p.title ?? "unknown"})`));
  } else {
    console.log("  ○ No personnel found in board documents");
  }

  await db.collection("buyers").updateOne(
    { _id: buyerId },
    { $set: { lastEnrichedAt: new Date(), updatedAt: new Date() }, $addToSet: { enrichmentSources: "personnel" } }
  );

  return personnel.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: Spend discovery + ingest (inlined from test-spend-single.ts)
// ═══════════════════════════════════════════════════════════════════════════

// All spend helpers are inlined from test-spend-single.ts — see that file for docs.

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function parseDiscoveryResponse(text: string): { transparencyUrl: string | null; csvLinks: string[]; confidence: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return { transparencyUrl: parsed.transparencyUrl ?? null, csvLinks: Array.isArray(parsed.csvLinks) ? parsed.csvLinks : [], confidence: parsed.confidence ?? "NONE" };
  } catch { return null; }
}

function parseLinkExtractionResponse(text: string): string[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.csvLinks)) return parsed.csvLinks.filter((l: unknown): l is string => typeof l === "string" && l.length > 0);
    return [];
  } catch { return []; }
}

function resolveAndDedup(urls: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const resolved = new URL(url, baseUrl).href;
      if ((resolved.startsWith("http://") || resolved.startsWith("https://")) && !seen.has(resolved)) { seen.add(resolved); result.push(resolved); }
    } catch { /* skip */ }
  }
  return result;
}

// Pattern-based discovery
interface TransparencyUrlPattern { name: string; paths: string[]; priority: number; }

const PATTERN_REGISTRY: Record<string, TransparencyUrlPattern[]> = {
  local_council: [
    { name: "council_transparency_spending", priority: 1, paths: ["/council/transparency/spending", "/transparency/spending", "/about-the-council/transparency/spending-and-procurement", "/council-and-mayor/council-spending-and-performance/spending-over-500", "/council/council-spending-and-performance/spending-over-500", "/about-the-council/finance-and-budget/spending", "/about-the-council/finance-and-budget/spending/invoices-over-250", "/performance-and-spending/our-financial-plans/spending-over-500", "/your-council/performance-and-spending/our-financial-plans/spending-over-500"] },
    { name: "council_payments", priority: 2, paths: ["/payments-over-500", "/spending-over-500", "/spending-over-250", "/payments-over-250", "/your-council/finance/payments-suppliers", "/about-the-council/budgets-and-spending/spending-and-payments", "/council-spending-and-performance", "/your-council/budgets-and-spending", "/about-us/what-we-spend"] },
    { name: "council_open_data", priority: 3, paths: ["/open-data/spending", "/open-data/council-spending", "/opendata/spending", "/publication-scheme"] },
    { name: "council_transparency_generic", priority: 4, paths: ["/transparency", "/transparency-and-open-data", "/your-council/transparency", "/about-the-council/transparency"] },
  ],
  nhs_trust: [
    { name: "nhs_spending_25k", priority: 1, paths: ["/about-us/freedom-of-information/spending-over-25000", "/about-us/spending-over-25-000", "/about-us/spending-over-25000", "/about-us/information-governance/freedom-information/spending-over-25000", "/about-us/freedom-of-information/expenditure-over-25-000", "/about-us/freedom-of-information/expenditure-over-25000", "/spending-over-25k"] },
    { name: "nhs_spending_money", priority: 2, paths: ["/about-us/how-we-spend-our-money", "/about-us/spending", "/about-us/our-spending", "/about-us/guide-information-publication-scheme/transparency-spending", "/about-us/key-documents/investing-money-in-your-care", "/about-us/corporate-publications/financial-transparency", "/what-we-spend", "/what-we-spend-and-how-we-spend-it"] },
    { name: "nhs_publications", priority: 3, paths: ["/publications/spending", "/about-us/publications/spending"] },
  ],
  nhs_icb: [
    { name: "icb_spending", priority: 1, paths: ["/about-us/how-we-spend-public-money", "/about-us/spending-reports", "/about-us/spending-over-25000"] },
    { name: "icb_transparency", priority: 2, paths: ["/about-us/transparency", "/transparency/spending"] },
  ],
  central_government: [
    { name: "govuk_spending_25k", priority: 1, paths: ["/government/collections/spending-over-25-000", "/government/publications/spending-over-25-000"] },
    { name: "govuk_transparency", priority: 2, paths: ["/government/collections/transparency-data", "/transparency"] },
  ],
  fire_rescue: [{ name: "fire_transparency", priority: 1, paths: ["/about-us/transparency", "/transparency/spending", "/about-us/transparency/spending-over-500", "/your-service/transparency/what-we-spend", "/about-us/what-we-spend", "/about-us/what-we-spend/spend-over-ps500"] }],
  police_pcc: [{ name: "police_spending", priority: 1, paths: ["/transparency/spending", "/about-us/what-we-spend", "/transparency/payments-over-500"] }],
  combined_authority: [{ name: "combined_authority_spending", priority: 1, paths: ["/transparency/spending", "/about-us/how-we-spend-public-money", "/about-us/transparency", "/about-us/democracy-funding-transparency/financial-information", "/what-we-do/budget-spending-transparency"] }],
  university: [{ name: "university_spending", priority: 1, paths: ["/about/transparency", "/about-us/transparency", "/governance/transparency", "/about/spending"] }],
  fe_college: [{ name: "fe_spending", priority: 1, paths: ["/about-us/transparency", "/about/transparency", "/transparency"] }],
  mat: [{ name: "mat_spending", priority: 1, paths: ["/about-us/transparency", "/transparency", "/about/spending"] }],
  national_park: [{ name: "national_park_spending", priority: 1, paths: ["/about-us/transparency", "/transparency", "/about-us/spending"] }],
  alb: [{ name: "alb_spending", priority: 1, paths: ["/about-us/transparency", "/transparency/spending", "/about-us/spending", "/spending"] }],
};

const GOVUK_DEPT_SLUG_MAP: Record<string, string> = {
  "ministry of defence": "mod", "hm revenue & customs": "hmrc", "hm revenue and customs": "hmrc",
  "hm treasury": "hm-treasury", "home office": "home-office", "ministry of justice": "ministry-of-justice",
  "department for education": "department-for-education-dfe", "department of health and social care": "dhsc",
  "department for transport": "department-for-transport", "department for work and pensions": "dwp", "cabinet office": "cabinet-office",
  "nhs england": "nhs-england",
};

function getGovukDeptPaths(buyerName: string): string[] {
  const nameLower = buyerName.toLowerCase();
  for (const [pattern, slug] of Object.entries(GOVUK_DEPT_SLUG_MAP)) {
    if (nameLower.includes(pattern)) {
      const year = new Date().getFullYear();
      return [
        `/government/publications/${slug}-spending-over-25000-january-to-december-${year}`,
        `/government/publications/${slug}-spending-over-25000-${year}`,
        `/government/publications/${slug}-spending-over-25000-january-to-december-${year - 1}`,
        `/government/publications/${slug}-spending-over-25-000`,
        `/government/publications/${slug}-spending-over-25000`,
      ];
    }
  }
  return [];
}

function getPatternsForOrgType(orgType: string | undefined): TransparencyUrlPattern[] {
  if (!orgType) return [];
  if (PATTERN_REGISTRY[orgType]) return PATTERN_REGISTRY[orgType];
  const segments = orgType.split("_");
  for (let i = segments.length - 1; i >= 1; i--) {
    const parentType = segments.slice(0, i).join("_");
    if (PATTERN_REGISTRY[parentType]) return PATTERN_REGISTRY[parentType];
  }
  return [];
}

const SPEND_KEYWORDS = ["spending", "expenditure", "transparency", "payments over", "spend over", "csv", ".csv", ".xls", "download", "freedom of information", "publication scheme", "invoices over", "payments to suppliers", "payment data", "spend data", "monthly spend", "financial transparency", "open government licence", "open data", "25,000", "£25", "£500", "procurement"];

function containsSpendKeywords(html: string): boolean {
  const lower = html.toLowerCase();
  return SPEND_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractNavAndFooter(html: string, maxChars = 20000): string {
  const sections: string[] = [];
  sections.push(...(html.match(/<nav[\s\S]*?<\/nav>/gi) ?? []));
  sections.push(...(html.match(/<header[\s\S]*?<\/header>/gi) ?? []));
  sections.push(...(html.match(/<footer[\s\S]*?<\/footer>/gi) ?? []));
  sections.push(...(html.match(/<aside[\s\S]*?<\/aside>/gi) ?? []));
  sections.push(...(html.match(/<div[^>]*class="[^"]*(?:sidebar|side-nav|subnav)[^"]*"[\s\S]*?<\/div>/gi) ?? []));
  const combined = sections.join("\n");
  if (combined.length > 2000) return stripHtml(combined).slice(0, maxChars);
  return stripHtml(html).slice(0, maxChars);
}

function extractMainContent(html: string, maxChars = 30000): string {
  const mainMatches = html.match(/<main[\s\S]*?<\/main>/gi) ?? [];
  if (mainMatches.length > 0) { const c = stripHtml(mainMatches.join("\n")); if (c.length > 1000) return c.slice(0, maxChars); }
  const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
  if (articleMatches.length > 0) { const c = stripHtml(articleMatches.join("\n")); if (c.length > 1000) return c.slice(0, maxChars); }
  const contentDivMatches = html.match(/<div[^>]*(?:id="content"|class="[^"]*content[^"]*")[^>]*>[\s\S]*?<\/div>/gi) ?? [];
  if (contentDivMatches.length > 0) { const c = stripHtml(contentDivMatches.join("\n")); if (c.length > 1000) return c.slice(0, maxChars); }
  return stripHtml(html).slice(0, maxChars);
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, "/").replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
}

interface CsvPattern { name: string; regex: RegExp; weight: number; }
const ALL_CSV_PATTERNS: CsvPattern[] = [
  { name: "file_extension", regex: /\.(?:csv|xls|xlsx|ods)(?:\?[^"'\s]*)?$/i, weight: 10 },
  { name: "download_export", regex: /(?:download|export|attachment).*(?:csv|xls|xlsx|spending|payment)|(?:csv|xls|xlsx).*(?:download|export|attachment)/i, weight: 8 },
  { name: "govuk_attachment", regex: /\/government\/(?:publications|uploads)\//i, weight: 7 },
  { name: "data_gov_uk", regex: /data\.gov\.uk\/dataset\//i, weight: 9 },
  { name: "document_mgmt", regex: /(?:Document\.ashx\?Id=|mgDocument\.aspx\?i=)/i, weight: 5 },
  { name: "wp_uploads", regex: /\/wp-content\/uploads\/.*(?:spend|payment|expenditure|transparency|csv|xls)/i, weight: 7 },
  { name: "drupal_files", regex: /\/sites\/default\/files\/.*(?:spend|payment|expenditure|transparency|csv|xls)/i, weight: 7 },
  { name: "period_named", regex: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|quarter|20[12]\d).*\.(?:csv|xls|xlsx)/i, weight: 9 },
  { name: "stream_download", regex: /(?:streamfile|filedownload|getfile|openfile|documentdownload)/i, weight: 5 },
  { name: "file_id", regex: /[?&](?:file_?id|doc_?id|document_?id|attachment_?id)=\d+/i, weight: 4 },
  { name: "sharepoint", regex: /\/(?:Shared%20Documents|Documents|_layouts\/15\/download\.aspx)/i, weight: 5 },
  { name: "content_download", regex: /\/download\/(?:file|attachment|document)\/\d+/i, weight: 6 },
];

const SPEND_ANCHOR_KEYWORDS = ["spending", "expenditure", "payments over", "spend over", "transparency", "csv", "download", "quarter", "monthly"];

interface ScoredLink { url: string; score: number; matchedPatterns: string[]; anchorText?: string; }

function scoreLink(href: string, anchorText?: string): ScoredLink | null {
  let totalScore = 0;
  const matchedPatterns: string[] = [];
  for (const p of ALL_CSV_PATTERNS) { if (p.regex.test(href)) { totalScore += p.weight; matchedPatterns.push(p.name); } }
  if (matchedPatterns.length === 0) return null;
  if (anchorText) { const lower = anchorText.toLowerCase(); for (const kw of SPEND_ANCHOR_KEYWORDS) { if (lower.includes(kw)) { totalScore += 3; break; } } }
  return { url: href, score: totalScore, matchedPatterns, anchorText };
}

function extractLinksEnhanced(html: string, baseUrl: string): ScoredLink[] {
  const decoded = decodeHtmlEntities(html);
  const scored: ScoredLink[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(decoded)) !== null) {
    const href = match[1]; const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
    const result = scoreLink(href, anchorText);
    if (result) { try { const resolved = new URL(href, baseUrl).href; if ((resolved.startsWith("http://") || resolved.startsWith("https://")) && !seen.has(resolved)) { seen.add(resolved); scored.push({ ...result, url: resolved }); } } catch { /* skip */ } }
  }
  const bareHrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  while ((match = bareHrefRegex.exec(decoded)) !== null) {
    const href = match[1];
    try { const resolved = new URL(href, baseUrl).href; if (seen.has(resolved)) continue; const result = scoreLink(href); if (result && (resolved.startsWith("http://") || resolved.startsWith("https://"))) { seen.add(resolved); scored.push({ ...result, url: resolved }); } } catch { /* skip */ }
  }
  return scored.sort((a, b) => b.score - a.score);
}

function isValidDownloadLink(url: string): boolean {
  try { return scoreLink(new URL(url).href.toLowerCase()) !== null; } catch { return false; }
}

const DEPT_ABBREVIATION_MAP: Record<string, string[]> = {
  "ministry of defence": ["mod", "ministry-of-defence", "defence"], "hm revenue": ["hmrc", "hm-revenue", "revenue-customs"],
  "hm treasury": ["hmt", "hm-treasury", "treasury"], "home office": ["home-office"],
  "ministry of justice": ["moj", "ministry-of-justice", "justice"], "department for education": ["dfe", "department-for-education", "education"],
  "department of health": ["dhsc", "department-of-health", "health-social-care"], "department for transport": ["dft", "department-for-transport", "transport"],
  "department for work": ["dwp", "department-for-work", "work-pensions"], "department for environment": ["defra", "department-for-environment", "environment-food"],
  "department for business": ["dbt", "department-for-business", "business-trade"], "foreign commonwealth": ["fcdo", "foreign-commonwealth"],
  "cabinet office": ["cabinet-office"], "hm courts": ["hmcts", "hm-courts", "courts-tribunals"], "nhs england": ["nhs-england", "nhse"],
};

function filterLinksToBuyer(links: string[], buyerName: string): string[] {
  const nameLower = buyerName.toLowerCase();
  const keywords: string[] = [];
  keywords.push(nameLower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const skipWords = new Set(["the", "of", "and", "for", "in", "hm", "her", "his", "majesty"]);
  for (const word of nameLower.split(/\s+/)) { if (word.length > 2 && !skipWords.has(word)) keywords.push(word); }
  for (const [pattern, abbrs] of Object.entries(DEPT_ABBREVIATION_MAP)) { if (nameLower.includes(pattern)) { keywords.push(...abbrs); break; } }
  const filtered = links.filter((url) => { const urlLower = url.toLowerCase(); return keywords.some((kw) => urlLower.includes(kw)); });
  return filtered.length === 0 ? links : filtered;
}

async function followGovukPublicationPages(csvLinks: string[]): Promise<string[]> {
  const pubUrls = csvLinks.filter((u) => u.includes("/government/publications/"));
  const nonPubUrls = csvLinks.filter((u) => !u.includes("/government/publications/"));
  if (pubUrls.length === 0) return csvLinks;
  console.log(`  Following ${pubUrls.length} GOV.UK publication pages...`);
  const downloads: string[] = [];
  for (const pubUrl of pubUrls.slice(0, 24)) {
    try {
      const res = await fetchWithTimeout(pubUrl, { headers: { "User-Agent": UA }, timeout: 10000 });
      if (!res.ok) continue;
      const html = await res.text();
      const decoded = decodeHtmlEntities(html);
      const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;
      while ((match = hrefRegex.exec(decoded)) !== null) {
        const href = match[1];
        if (href.includes("assets.publishing.service.gov.uk/media/") || href.includes("/government/uploads/")) {
          try { const resolved = new URL(href, pubUrl).href; if (resolved.startsWith("http")) downloads.push(resolved); } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  console.log(`  Resolved ${downloads.length} download URLs from publication pages`);
  return Array.from(new Set([...nonPubUrls, ...downloads]));
}

function parseSpreadsheet(buffer: ArrayBuffer): { data: Record<string, string>[]; fields: string[] } {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { data: [], fields: [] };
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: "" });
  if (rows.length === 0) return { data: [], fields: [] };
  return { data: rows, fields: Object.keys(rows[0]) };
}

type FileFormat = "csv" | "ods" | "xlsx" | "pdf" | "unknown";
function detectFileFormat(contentType: string, url: string): FileFormat {
  const ct = contentType.toLowerCase();
  if (ct.includes("application/pdf")) return "pdf";
  if (ct.includes("text/csv") || ct.includes("application/csv")) return "csv";
  if (ct.includes("application/vnd.oasis.opendocument.spreadsheet")) return "ods";
  if (ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml")) return "xlsx";
  const pathPart = url.toLowerCase().split("?")[0];
  if (pathPart.endsWith(".pdf")) return "pdf";
  if (pathPart.endsWith(".csv")) return "csv";
  if (pathPart.endsWith(".ods")) return "ods";
  if (pathPart.endsWith(".xlsx") || pathPart.endsWith(".xls")) return "xlsx";
  if (ct.includes("text/plain")) return "csv";
  if (ct.includes("application/octet-stream") || ct.includes("application/vnd")) { if (url.toLowerCase().includes(".pdf")) return "pdf"; if (url.toLowerCase().includes(".ods")) return "ods"; if (url.toLowerCase().includes(".xls")) return "xlsx"; }
  return "unknown";
}

async function parsePdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

async function parsePdfWithClaude(
  pdfText: string,
  anthropic: Anthropic
): Promise<{ data: Record<string, string>[]; fields: string[] }> {
  if (pdfText.length < 50) {
    console.log(`  PDF text too short (${pdfText.length} chars) — likely scanned image, skipping`);
    return { data: [], fields: [] };
  }

  const truncatedText = pdfText.slice(0, 15000);
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system:
      "You are extracting structured spending transaction data from a UK public sector PDF document. The PDF contains tabular spending data (payments over 25k or 500). Extract each row as a JSON object. If the PDF does not contain tabular spending data, return an empty array [].",
    messages: [
      {
        role: "user",
        content: `Extract tabular spending data from this PDF text.

PDF text:
${truncatedText}

Return ONLY a JSON array of objects. Each object must have:
- "date": payment/transaction date as written
- "amount": payment amount (number as string, keep original format)
- "vendor": supplier/payee name
- "category": spend category or service area (if available, otherwise "")
- "department": department/directorate (if available, otherwise "")
- "reference": transaction/invoice reference (if available, otherwise "")

If no tabular spending data found, return []`,
      },
    ],
  });

  const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
  try {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (!match) return { data: [], fields: [] };
    const parsed = JSON.parse(match[0]) as Record<string, string>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return { data: [], fields: [] };
    const fields = Object.keys(parsed[0]);
    return { data: parsed, fields };
  } catch {
    console.warn("  Failed to parse Claude PDF response");
    return { data: [], fields: [] };
  }
}

interface KnownSchema { name: string; detect: (headers: string[]) => boolean; map: Record<string, string | undefined>; }
function hasHeaders(headers: string[], required: string[]): boolean { const lower = headers.map((h) => h.toLowerCase().trim()); return required.every((r) => lower.some((h) => h.includes(r.toLowerCase()))); }
const KNOWN_SCHEMAS: KnownSchema[] = [
  { name: "govuk_mod_spending_25k", detect: (h) => hasHeaders(h, ["expense type", "expense area", "supplier name", "transaction number", "payment date"]), map: { date: "Payment Date", amount: "Total", vendor: "Supplier Name", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" } },
  { name: "govuk_spending_25k", detect: (h) => hasHeaders(h, ["expense type", "expense area", "supplier", "transaction number"]), map: { date: "Date", amount: "Amount", vendor: "Supplier", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" } },
  { name: "devon_pattern", detect: (h) => hasHeaders(h, ["expense area", "expense type", "supplier name"]), map: { date: "Date", amount: "Amount", vendor: "Supplier Name", category: "Expense Type", subcategory: "Expense Area" } },
];

function parseCSV(text: string): { data: Record<string, string>[]; fields: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { data: [], fields: [] };
  const fields = parseCSVLine(lines[0]);
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < fields.length; j++) row[fields[j]] = values[j] ?? "";
    data.push(row);
  }
  return { data, fields };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) { if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; } } else { current += ch; } }
    else { if (ch === '"') { inQuotes = true; } else if (ch === ",") { result.push(current.trim()); current = ""; } else { current += ch; } }
  }
  result.push(current.trim());
  return result;
}

const MONTH_MAP: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseFlexibleDate(s: string): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  const ukMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (ukMatch) { let year = parseInt(ukMatch[3]); if (year < 100) year += 2000; const d = new Date(year, parseInt(ukMatch[2]) - 1, parseInt(ukMatch[1])); if (!isNaN(d.getTime())) return d; }
  const monMatch = trimmed.match(/^(\d{1,2})[\/\-.]([A-Za-z]{3})[\/\-.](\d{2,4})$/);
  if (monMatch) { const monthIdx = MONTH_MAP[monMatch[2].toLowerCase()]; if (monthIdx !== undefined) { let year = parseInt(monMatch[3]); if (year < 100) year += 2000; const d = new Date(year, monthIdx, parseInt(monMatch[1])); if (!isNaN(d.getTime())) return d; } }
  const iso = new Date(trimmed);
  if (!isNaN(iso.getTime())) return iso;
  return null;
}

function parseAmount(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[£$€,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeVendor(name: string): string {
  return name.toLowerCase().replace(/\b(ltd|limited|plc|inc|llp|llc|corp|uk)\b\.?/gi, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

async function runSpendIngest(
  db: ReturnType<MongoClient["db"]>,
  anthropic: Anthropic,
  buyerId: ObjectId,
  buyer: Record<string, unknown>
): Promise<{ transactions: number; totalSpend: number }> {
  const buyerName = buyer.name as string;

  // ─── STAGE 1: Discover Transparency Page ─────────────────────
  let transparencyUrl = buyer.transparencyPageUrl as string | undefined;
  if (transparencyUrl && transparencyUrl !== "none") {
    console.log(`  Already has transparencyPageUrl: ${transparencyUrl}`);
  } else if (!buyer.website) {
    console.log("  No website — cannot discover transparency page.");
    return { transactions: 0, totalSpend: 0 };
  } else {
    const websiteUrl = buyer.website as string;
    let discoveryMethod = "none";

    // GOV.UK dept-specific paths
    const deptPaths = getGovukDeptPaths(buyerName);
    if (deptPaths.length > 0) {
      for (const path of deptPaths) {
        let candidateUrl: string;
        try { candidateUrl = new URL(path, "https://www.gov.uk").href; } catch { continue; }
        try {
          const res = await fetchWithTimeout(candidateUrl, { headers: { "User-Agent": UA }, timeout: 8000 });
          if (!res.ok) continue;
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("text/html") && !ct.includes("application/xhtml")) continue;
          const html = await res.text();
          if (containsSpendKeywords(html)) {
            transparencyUrl = candidateUrl;
            discoveryMethod = "pattern_match";
            const links = extractLinksEnhanced(html, candidateUrl).map((s) => s.url);
            console.log(`  ✓ DEPT MATCH: ${candidateUrl} (${links.length} links)`);
            await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { transparencyPageUrl: transparencyUrl, discoveryMethod, ...(links.length > 0 ? { csvLinks: links } : {}), updatedAt: new Date() } });
            break;
          }
        } catch { /* skip */ }
      }
    }

    // Pattern phase
    const patterns = getPatternsForOrgType(buyer.orgType as string | undefined);
    if (discoveryMethod !== "pattern_match" && patterns.length > 0) {
      const sorted = [...patterns].sort((a, b) => a.priority - b.priority);
      for (const pattern of sorted) {
        for (const path of pattern.paths) {
          let candidateUrl: string;
          try { candidateUrl = new URL(path, websiteUrl).href; } catch { continue; }
          try {
            const res = await fetchWithTimeout(candidateUrl, { headers: { "User-Agent": UA }, timeout: 8000 });
            if (!res.ok) continue;
            const ct = res.headers.get("content-type") ?? "";
            if (!ct.includes("text/html") && !ct.includes("application/xhtml")) continue;
            const html = await res.text();
            if (containsSpendKeywords(html)) {
              transparencyUrl = candidateUrl;
              discoveryMethod = "pattern_match";
              let links = extractLinksEnhanced(html, candidateUrl).map((s) => s.url);
              if (candidateUrl.includes("gov.uk/government/")) links = filterLinksToBuyer(links, buyerName);
              console.log(`  ✓ PATTERN MATCH: ${pattern.name} (${links.length} links)`);
              await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { transparencyPageUrl: transparencyUrl, discoveryMethod, ...(links.length > 0 ? { csvLinks: links } : {}), updatedAt: new Date() } });
              break;
            }
          } catch { /* skip */ }
        }
        if (discoveryMethod === "pattern_match") break;
      }
    }

    // AI fallback
    if (discoveryMethod !== "pattern_match") {
      console.log("  No pattern match, falling back to AI discovery...");
      let html: string;
      try {
        const res = await fetchWithTimeout(websiteUrl, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      } catch (err) {
        console.log(`  Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { transparencyPageUrl: "none", discoveryMethod: "none", updatedAt: new Date() } });
        return { transactions: 0, totalSpend: 0 };
      }

      const navFooterHtml = extractNavAndFooter(html, 15000);
      const hasSpendInNav = containsSpendKeywords(navFooterHtml);
      const hasSpendInBody = containsSpendKeywords(html);
      let extractedHtml: string;
      if (hasSpendInNav) { extractedHtml = navFooterHtml; }
      else if (hasSpendInBody) { extractedHtml = (navFooterHtml.slice(0, 10000) + "\n<!-- main content -->\n" + extractMainContent(html, 20000)).slice(0, 30000); }
      else { extractedHtml = (navFooterHtml.slice(0, 10000) + "\n" + extractMainContent(html, 15000)).slice(0, 30000); }

      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: `You are analyzing a UK public sector website to find their spending/transparency data page.\n\nOrganization: ${buyerName}\nWebsite: ${websiteUrl}\nOrganization type: ${buyer.orgType ?? "unknown"}\n\nHTML content:\n<html>${extractedHtml}</html>\n\nFind links to spending data/transparency pages. Return ONLY valid JSON:\n{"transparencyUrl": "full URL or null", "csvLinks": ["array of direct CSV/XLS download URLs"], "confidence": "HIGH|MEDIUM|LOW|NONE"}` }],
      });

      const responseText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
      const parsed = parseDiscoveryResponse(responseText);

      if (!parsed || parsed.confidence === "NONE" || !parsed.transparencyUrl) {
        console.log("  No transparency page found. Marking as 'none'.");
        await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { transparencyPageUrl: "none", discoveryMethod: "none", updatedAt: new Date() } });
        return { transactions: 0, totalSpend: 0 };
      }

      try { transparencyUrl = new URL(parsed.transparencyUrl, websiteUrl).href; } catch { transparencyUrl = parsed.transparencyUrl; }
      const validCsvLinks = parsed.csvLinks.map((l) => { try { return new URL(l, websiteUrl).href; } catch { return null; } }).filter((l): l is string => l !== null && l.startsWith("http"));
      discoveryMethod = "ai_discovery";
      console.log(`  ✓ AI DISCOVERY: ${transparencyUrl} (${validCsvLinks.length} links)`);
      await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { transparencyPageUrl: transparencyUrl, discoveryMethod, ...(validCsvLinks.length > 0 ? { csvLinks: validCsvLinks } : {}), updatedAt: new Date() } });
    }
  }

  // ─── STAGE 2: Extract CSV Links ──────────────────────────────
  if (!transparencyUrl || transparencyUrl === "none") {
    console.log("  No transparency URL — skipping link extraction.");
    return { transactions: 0, totalSpend: 0 };
  }

  const buyerAfterS1 = await db.collection("buyers").findOne({ _id: buyerId });
  let csvLinks = (buyerAfterS1?.csvLinks as string[]) ?? [];

  if (csvLinks.some((u) => u.includes("/government/publications/"))) csvLinks = await followGovukPublicationPages(csvLinks);
  if (transparencyUrl.includes("gov.uk/government/")) {
    csvLinks = filterLinksToBuyer(csvLinks, buyerName);
    await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { csvLinks, updatedAt: new Date() } });
  }

  if (!buyerAfterS1?.csvLinksExtracted) {
    let html: string | undefined;
    try {
      const res = await fetchWithTimeout(transparencyUrl, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch { /* skip */ }

    if (html) {
      const regexLinks = extractLinksEnhanced(html, transparencyUrl).map((s) => s.url);
      let aiLinks: string[] = [];
      if (regexLinks.length < 3) {
        const aiResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: `Extract CSV/Excel download links from this UK public sector transparency page.\n\nOrganization: ${buyerName}\nPage URL: ${transparencyUrl}\n\nHTML:\n<html>${stripHtml(html).slice(0, 15000)}</html>\n\nReturn ONLY valid JSON:\n{"csvLinks": ["array of full download URLs"]}` }],
        });
        const respText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
        aiLinks = parseLinkExtractionResponse(respText);
        if (aiLinks.length > 0) aiLinks = resolveAndDedup(aiLinks, transparencyUrl);
      }
      const allLinks = Array.from(new Set([...csvLinks, ...regexLinks, ...aiLinks]));
      csvLinks = allLinks.filter(isValidDownloadLink);
    }
    await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { csvLinks, csvLinksExtracted: true, updatedAt: new Date() } });
  }

  if (csvLinks.length === 0) {
    console.log("  No CSV links found.");
    return { transactions: 0, totalSpend: 0 };
  }

  console.log(`  Found ${csvLinks.length} CSV links`);

  // ─── STAGE 3: Download & Parse ───────────────────────────────
  let totalTransactions = 0;
  const MAX_FILES = 3;
  const MAX_TRANSACTIONS = 500;

  for (let i = 0; i < Math.min(csvLinks.length, MAX_FILES); i++) {
    const csvUrl = csvLinks[i];
    const existing = await db.collection("spendtransactions").findOne({ buyerId, sourceFile: csvUrl });
    if (existing) continue;

    let parsedData: Record<string, string>[];
    let headers: string[];
    try {
      const res = await fetchWithTimeout(csvUrl, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      const format = detectFileFormat(contentType, csvUrl);
      if (format === "pdf") {
        const arrBuf = await res.arrayBuffer();
        const pdfText = await parsePdfText(Buffer.from(arrBuf));
        const result = await parsePdfWithClaude(pdfText, anthropic);
        parsedData = result.data; headers = result.fields;
        if (parsedData.length > 0) console.log(`  Parsed PDF: ${parsedData.length} rows extracted via Claude`);
      } else if (format === "ods" || format === "xlsx") {
        const buffer = await res.arrayBuffer();
        const result = parseSpreadsheet(buffer);
        parsedData = result.data; headers = result.fields;
      } else if (format === "csv" || format === "unknown") {
        if (contentType.includes("text/html")) continue;
        const csvText = await res.text();
        const result = parseCSV(csvText);
        parsedData = result.data; headers = result.fields;
      } else continue;
    } catch { continue; }

    if (parsedData.length === 0) continue;

    // Column mapping
    let columnMapping: Record<string, string | undefined> | null = null;
    for (const schema of KNOWN_SCHEMAS) { if (schema.detect(headers)) { columnMapping = schema.map; break; } }
    if (!columnMapping) {
      const headerLower = headers.map((h) => h.toLowerCase());
      const dateCol = headers.find((_, i) => /date|payment.?date|trans.?date/.test(headerLower[i]));
      const amountCol = headers.find((_, i) => /amount|value|total|net|gross|sum/.test(headerLower[i]));
      const vendorCol = headers.find((_, i) => /vendor|supplier|payee|beneficiary|company|merchant/.test(headerLower[i]));
      if (dateCol && amountCol && vendorCol) {
        columnMapping = { date: dateCol, amount: amountCol, vendor: vendorCol };
        const catCol = headers.find((_, i) => /category|service|type|description|purpose|expense.?type/.test(headerLower[i]));
        if (catCol) columnMapping.category = catCol;
      }
    }
    if (!columnMapping) {
      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: `Map these CSV columns to spending schema.\n\nHeaders: ${headers.join(", ")}\nSample: ${parsedData.slice(0, 3).map((r) => headers.map((h) => r[h] ?? "").join(" | ")).join("\n")}\n\nReturn ONLY valid JSON:\n{"date": "col", "amount": "col", "vendor": "col", "category": "col_or_null"}` }],
      });
      const respText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
      try { const m = respText.match(/\{[\s\S]*\}/); if (m) { const p = JSON.parse(m[0]); if (p.date && p.amount && p.vendor) columnMapping = p; } } catch { /* ignore */ }
    }
    if (!columnMapping) continue;

    const getCol = (row: Record<string, string>, col: string | undefined): string => {
      if (!col) return "";
      if (row[col] !== undefined) return row[col];
      const colLower = col.toLowerCase();
      for (const key of Object.keys(row)) { if (key.toLowerCase() === colLower) return row[key]; }
      return "";
    };

    interface TxDoc { buyerId: ObjectId; date: Date; amount: number; vendor: string; vendorNormalized: string; category: string; subcategory?: string; department?: string; reference?: string; sourceFile: string; createdAt: Date; updatedAt: Date; }
    const transactions: TxDoc[] = [];
    for (const row of parsedData) {
      if (transactions.length >= MAX_TRANSACTIONS) break;
      const date = parseFlexibleDate(getCol(row, columnMapping.date));
      const amount = parseAmount(getCol(row, columnMapping.amount));
      const vendor = getCol(row, columnMapping.vendor).trim();
      if (!date || amount === 0 || !vendor) continue;
      const now = new Date();
      transactions.push({ buyerId, date, amount, vendor, vendorNormalized: normalizeVendor(vendor), category: getCol(row, columnMapping.category) || "Other", subcategory: getCol(row, columnMapping.subcategory) || undefined, department: getCol(row, columnMapping.department) || undefined, reference: getCol(row, columnMapping.reference) || undefined, sourceFile: csvUrl, createdAt: now, updatedAt: now });
    }

    if (transactions.length > 0) {
      const ops = transactions.map((tx) => ({
        updateOne: {
          filter: { buyerId: tx.buyerId, date: tx.date, vendor: tx.vendor, amount: tx.amount },
          update: { $set: { vendorNormalized: tx.vendorNormalized, category: tx.category, sourceFile: tx.sourceFile, updatedAt: tx.updatedAt }, $setOnInsert: { buyerId: tx.buyerId, date: tx.date, vendor: tx.vendor, amount: tx.amount, createdAt: tx.createdAt } },
          upsert: true,
        },
      }));
      const result = await db.collection("spendtransactions").bulkWrite(ops, { ordered: false });
      totalTransactions += result.upsertedCount;
      console.log(`  File ${i + 1}: ${result.upsertedCount} transactions upserted`);
    }
  }

  if (totalTransactions === 0) {
    const existingCount = await db.collection("spendtransactions").countDocuments({ buyerId });
    if (existingCount > 0) totalTransactions = existingCount;
    else { console.log("  No transactions ingested."); return { transactions: 0, totalSpend: 0 }; }
  }

  await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { spendDataIngested: true, lastSpendIngestAt: new Date(), updatedAt: new Date() } });

  // ─── STAGE 4: Aggregate ──────────────────────────────────────
  const [aggResult] = await db.collection("spendtransactions").aggregate([
    { $match: { buyerId } },
    { $facet: {
      totals: [{ $group: { _id: null, totalSpend: { $sum: "$amount" }, totalTransactions: { $sum: 1 }, earliest: { $min: "$date" }, latest: { $max: "$date" } } }],
      byCategory: [{ $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }],
      byVendor: [{ $group: { _id: "$vendorNormalized", vendor: { $first: "$vendor" }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 50 }],
      byMonth: [{ $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, total: { $sum: "$amount" } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }],
    } },
  ]).toArray();

  if (!aggResult) return { transactions: 0, totalSpend: 0 };

  const totals = aggResult.totals?.[0] ?? { totalSpend: 0, totalTransactions: 0, earliest: null, latest: null };
  const categoryBreakdown = (aggResult.byCategory as Array<{ _id: string; total: number; count: number }>).map((c) => ({ category: c._id ?? "Other", total: c.total, count: c.count }));
  const vendorBreakdown = (aggResult.byVendor as Array<{ _id: string; vendor: string; total: number; count: number }>).map((v) => ({ vendor: v.vendor ?? v._id, total: v.total, count: v.count }));
  const monthlyTotals = (aggResult.byMonth as Array<{ _id: { year: number; month: number }; total: number }>).map((m) => ({ year: m._id.year, month: m._id.month, total: m.total }));
  const csvFiles = await db.collection("spendtransactions").distinct("sourceFile", { buyerId });

  const now = new Date();
  await db.collection("spendsummaries").updateOne(
    { buyerId },
    { $set: { totalTransactions: totals.totalTransactions, totalSpend: totals.totalSpend, dateRange: { earliest: totals.earliest ?? undefined, latest: totals.latest ?? undefined }, categoryBreakdown, vendorBreakdown, monthlyTotals, csvFilesProcessed: csvFiles as string[], lastComputedAt: now, updatedAt: now }, $setOnInsert: { buyerId, createdAt: now } },
    { upsert: true }
  );

  await db.collection("buyers").updateOne({ _id: buyerId }, { $set: { spendDataAvailable: true, lastSpendIngestAt: now, updatedAt: now } });

  console.log(`  ✓ Spend: ${totals.totalTransactions} transactions, £${totals.totalSpend.toFixed(2)}`);
  return { transactions: totals.totalTransactions, totalSpend: totals.totalSpend };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: Enrichment score computation
// ═══════════════════════════════════════════════════════════════════════════

async function computeEnrichmentScore(
  db: ReturnType<MongoClient["db"]>,
  buyerId: ObjectId,
  buyer: Record<string, unknown>
): Promise<number> {
  const [personnelCount, docCount] = await Promise.all([
    db.collection("keypersonnel").countDocuments({ buyerId }),
    db.collection("boarddocuments").countDocuments({ buyerId }),
  ]);

  let score = 0;
  if (buyer.orgType) score += 12;
  if (buyer.website) score += 8;
  if (buyer.logoUrl) score += 5;
  if (buyer.linkedinUrl) score += 5;
  if (buyer.democracyPortalUrl) score += 8;
  if (buyer.boardPapersUrl) score += 8;
  if (buyer.description) score += 5;
  if (buyer.staffCount) score += 8;
  if (buyer.annualBudget) score += 8;
  score += (Math.min(personnelCount, 5) / 5) * 18;
  score += (Math.min(docCount, 10) / 10) * 15;

  return Math.round(score);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${SEP}`);
  console.log(`Unified Buyer Enrichment: "${BUYER_NAME}"`);
  console.log(SEP);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  try {
    const buyer = await db.collection("buyers").findOne({
      name: { $regex: `^${BUYER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!buyer) {
      console.error(`Buyer "${BUYER_NAME}" not found in database`);
      return;
    }

    const buyerId = buyer._id as ObjectId;
    console.log(`\nFound: ${buyer.name} (${buyerId})`);
    console.log(`  orgType: ${buyer.orgType || "—"}`);
    console.log(`  website: ${buyer.website || "—"}`);
    console.log(`  logoUrl: ${buyer.logoUrl || "—"}`);
    console.log(`  linkedinUrl: ${buyer.linkedinUrl || "—"}`);
    console.log(`  enrichmentScore: ${buyer.enrichmentScore ?? "—"}`);

    const results: Record<string, string> = {};

    // ─── STEP 1: Logo + LinkedIn ──────────────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 1: Logo + LinkedIn");
    console.log(SEP);
    try {
      const logoLinkedin = await enrichLogoLinkedin(buyer);
      const setFields: Record<string, unknown> = { updatedAt: new Date() };
      const addToSet: Record<string, unknown> = {};

      if (logoLinkedin.logoUrl && !buyer.logoUrl) setFields.logoUrl = logoLinkedin.logoUrl;
      if (logoLinkedin.linkedinUrl && !buyer.linkedinUrl) setFields.linkedinUrl = logoLinkedin.linkedinUrl;
      if (logoLinkedin.staffCount) setFields.staffCount = logoLinkedin.staffCount;
      if (logoLinkedin.description && !buyer.description) setFields.description = logoLinkedin.description;
      if (logoLinkedin.address && !buyer.address) setFields.address = logoLinkedin.address;
      if (logoLinkedin.industry && !buyer.industry) setFields.industry = logoLinkedin.industry;
      if (logoLinkedin.linkedin) setFields.linkedin = logoLinkedin.linkedin;
      if (logoLinkedin.linkedinUrl || logoLinkedin.logoUrl) addToSet.enrichmentSources = { $each: ["linkedin", "logo"] };

      if (Object.keys(setFields).length > 1) {
        const update: Record<string, unknown> = { $set: setFields };
        if (Object.keys(addToSet).length > 0) update.$addToSet = addToSet;
        await db.collection("buyers").updateOne({ _id: buyerId }, update);
      }

      results["Logo + LinkedIn"] = logoLinkedin.linkedinUrl ? "✓" : logoLinkedin.logoUrl ? "✓ logo only" : "○ skipped";
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["Logo + LinkedIn"] = "✗ error";
    }

    // ─── STEP 2: Governance URLs ──────────────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 2: Governance URLs");
    console.log(SEP);
    try {
      const governance = await enrichGovernanceUrls(db, buyer);
      const setFields: Record<string, unknown> = { updatedAt: new Date(), lastEnrichedAt: new Date() };
      if (governance.democracyPortalUrl && !buyer.democracyPortalUrl) setFields.democracyPortalUrl = governance.democracyPortalUrl;
      if (governance.democracyPlatform && !buyer.democracyPlatform) setFields.democracyPlatform = governance.democracyPlatform;
      if (governance.boardPapersUrl && !buyer.boardPapersUrl) setFields.boardPapersUrl = governance.boardPapersUrl;
      if (governance.website && !buyer.website) setFields.website = governance.website;

      if (Object.keys(setFields).length > 2) {
        await db.collection("buyers").updateOne({ _id: buyerId }, { $set: setFields, $addToSet: { enrichmentSources: "data_source" } });
      }

      // Merge into local buyer object for later steps
      if (governance.democracyPortalUrl) buyer.democracyPortalUrl = governance.democracyPortalUrl;
      if (governance.democracyPlatform) buyer.democracyPlatform = governance.democracyPlatform;

      results["Governance URLs"] = governance.democracyPortalUrl ? "✓" : "○ no data";
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["Governance URLs"] = "✗ error";
    }

    // ─── STEP 3: ModernGov Board Documents ────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 3: ModernGov Board Documents");
    console.log(SEP);
    try {
      const docCount = await enrichModernGov(
        db, buyerId, buyer.name as string,
        buyer.democracyPortalUrl as string | undefined,
        buyer.democracyPlatform as string | undefined
      );
      results["ModernGov"] = docCount > 0 ? `✓ ${docCount} docs` : "○ skipped";
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["ModernGov"] = "✗ error";
    }

    // ─── STEP 4: Key Personnel ────────────────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 4: Key Personnel");
    console.log(SEP);
    try {
      const personnelCount = await enrichKeyPersonnel(db, anthropic, buyerId, buyer);
      results["Key Personnel"] = personnelCount > 0 ? `✓ ${personnelCount} people` : "○ no data";
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["Key Personnel"] = "✗ error";
    }

    // ─── STEP 5: Spend Discovery + Ingest ─────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 5: Spend Discovery + Ingest");
    console.log(SEP);
    try {
      const spend = await runSpendIngest(db, anthropic, buyerId, buyer);
      results["Spend Ingest"] = spend.transactions > 0 ? `✓ ${spend.transactions} txns, £${spend.totalSpend.toFixed(2)}` : "○ no data";
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["Spend Ingest"] = "✗ error";
    }

    // ─── STEP 6: Enrichment Score ─────────────────────────────────
    console.log(`\n${SEP}`);
    console.log("STEP 6: Enrichment Score");
    console.log(SEP);
    try {
      // Re-read buyer to get latest state
      const freshBuyer = await db.collection("buyers").findOne({ _id: buyerId });
      if (freshBuyer) {
        const score = await computeEnrichmentScore(db, buyerId, freshBuyer);
        await db.collection("buyers").updateOne(
          { _id: buyerId },
          { $set: { enrichmentScore: score, enrichmentVersion: ((freshBuyer.enrichmentVersion as number) ?? 0) + 1, lastEnrichedAt: new Date(), updatedAt: new Date() } }
        );
        console.log(`  ✓ Enrichment score: ${score}/100`);
        results["Enrichment Score"] = `✓ ${score}/100`;
      }
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      results["Enrichment Score"] = "✗ error";
    }

    // ─── SUMMARY ──────────────────────────────────────────────────
    console.log(`\n${SEP}`);
    console.log("ENRICHMENT COMPLETE");
    console.log(SEP);
    console.log(`Buyer: ${buyer.name}`);
    for (const [step, status] of Object.entries(results)) {
      console.log(`  ${step}: ${status}`);
    }
    console.log("PIPELINE COMPLETE");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
