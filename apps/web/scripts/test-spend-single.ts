/**
 * Test script: Run spend-ingest pipeline for a single buyer.
 *
 * Runs all 4 stages (discover → extract links → download/parse → aggregate)
 * for one buyer, logging each step in detail.
 *
 * Uses the native MongoDB driver (same as the spend-ingest worker) and
 * the Anthropic API for Claude Haiku calls.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-spend-single.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-spend-single.ts "NHS England"
 */
import { MongoClient, ObjectId } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BUYER_NAME = process.argv[2] || "Ministry of Defence";
const MONGODB_URI = process.env.MONGODB_URI!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in env");
  process.exit(1);
}

const SEP = "═".repeat(60);
const DASH = "─".repeat(60);

// ---------------------------------------------------------------------------
// Helpers (inlined from worker to avoid import path issues)
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function parseDiscoveryResponse(
  text: string
): { transparencyUrl: string | null; csvLinks: string[]; confidence: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return {
      transparencyUrl: parsed.transparencyUrl ?? null,
      csvLinks: Array.isArray(parsed.csvLinks) ? parsed.csvLinks : [],
      confidence: parsed.confidence ?? "NONE",
    };
  } catch {
    return null;
  }
}

function parseLinkExtractionResponse(text: string): string[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.csvLinks)) {
      return parsed.csvLinks.filter(
        (link: unknown): link is string => typeof link === "string" && link.length > 0
      );
    }
    return [];
  } catch {
    return [];
  }
}

function resolveAndDedup(urls: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const resolved = new URL(url, baseUrl).href;
      if (
        (resolved.startsWith("http://") || resolved.startsWith("https://")) &&
        !seen.has(resolved)
      ) {
        seen.add(resolved);
        result.push(resolved);
      }
    } catch {
      // skip invalid
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pattern-based discovery (inlined from worker patterns/)
// ---------------------------------------------------------------------------

interface TransparencyUrlPattern {
  name: string;
  paths: string[];
  priority: number;
}

const PATTERN_REGISTRY: Record<string, TransparencyUrlPattern[]> = {
  local_council: [
    { name: "council_transparency_spending", priority: 1, paths: [
      "/council/transparency/spending", "/transparency/spending", "/about-the-council/transparency/spending-and-procurement",
      "/council-and-mayor/council-spending-and-performance/spending-over-500", "/council/council-spending-and-performance/spending-over-500",
      "/about-the-council/finance-and-budget/spending", "/about-the-council/finance-and-budget/spending/invoices-over-250",
      "/performance-and-spending/our-financial-plans/spending-over-500", "/your-council/performance-and-spending/our-financial-plans/spending-over-500",
    ] },
    { name: "council_payments", priority: 2, paths: [
      "/payments-over-500", "/spending-over-500", "/spending-over-250", "/payments-over-250",
      "/your-council/finance/payments-suppliers", "/about-the-council/budgets-and-spending/spending-and-payments",
      "/council-spending-and-performance", "/your-council/budgets-and-spending", "/about-us/what-we-spend",
    ] },
    { name: "council_open_data", priority: 3, paths: ["/open-data/spending", "/open-data/council-spending", "/opendata/spending", "/publication-scheme"] },
    { name: "council_transparency_generic", priority: 4, paths: ["/transparency", "/transparency-and-open-data", "/your-council/transparency", "/about-the-council/transparency"] },
  ],
  nhs_trust: [
    { name: "nhs_spending_25k", priority: 1, paths: [
      "/about-us/freedom-of-information/spending-over-25000", "/about-us/spending-over-25-000", "/about-us/spending-over-25000",
      "/about-us/information-governance/freedom-information/spending-over-25000",
      "/about-us/freedom-of-information/expenditure-over-25-000", "/about-us/freedom-of-information/expenditure-over-25000",
      "/spending-over-25k",
    ] },
    { name: "nhs_spending_money", priority: 2, paths: [
      "/about-us/how-we-spend-our-money", "/about-us/spending", "/about-us/our-spending",
      "/about-us/guide-information-publication-scheme/transparency-spending",
      "/about-us/key-documents/investing-money-in-your-care", "/about-us/corporate-publications/financial-transparency",
      "/what-we-spend", "/what-we-spend-and-how-we-spend-it",
    ] },
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
  fire_rescue: [{ name: "fire_transparency", priority: 1, paths: [
    "/about-us/transparency", "/transparency/spending", "/about-us/transparency/spending-over-500",
    "/your-service/transparency/what-we-spend", "/about-us/what-we-spend", "/about-us/what-we-spend/spend-over-ps500",
  ] }],
  police_pcc: [{ name: "police_spending", priority: 1, paths: ["/transparency/spending", "/about-us/what-we-spend", "/transparency/payments-over-500"] }],
  combined_authority: [{ name: "combined_authority_spending", priority: 1, paths: [
    "/transparency/spending", "/about-us/how-we-spend-public-money", "/about-us/transparency",
    "/about-us/democracy-funding-transparency/financial-information", "/what-we-do/budget-spending-transparency",
  ] }],
  university: [{ name: "university_spending", priority: 1, paths: ["/about/transparency", "/about-us/transparency", "/governance/transparency", "/about/spending"] }],
  fe_college: [{ name: "fe_spending", priority: 1, paths: ["/about-us/transparency", "/about/transparency", "/transparency"] }],
  mat: [{ name: "mat_spending", priority: 1, paths: ["/about-us/transparency", "/transparency", "/about/spending"] }],
  national_park: [{ name: "national_park_spending", priority: 1, paths: ["/about-us/transparency", "/transparency", "/about-us/spending"] }],
  alb: [{ name: "alb_spending", priority: 1, paths: ["/about-us/transparency", "/transparency/spending", "/about-us/spending", "/spending"] }],
};

const GOVUK_DEPT_SLUG_MAP: Record<string, string> = {
  "ministry of defence": "mod",
  "hm revenue & customs": "hmrc",
  "hm revenue and customs": "hmrc",
  "hm treasury": "hm-treasury",
  "home office": "home-office",
  "ministry of justice": "ministry-of-justice",
  "department for education": "department-for-education-dfe",
  "department of health and social care": "dhsc",
  "department for transport": "department-for-transport",
  "department for work and pensions": "dwp",
  "cabinet office": "cabinet-office",
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

const SPEND_KEYWORDS = [
  "spending", "expenditure", "transparency", "payments over",
  "spend over", "csv", ".csv", ".xls", "download",
  "freedom of information", "publication scheme",
  "invoices over", "payments to suppliers", "payment data",
  "spend data", "monthly spend", "financial transparency",
  "open government licence", "open data", "25,000", "£25", "£500", "procurement",
];

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
  const sidebarMatches =
    html.match(/<div[^>]*class="[^"]*(?:sidebar|side-nav|subnav)[^"]*"[\s\S]*?<\/div>/gi) ?? [];
  sections.push(...sidebarMatches);
  const combined = sections.join("\n");
  if (combined.length > 2000) return stripHtml(combined).slice(0, maxChars);
  return stripHtml(html).slice(0, maxChars);
}

function extractMainContent(html: string, maxChars = 30000): string {
  const mainMatches = html.match(/<main[\s\S]*?<\/main>/gi) ?? [];
  if (mainMatches.length > 0) {
    const content = stripHtml(mainMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }
  const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
  if (articleMatches.length > 0) {
    const content = stripHtml(articleMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }
  const contentDivMatches =
    html.match(/<div[^>]*(?:id="content"|class="[^"]*content[^"]*")[^>]*>[\s\S]*?<\/div>/gi) ?? [];
  if (contentDivMatches.length > 0) {
    const content = stripHtml(contentDivMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }
  return stripHtml(html).slice(0, maxChars);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
}

// Enhanced CSV patterns (12+)
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

const SPEND_ANCHOR_KEYWORDS = [
  "spending", "expenditure", "payments over", "spend over",
  "transparency", "csv", "download", "quarter", "monthly",
];

interface ScoredLink { url: string; score: number; matchedPatterns: string[]; anchorText?: string; }

function scoreLink(href: string, anchorText?: string): ScoredLink | null {
  let totalScore = 0;
  const matchedPatterns: string[] = [];
  for (const p of ALL_CSV_PATTERNS) {
    if (p.regex.test(href)) { totalScore += p.weight; matchedPatterns.push(p.name); }
  }
  if (matchedPatterns.length === 0) return null;
  if (anchorText) {
    const lower = anchorText.toLowerCase();
    for (const kw of SPEND_ANCHOR_KEYWORDS) {
      if (lower.includes(kw)) { totalScore += 3; break; }
    }
  }
  return { url: href, score: totalScore, matchedPatterns, anchorText };
}

function extractLinksEnhanced(html: string, baseUrl: string): ScoredLink[] {
  const decoded = decodeHtmlEntities(html);
  const scored: ScoredLink[] = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(decoded)) !== null) {
    const href = match[1];
    const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
    const result = scoreLink(href, anchorText);
    if (result) {
      try {
        const resolved = new URL(href, baseUrl).href;
        if ((resolved.startsWith("http://") || resolved.startsWith("https://")) && !seen.has(resolved)) {
          seen.add(resolved);
          scored.push({ ...result, url: resolved });
        }
      } catch { /* skip */ }
    }
  }

  const bareHrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  while ((match = bareHrefRegex.exec(decoded)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, baseUrl).href;
      if (seen.has(resolved)) continue;
      const result = scoreLink(href);
      if (result && (resolved.startsWith("http://") || resolved.startsWith("https://"))) {
        seen.add(resolved);
        scored.push({ ...result, url: resolved });
      }
    } catch { /* skip */ }
  }

  return scored.sort((a, b) => b.score - a.score);
}

function isValidDownloadLink(url: string): boolean {
  if (url.includes("docs.google.com") || url.includes("drive.google.com")) return true;
  try {
    const full = new URL(url).href.toLowerCase();
    return scoreLink(full) !== null;
  } catch { return false; }
}

function transformGoogleUrls(urls: string[]): string[] {
  const transformed: string[] = [];
  for (const url of urls) {
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      transformed.push(`https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`);
      continue;
    }
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      transformed.push(`https://drive.google.com/uc?export=download&id=${driveMatch[1]}`);
      continue;
    }
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpenMatch) {
      transformed.push(`https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`);
      continue;
    }
    transformed.push(url);
  }
  return transformed;
}

function extractGoogleLinks(html: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const sheetsRegex = /href\s*=\s*["'](https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = sheetsRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); links.push(m[1]); }
  }
  const driveRegex = /href\s*=\s*["'](https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  while ((m = driveRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); links.push(m[1]); }
  }
  const driveOpenRegex = /href\s*=\s*["'](https?:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+[^"']*?)["']/gi;
  while ((m = driveOpenRegex.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); links.push(m[1]); }
  }
  return links;
}

async function tryDataGovUkSearch(
  buyerName: string
): Promise<{ url: string; csvLinks: string[] } | null> {
  const cleanName = buyerName
    .replace(/[,()]/g, " ")
    .replace(/\b(the|of|and|for)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const query = encodeURIComponent(`${cleanName} spend 25k`);
  const searchUrl = `https://www.data.gov.uk/search?q=${query}`;
  console.log(`\nSearching data.gov.uk: ${searchUrl}`);

  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "TendHunt-SpendBot/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;

    const html = await res.text();
    const datasetRegex = /href="(\/dataset\/[^"]+)"[^>]*>([^<]+)/g;
    const datasets: { url: string; title: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = datasetRegex.exec(html)) !== null && datasets.length < 5) {
      datasets.push({ url: `https://www.data.gov.uk${m[1]}`, title: m[2].trim() });
    }
    if (datasets.length === 0) { console.log("  No datasets found on data.gov.uk"); return null; }
    console.log(`  Found ${datasets.length} candidate datasets`);

    const nameWords = buyerName
      .toLowerCase()
      .replace(/[,()]/g, " ")
      .replace(/\b(nhs|icb|the|of|and|for)\b/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const threshold = Math.max(1, Math.ceil(nameWords.length * 0.5));
    console.log(`  Name keywords: ${nameWords.join(", ")} (threshold: ${threshold})`);

    for (const dataset of datasets) {
      const titleLower = dataset.title.toLowerCase();
      const matchCount = nameWords.filter((w) => titleLower.includes(w)).length;
      console.log(`  Dataset: "${dataset.title}" — ${matchCount}/${nameWords.length} keywords match (need ${threshold})`);
      if (matchCount < threshold) continue;

      console.log(`  Checking dataset: ${dataset.url}`);
      try {
        const datasetRes = await fetch(dataset.url, {
          headers: { "User-Agent": "TendHunt-SpendBot/1.0" },
          redirect: "follow",
        });
        if (!datasetRes.ok) continue;
        const datasetHtml = await datasetRes.text();
        const csvRegex = /href="(https?:\/\/[^"]+\.csv[^"]*)"/gi;
        const csvLinks: string[] = [];
        const seen = new Set<string>();
        while ((m = csvRegex.exec(datasetHtml)) !== null) {
          const link = m[1];
          if (!seen.has(link)) { seen.add(link); csvLinks.push(link); }
        }
        if (csvLinks.length > 0) return { url: dataset.url, csvLinks };
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return null;
}

// GOV.UK buyer filtering
const DEPT_ABBREVIATION_MAP: Record<string, string[]> = {
  "ministry of defence": ["mod", "ministry-of-defence", "defence"],
  "hm revenue": ["hmrc", "hm-revenue", "revenue-customs"],
  "hm treasury": ["hmt", "hm-treasury", "treasury"],
  "home office": ["home-office"],
  "ministry of justice": ["moj", "ministry-of-justice", "justice"],
  "department for education": ["dfe", "department-for-education", "education"],
  "department of health": ["dhsc", "department-of-health", "health-social-care"],
  "department for transport": ["dft", "department-for-transport", "transport"],
  "department for work": ["dwp", "department-for-work", "work-pensions"],
  "department for environment": ["defra", "department-for-environment", "environment-food"],
  "department for business": ["dbt", "department-for-business", "business-trade"],
  "foreign commonwealth": ["fcdo", "foreign-commonwealth"],
  "cabinet office": ["cabinet-office"],
  "hm courts": ["hmcts", "hm-courts", "courts-tribunals"],
  "nhs england": ["nhs-england", "nhse"],
};

function filterLinksToBuyer(links: string[], buyerName: string): string[] {
  const nameLower = buyerName.toLowerCase();
  const keywords: string[] = [];
  const slug = nameLower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  keywords.push(slug);
  const skipWords = new Set(["the", "of", "and", "for", "in", "hm", "her", "his", "majesty"]);
  for (const word of nameLower.split(/\s+/)) {
    if (word.length > 2 && !skipWords.has(word)) keywords.push(word);
  }
  for (const [pattern, abbrs] of Object.entries(DEPT_ABBREVIATION_MAP)) {
    if (nameLower.includes(pattern)) { keywords.push(...abbrs); break; }
  }
  const filtered = links.filter((url) => {
    const urlLower = url.toLowerCase();
    return keywords.some((kw) => urlLower.includes(kw));
  });
  return filtered.length === 0 ? links : filtered;
}

// GOV.UK publication page following
async function followGovukPublicationPages(csvLinks: string[]): Promise<string[]> {
  const pubUrls = csvLinks.filter((u) => u.includes("/government/publications/"));
  const nonPubUrls = csvLinks.filter((u) => !u.includes("/government/publications/"));
  if (pubUrls.length === 0) return csvLinks;

  console.log(`  Following ${pubUrls.length} GOV.UK publication pages...`);
  const downloads: string[] = [];
  for (const pubUrl of pubUrls.slice(0, 24)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(pubUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)" },
      });
      clearTimeout(timeout);
      if (!response.ok) continue;

      const html = await response.text();
      const decoded = decodeHtmlEntities(html);
      const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;
      while ((match = hrefRegex.exec(decoded)) !== null) {
        const href = match[1];
        if (href.includes("assets.publishing.service.gov.uk/media/") || href.includes("/government/uploads/")) {
          try {
            const resolved = new URL(href, pubUrl).href;
            if (resolved.startsWith("http")) downloads.push(resolved);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.warn(`  Failed to follow ${pubUrl}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const all = Array.from(new Set([...nonPubUrls, ...downloads]));
  console.log(`  Resolved ${downloads.length} download URLs from publication pages`);
  return all;
}

// ODS/XLSX parsing via SheetJS
function parseSpreadsheet(buffer: ArrayBuffer): { data: Record<string, string>[]; fields: string[] } {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { data: [], fields: [] };
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: "" });
  if (rows.length === 0) return { data: [], fields: [] };
  return { data: rows, fields: Object.keys(rows[0]) };
}

type FileFormat = "csv" | "ods" | "xlsx" | "unknown";
function detectFileFormat(contentType: string, url: string): FileFormat {
  const ct = contentType.toLowerCase();
  if (ct.includes("text/csv") || ct.includes("application/csv")) return "csv";
  if (ct.includes("application/vnd.oasis.opendocument.spreadsheet")) return "ods";
  if (ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml")) return "xlsx";
  const pathPart = url.toLowerCase().split("?")[0];
  if (pathPart.endsWith(".csv")) return "csv";
  if (pathPart.endsWith(".ods")) return "ods";
  if (pathPart.endsWith(".xlsx") || pathPart.endsWith(".xls")) return "xlsx";
  if (ct.includes("text/plain")) return "csv";
  if (ct.includes("application/octet-stream") || ct.includes("application/vnd")) {
    if (url.toLowerCase().includes(".ods")) return "ods";
    if (url.toLowerCase().includes(".xls")) return "xlsx";
  }
  return "unknown";
}

// Known schema matching (inlined from worker)
interface KnownSchema {
  name: string;
  detect: (headers: string[]) => boolean;
  map: Record<string, string | undefined>;
}
function hasHeaders(headers: string[], required: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return required.every((r) => lower.some((h) => h.includes(r.toLowerCase())));
}
const KNOWN_SCHEMAS: KnownSchema[] = [
  {
    name: "govuk_mod_spending_25k",
    detect: (headers) => hasHeaders(headers, ["expense type", "expense area", "supplier name", "transaction number", "payment date"]),
    map: { date: "Payment Date", amount: "Total", vendor: "Supplier Name", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" },
  },
  {
    name: "govuk_nhs_spending_25k",
    detect: (headers) => hasHeaders(headers, ["expense type", "expense area", "supplier", "transaction number", "ap amount"]),
    map: { date: "Date", amount: "AP Amount", vendor: "Supplier", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" },
  },
  {
    name: "nhs_icb_spending_25k",
    detect: (headers) => hasHeaders(headers, ["expense type", "expense area", "supplier", "transaction number", "ap amount"]),
    map: { date: "Date", amount: "AP Amount", vendor: "Supplier", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" },
  },
  {
    name: "govuk_spending_25k",
    detect: (headers) => hasHeaders(headers, ["expense type", "expense area", "supplier", "transaction number"]),
    map: { date: "Date", amount: "Amount", vendor: "Supplier", category: "Expense Type", subcategory: "Expense Area", department: "Entity", reference: "Transaction Number" },
  },
  {
    name: "devon_pattern",
    detect: (headers) => hasHeaders(headers, ["expense area", "expense type", "supplier name"]),
    map: { date: "Date", amount: "Amount", vendor: "Supplier Name", category: "Expense Type", subcategory: "Expense Area" },
  },
];

// Simple CSV parser (avoids papaparse dependency in root)
function parseCSV(text: string): { data: Record<string, string>[]; fields: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { data: [], fields: [] };

  // Parse header
  const fields = parseCSVLine(lines[0]);
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < fields.length; j++) {
      row[fields[j]] = values[j] ?? "";
    }
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
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// Normalization helpers (simplified versions from worker)
const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
function parseFlexibleDate(s: string): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  // Try DD/MM/YYYY first (UK format — must come before new Date() which uses US format)
  const ukMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (ukMatch) {
    const day = parseInt(ukMatch[1]);
    const month = parseInt(ukMatch[2]) - 1;
    let year = parseInt(ukMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  // Try DD-Mon-YY / DD-Mon-YYYY (e.g., 21-Jan-25)
  const monMatch = trimmed.match(/^(\d{1,2})[\/\-.]([A-Za-z]{3})[\/\-.](\d{2,4})$/);
  if (monMatch) {
    const day = parseInt(monMatch[1]);
    const monthIdx = MONTH_MAP[monMatch[2].toLowerCase()];
    if (monthIdx !== undefined) {
      let year = parseInt(monMatch[3]);
      if (year < 100) year += 2000;
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  // Try ISO / general Date parse as fallback
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
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|inc|llp|llc|corp|uk)\b\.?/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n${SEP}`);
  console.log(`Spend Ingest Test: "${BUYER_NAME}"`);
  console.log(SEP);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  try {
    // Find the buyer
    const buyer = await db.collection("buyers").findOne({
      name: { $regex: `^${BUYER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!buyer) {
      console.error(`Buyer "${BUYER_NAME}" not found in database`);
      return;
    }

    console.log(`\nFound: ${buyer.name} (${buyer._id})`);
    console.log(`  orgType: ${buyer.orgType || "—"}`);
    console.log(`  website: ${buyer.website || "—"}`);
    console.log(`  transparencyPageUrl: ${buyer.transparencyPageUrl || "—"}`);
    console.log(`  csvLinks: ${buyer.csvLinks?.length ?? 0} links`);
    console.log(`  spendDataIngested: ${buyer.spendDataIngested ?? false}`);
    console.log(`  spendDataAvailable: ${buyer.spendDataAvailable ?? false}`);

    const buyerId = buyer._id as ObjectId;

    // ─── STAGE 1: Discover Transparency Page ───────────────────────

    console.log(`\n${SEP}`);
    console.log("STAGE 1: Discover Transparency Page");
    console.log(SEP);

    let transparencyUrl = buyer.transparencyPageUrl as string | undefined;

    if (transparencyUrl && transparencyUrl !== "none") {
      console.log(`Already has transparencyPageUrl: ${transparencyUrl}`);
    } else if (!buyer.website) {
      console.log("No website — trying data.gov.uk search as fallback...");
      const dataGovResult = await tryDataGovUkSearch(buyer.name as string);
      if (dataGovResult) {
        console.log(`data.gov.uk match: ${dataGovResult.url}`);
        console.log(`CSV links: ${dataGovResult.csvLinks.length}`);
        dataGovResult.csvLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
        await db.collection("buyers").updateOne(
          { _id: buyerId },
          { $set: {
            transparencyPageUrl: dataGovResult.url,
            csvLinks: dataGovResult.csvLinks,
            discoveryMethod: "data_gov_uk",
            updatedAt: new Date(),
          } }
        );
        transparencyUrl = dataGovResult.url;
        // csvLinks written to DB — Stage 2 reads from DB
      } else {
        console.log("data.gov.uk also found nothing. Stopping.");
        return;
      }
    } else {
      const websiteUrl = buyer.website as string;
      let discoveryMethod = "none";

      // ─── GOV.UK DEPT-SPECIFIC ─────────────────────────────────────
      const deptPaths = getGovukDeptPaths(buyer.name as string);
      if (deptPaths.length > 0) {
        console.log(`GOV.UK dept-specific: trying ${deptPaths.length} paths for "${buyer.name}"...`);
        for (const path of deptPaths) {
          let candidateUrl: string;
          try { candidateUrl = new URL(path, "https://www.gov.uk").href; } catch { continue; }
          process.stdout.write(`  dept: ${candidateUrl} ... `);
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(candidateUrl, {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)" },
            });
            clearTimeout(timeout);
            if (!response.ok) { console.log(`${response.status}`); continue; }
            const ct = response.headers.get("content-type") ?? "";
            if (!ct.includes("text/html") && !ct.includes("application/xhtml")) { console.log(`non-HTML (${ct})`); continue; }
            const html = await response.text();
            const hasKeywords = containsSpendKeywords(html);
            console.log(`${html.length} chars, keywords=${hasKeywords}`);
            if (hasKeywords) {
              transparencyUrl = candidateUrl;
              discoveryMethod = "pattern_match";
              const csvLinksFromDept = extractLinksEnhanced(html, candidateUrl).map((s) => s.url);
              console.log(`\n  ✓ DEPT MATCH: ${candidateUrl}`);
              console.log(`  CSV links found: ${csvLinksFromDept.length}`);
              csvLinksFromDept.slice(0, 5).forEach((l, i) => console.log(`    ${i + 1}. ${l}`));
              if (csvLinksFromDept.length > 5) console.log(`    ... and ${csvLinksFromDept.length - 5} more`);
              await db.collection("buyers").updateOne(
                { _id: buyerId },
                { $set: { transparencyPageUrl: transparencyUrl, discoveryMethod, ...(csvLinksFromDept.length > 0 ? { csvLinks: csvLinksFromDept } : {}), updatedAt: new Date() } }
              );
              break;
            }
          } catch (err) { console.log(`error: ${err instanceof Error ? err.message : String(err)}`); }
        }
      }

      // ─── PATTERN PHASE ───────────────────────────────────────────
      const patterns = getPatternsForOrgType(buyer.orgType as string | undefined);
      console.log(`orgType: ${buyer.orgType ?? "unknown"} → ${patterns.length} pattern groups`);

      if (discoveryMethod !== "pattern_match" && patterns.length > 0) {
        const sorted = [...patterns].sort((a, b) => a.priority - b.priority);
        console.log(`Trying ${sorted.reduce((n, p) => n + p.paths.length, 0)} candidate URLs...`);

        for (const pattern of sorted) {
          for (const path of pattern.paths) {
            let candidateUrl: string;
            try {
              candidateUrl = new URL(path, websiteUrl).href;
            } catch { continue; }

            process.stdout.write(`  ${pattern.name}: ${candidateUrl} ... `);

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000);
              const response = await fetch(candidateUrl, {
                signal: controller.signal,
                headers: { "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)" },
              });
              clearTimeout(timeout);

              if (!response.ok) {
                console.log(`${response.status}`);
                continue;
              }

              const ct = response.headers.get("content-type") ?? "";
              if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
                console.log(`non-HTML (${ct})`);
                continue;
              }

              const html = await response.text();
              const hasKeywords = containsSpendKeywords(html);
              console.log(`${html.length} chars, keywords=${hasKeywords}`);

              if (hasKeywords) {
                transparencyUrl = candidateUrl;
                discoveryMethod = "pattern_match";

                // Extract CSV links from validated page
                let csvLinksFromPattern = extractLinksEnhanced(html, candidateUrl)
                  .map((s) => s.url);

                // Filter to buyer's department for GOV.UK collection pages
                if (candidateUrl.includes("gov.uk/government/")) {
                  const beforeCount = csvLinksFromPattern.length;
                  csvLinksFromPattern = filterLinksToBuyer(csvLinksFromPattern, buyer.name as string);
                  console.log(`\n  Filtered ${beforeCount} → ${csvLinksFromPattern.length} links for "${buyer.name}"`);
                }

                console.log(`\n  ✓ PATTERN MATCH: ${pattern.name}`);
                console.log(`  Transparency URL: ${transparencyUrl}`);
                console.log(`  CSV links found: ${csvLinksFromPattern.length}`);
                csvLinksFromPattern.forEach((l, i) => console.log(`    ${i + 1}. ${l}`));

                await db.collection("buyers").updateOne(
                  { _id: buyerId },
                  {
                    $set: {
                      transparencyPageUrl: transparencyUrl,
                      discoveryMethod,
                      ...(csvLinksFromPattern.length > 0 ? { csvLinks: csvLinksFromPattern } : {}),
                      updatedAt: new Date(),
                    },
                  }
                );
                break;
              }
            } catch (err) {
              console.log(`error: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          if (discoveryMethod === "pattern_match") break;
        }
      }

      // ─── AI FALLBACK ─────────────────────────────────────────────
      if (discoveryMethod !== "pattern_match") {
        console.log(`\nNo pattern match. Falling back to AI discovery...`);
        console.log(`Fetching homepage: ${websiteUrl}`);

        let html: string;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(websiteUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)" },
          });
          clearTimeout(timeout);

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          html = await response.text();
          console.log(`Fetched ${html.length} chars`);
        } catch (err) {
          console.error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
          console.log("Marking as 'none' and stopping.");
          await db.collection("buyers").updateOne(
            { _id: buyerId },
            { $set: { transparencyPageUrl: "none", discoveryMethod: "none", updatedAt: new Date() } }
          );
          return;
        }

        // Smart content extraction: try nav/footer first, fall back to main content
        const navFooterHtml = extractNavAndFooter(html, 15000);
        const hasSpendInNav = containsSpendKeywords(navFooterHtml);
        const hasSpendInBody = containsSpendKeywords(html);

        let extractedHtml: string;
        if (hasSpendInNav) {
          extractedHtml = navFooterHtml;
          console.log(`Extracted ${extractedHtml.length} chars (nav/footer — has spend keywords)`);
        } else if (hasSpendInBody) {
          const mainContent = extractMainContent(html, 20000);
          extractedHtml = navFooterHtml.slice(0, 10000) + "\n<!-- main content -->\n" + mainContent;
          extractedHtml = extractedHtml.slice(0, 30000);
          console.log(`Extracted ${extractedHtml.length} chars (nav/footer + main content — spend keywords in body)`);
        } else {
          const mainContent = extractMainContent(html, 15000);
          extractedHtml = navFooterHtml.slice(0, 10000) + "\n" + mainContent;
          extractedHtml = extractedHtml.slice(0, 30000);
          console.log(`Extracted ${extractedHtml.length} chars (combined — no spend keywords found)`);
        }

        console.log("Calling Claude Haiku for transparency page analysis...");
        const aiResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `You are analyzing a UK public sector website to find their spending/transparency data page.

Organization: ${buyer.name}
Website: ${websiteUrl}
Organization type: ${buyer.orgType ?? "unknown"}

HTML content (navigation + main body):
<html>${extractedHtml}</html>

Find links to pages about:
1. Spending data, transparency reports, payments over £500/£25,000
2. "Publication scheme", "What we spend", "Financial transparency"
3. Direct CSV/Excel file download links for spending/payment data
4. External open data portals (data.gov.uk, etc.)

IMPORTANT: UK public sector sites often use deep CMS paths like:
- /about-the-council/finance-and-budget/spending
- /your-council/budgets-and-spending
- /about-us/freedom-of-information/spending-over-25000
- /council-and-mayor/council-spending-and-performance
- /performance-and-spending/our-financial-plans

Look for ANY link containing words like: spending, transparency, payments, expenditure, invoices, financial, budget, procurement, open data.

Return ONLY valid JSON (no markdown):
{
  "transparencyUrl": "full URL to spending/transparency page, or null if not found",
  "csvLinks": ["array of direct CSV/XLS download URLs found, empty if none"],
  "confidence": "HIGH|MEDIUM|LOW|NONE"
}`,
            },
          ],
        });

        const responseText =
          aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
        console.log(`\nClaude response:\n${responseText}`);

        const parsed = parseDiscoveryResponse(responseText);

        if (!parsed || parsed.confidence === "NONE" || !parsed.transparencyUrl) {
          console.log("AI found nothing. Trying data.gov.uk search...");
          const dataGovResult = await tryDataGovUkSearch(buyer.name);
          if (dataGovResult) {
            console.log(`data.gov.uk match: ${dataGovResult.url}`);
            console.log(`CSV links: ${dataGovResult.csvLinks.length}`);
            dataGovResult.csvLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
            await db.collection("buyers").updateOne(
              { _id: buyerId },
              { $set: {
                transparencyPageUrl: dataGovResult.url,
                csvLinks: dataGovResult.csvLinks,
                discoveryMethod: "data_gov_uk",
                updatedAt: new Date(),
              } }
            );
            transparencyUrl = dataGovResult.url;
            csvLinks = dataGovResult.csvLinks;
            discoveryMethod = "data_gov_uk";
          } else {
            console.log("No transparency page found. Marking as 'none'.");
            await db.collection("buyers").updateOne(
              { _id: buyerId },
              { $set: { transparencyPageUrl: "none", discoveryMethod: "none", updatedAt: new Date() } }
            );
            return;
          }
        }

        try {
          transparencyUrl = new URL(parsed.transparencyUrl, websiteUrl).href;
        } catch {
          transparencyUrl = parsed.transparencyUrl;
        }

        const validCsvLinks = parsed.csvLinks
          .map((link) => { try { return new URL(link, websiteUrl).href; } catch { return null; } })
          .filter((link): link is string =>
            link !== null && (link.startsWith("http://") || link.startsWith("https://"))
          );

        discoveryMethod = "ai_discovery";

        console.log(`\nDiscovered transparency URL: ${transparencyUrl}`);
        console.log(`Discovery method: ${discoveryMethod}`);
        console.log(`Direct CSV links found: ${validCsvLinks.length}`);
        validCsvLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));

        await db.collection("buyers").updateOne(
          { _id: buyerId },
          {
            $set: {
              transparencyPageUrl: transparencyUrl,
              discoveryMethod,
              ...(validCsvLinks.length > 0 ? { csvLinks: validCsvLinks } : {}),
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // ─── STAGE 2: Extract CSV Links ────────────────────────────────

    console.log(`\n${SEP}`);
    console.log("STAGE 2: Extract CSV Links");
    console.log(SEP);

    if (!transparencyUrl || transparencyUrl === "none") {
      console.log("No transparency URL — skipping link extraction.");
      return;
    }

    // Re-read buyer to get any csvLinks from stage 1
    const buyerAfterS1 = await db.collection("buyers").findOne({ _id: buyerId });
    let csvLinks = (buyerAfterS1?.csvLinks as string[]) ?? [];

    // Follow GOV.UK publication pages → resolve to actual download URLs
    const hasPublicationUrls = csvLinks.some((u) => u.includes("/government/publications/"));
    if (hasPublicationUrls) {
      csvLinks = await followGovukPublicationPages(csvLinks);
    }

    // Filter resolved download URLs to this buyer's department
    if (transparencyUrl?.includes("gov.uk/government/")) {
      const beforeCount = csvLinks.length;
      csvLinks = filterLinksToBuyer(csvLinks, buyer.name as string);
      console.log(`Filtered ${beforeCount} → ${csvLinks.length} links for "${buyer.name}"`);
      // Update buyer with filtered links
      await db.collection("buyers").updateOne(
        { _id: buyerId },
        { $set: { csvLinks, updatedAt: new Date() } }
      );
    }

    if (buyerAfterS1?.csvLinksExtracted) {
      console.log(`Already extracted: ${csvLinks.length} links`);
    } else {
      console.log(`Fetching transparency page: ${transparencyUrl}`);

      let html: string;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(transparencyUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
        console.log(`Fetched ${html.length} chars`);
      } catch (err) {
        console.error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        console.log("Marking as extracted with existing links.");
        await db.collection("buyers").updateOne(
          { _id: buyerId },
          { $set: { csvLinksExtracted: true, updatedAt: new Date() } }
        );
        if (csvLinks.length === 0) return;
      }

      // Pass 1: Enhanced regex extraction (12+ patterns with scoring)
      const scoredLinks = extractLinksEnhanced(html!, transparencyUrl);
      const regexLinks = scoredLinks.map((s) => s.url);
      console.log(`Enhanced regex found ${regexLinks.length} links`);
      if (scoredLinks.length > 0) {
        console.log("Top scored links:");
        scoredLinks.slice(0, 10).forEach((s, i) =>
          console.log(`  ${i + 1}. [${s.score}] ${s.matchedPatterns.join(",")} → ${s.url.slice(0, 80)}${s.anchorText ? ` (${s.anchorText.slice(0, 30)})` : ""}`)
        );
      }

      // Pass 2: Claude Haiku if enhanced regex found < 3
      let aiLinks: string[] = [];
      if (regexLinks.length < 3) {
        console.log("Enhanced regex found < 3 links, using Claude Haiku fallback...");

        const strippedHtml = stripHtml(html!).slice(0, 15000);

        const aiResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are extracting CSV/Excel download links from a UK public sector transparency page.

Organization: ${buyer.name}
Page URL: ${transparencyUrl}

HTML:
<html>${strippedHtml}</html>

Find ALL download links for spending/payment CSV or Excel files. These are typically monthly or quarterly reports titled like "Payments over 500 - January 2024" or "Expenditure 2023-24 Q1".

Return ONLY valid JSON:
{
  "csvLinks": ["array of full download URLs"]
}`,
            },
          ],
        });

        const responseText =
          aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
        console.log(`\nClaude link extraction response:\n${responseText.slice(0, 500)}`);

        aiLinks = parseLinkExtractionResponse(responseText);
        if (aiLinks.length > 0) {
          aiLinks = resolveAndDedup(aiLinks, transparencyUrl);
        }
        console.log(`AI found ${aiLinks.length} additional links`);
      }

      // Extract Google Sheets/Drive links
      const googleLinks = extractGoogleLinks(html!);
      if (googleLinks.length > 0) {
        console.log(`\nGoogle Sheets/Drive links found: ${googleLinks.length}`);
        googleLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
      }
      const transformedGoogle = transformGoogleUrls(googleLinks);

      // Merge all links
      const allLinks = Array.from(new Set([...csvLinks, ...regexLinks, ...aiLinks, ...transformedGoogle]));

      // Transform any remaining Google URLs
      const transformedAll = transformGoogleUrls(allLinks);

      // Filter: keep only valid download links (enhanced check)
      csvLinks = transformedAll.filter(isValidDownloadLink);

      console.log(`\nTotal CSV links after merge + filter: ${csvLinks.length}`);
      csvLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));

      await db.collection("buyers").updateOne(
        { _id: buyerId },
        { $set: { csvLinks, csvLinksExtracted: true, updatedAt: new Date() } }
      );
    }

    if (csvLinks.length === 0) {
      console.log("\nNo CSV links found. Pipeline complete (no spend data).");
      return;
    }

    // ─── STAGE 3: Download & Parse Files ───────────────────────────

    console.log(`\n${SEP}`);
    console.log("STAGE 3: Download & Parse Files (CSV/ODS/XLSX)");
    console.log(SEP);

    let totalTransactions = 0;
    const MAX_FILES = 3; // Limit for testing
    const MAX_TRANSACTIONS = 500;

    for (let i = 0; i < Math.min(csvLinks.length, MAX_FILES); i++) {
      const csvUrl = csvLinks[i];
      console.log(`\n${DASH}`);
      console.log(`File ${i + 1}/${Math.min(csvLinks.length, MAX_FILES)}: ${csvUrl}`);
      console.log(DASH);

      // Check if already processed
      const existing = await db
        .collection("spendtransactions")
        .findOne({ buyerId, sourceFile: csvUrl });
      if (existing) {
        console.log("Already processed — skipping.");
        continue;
      }

      // Download and parse
      let parsedData: Record<string, string>[];
      let headers: string[];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(csvUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TendHunt/1.0; test-script)",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get("content-type") ?? "";
        const format = detectFileFormat(contentType, csvUrl);
        console.log(`Content-Type: ${contentType} → format: ${format}`);

        if (format === "ods" || format === "xlsx") {
          const buffer = await response.arrayBuffer();
          const result = parseSpreadsheet(buffer);
          parsedData = result.data;
          headers = result.fields;
          console.log(`Parsed ${format.toUpperCase()}: ${parsedData.length} rows, ${headers.length} cols`);
        } else if (format === "csv" || format === "unknown") {
          if (contentType.includes("text/html")) {
            console.warn("HTML content — skipping.");
            continue;
          }
          const csvText = await response.text();
          console.log(`Downloaded ${csvText.length} chars`);
          const parseResult = parseCSV(csvText);
          parsedData = parseResult.data;
          headers = parseResult.fields;
          console.log(`Parsed CSV: ${parsedData.length} rows`);
        } else {
          console.warn(`Unsupported format "${format}" — skipping.`);
          continue;
        }
      } catch (err) {
        console.warn(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      if (parsedData.length === 0) {
        console.log("No data rows — skipping.");
        continue;
      }

      console.log(`Headers: ${headers.join(", ")}`);

      const sampleRows = parsedData
        .slice(0, 3)
        .map((row) => headers.map((h) => row[h] ?? ""));

      console.log("Sample rows:");
      sampleRows.forEach((r) => console.log(`  ${r.join(" | ")}`));

      // Column mapping: try known schemas first, then heuristic, then AI
      let columnMapping: Record<string, string | undefined> | null = null;

      // 1. Known schema matching
      for (const schema of KNOWN_SCHEMAS) {
        if (schema.detect(headers)) {
          columnMapping = schema.map;
          console.log(`Known schema matched: "${schema.name}"`);
          break;
        }
      }

      // 2. Heuristic matching
      if (!columnMapping) {
        const headerLower = headers.map((h) => h.toLowerCase());
        const dateCol = headers.find((_, i) =>
          /date|payment.?date|trans.?date/.test(headerLower[i])
        );
        const amountCol = headers.find((_, i) =>
          /amount|value|total|net|gross|sum/.test(headerLower[i])
        );
        const vendorCol = headers.find((_, i) =>
          /vendor|supplier|payee|beneficiary|company|merchant/.test(headerLower[i])
        );

        if (dateCol && amountCol && vendorCol) {
          columnMapping = { date: dateCol, amount: amountCol, vendor: vendorCol };
          const catCol = headers.find((_, i) =>
            /category|service|type|description|purpose|expense.?type/.test(headerLower[i])
          );
          if (catCol) columnMapping.category = catCol;
          console.log(`Heuristic mapping: date=${dateCol}, amount=${amountCol}, vendor=${vendorCol}`);
        }
      }

      // 3. AI fallback
      if (!columnMapping) {
        console.log("No schema/heuristic match, calling Claude Haiku...");
        const aiResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `Map these CSV columns to a unified spending data schema.

CSV headers: ${headers.join(", ")}
Sample rows:
${sampleRows.slice(0, 3).map((r) => r.join(" | ")).join("\n")}

Map to these fields (use the exact CSV column name, or null if not found):
- date: column containing the payment/transaction date
- amount: column containing the payment amount in GBP
- vendor: column containing the supplier/payee name
- category: column with spend category or service area (or null)

Return ONLY valid JSON:
{ "date": "column_name", "amount": "column_name", "vendor": "column_name", "category": "column_name_or_null" }`,
            },
          ],
        });

        const respText =
          aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
        console.log(`Claude mapping response: ${respText}`);

        try {
          const m = respText.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            if (parsed.date && parsed.amount && parsed.vendor) {
              columnMapping = parsed;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!columnMapping) {
        console.warn("Could not map columns — skipping.");
        continue;
      }

      // Parse transactions
      interface TxDoc {
        buyerId: ObjectId;
        date: Date;
        amount: number;
        vendor: string;
        vendorNormalized: string;
        category: string;
        subcategory?: string;
        department?: string;
        reference?: string;
        sourceFile: string;
        createdAt: Date;
        updatedAt: Date;
      }

      const transactions: TxDoc[] = [];
      let skipped = 0;

      // Case-insensitive row lookup (CSV headers have inconsistent casing)
      const getCol = (row: Record<string, string>, col: string | undefined): string => {
        if (!col) return "";
        if (row[col] !== undefined) return row[col];
        const colLower = col.toLowerCase();
        for (const key of Object.keys(row)) {
          if (key.toLowerCase() === colLower) return row[key];
        }
        return "";
      };

      for (const row of parsedData) {
        if (transactions.length >= MAX_TRANSACTIONS) break;

        const dateStr = getCol(row, columnMapping.date);
        const amountStr = getCol(row, columnMapping.amount);
        const vendorStr = getCol(row, columnMapping.vendor);
        const categoryStr = getCol(row, columnMapping.category);

        const date = parseFlexibleDate(dateStr);
        const amount = parseAmount(amountStr);
        const vendor = vendorStr.trim();

        if (!date || amount === 0 || !vendor) {
          skipped++;
          continue;
        }

        const now = new Date();
        transactions.push({
          buyerId,
          date,
          amount,
          vendor,
          vendorNormalized: normalizeVendor(vendor),
          category: categoryStr || "Other",
          subcategory: getCol(row, columnMapping.subcategory) || undefined,
          department: getCol(row, columnMapping.department) || undefined,
          reference: getCol(row, columnMapping.reference) || undefined,
          sourceFile: csvUrl,
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log(`\nParsed ${transactions.length} valid transactions (${skipped} skipped)`);

      if (transactions.length > 0) {
        // Show sample
        console.log("\nSample transactions:");
        transactions.slice(0, 5).forEach((tx, i) => {
          console.log(
            `  ${i + 1}. ${tx.date.toISOString().slice(0, 10)} | £${tx.amount.toFixed(2)} | ${tx.vendor.slice(0, 40)} | ${tx.category}`
          );
        });

        // Bulk upsert
        const ops = transactions.map((tx) => ({
          updateOne: {
            filter: {
              buyerId: tx.buyerId,
              date: tx.date,
              vendor: tx.vendor,
              amount: tx.amount,
            },
            update: {
              $set: {
                vendorNormalized: tx.vendorNormalized,
                category: tx.category,
                sourceFile: tx.sourceFile,
                updatedAt: tx.updatedAt,
              },
              $setOnInsert: {
                buyerId: tx.buyerId,
                date: tx.date,
                vendor: tx.vendor,
                amount: tx.amount,
                createdAt: tx.createdAt,
              },
            },
            upsert: true,
          },
        }));

        const result = await db
          .collection("spendtransactions")
          .bulkWrite(ops, { ordered: false });
        console.log(
          `Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`
        );
        totalTransactions += result.upsertedCount;
      }
    }

    if (totalTransactions === 0) {
      // Check if there are already transactions from a previous run
      const existingCount = await db
        .collection("spendtransactions")
        .countDocuments({ buyerId });
      if (existingCount > 0) {
        console.log(`\nNo new transactions, but ${existingCount} already exist from previous run.`);
        totalTransactions = existingCount;
      } else {
        console.log("\nNo transactions ingested. Pipeline complete (no data found).");
        return;
      }
    }

    // Mark buyer as ingested
    await db.collection("buyers").updateOne(
      { _id: buyerId },
      {
        $set: {
          spendDataIngested: true,
          lastSpendIngestAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // ─── STAGE 4: Aggregate ────────────────────────────────────────

    console.log(`\n${SEP}`);
    console.log("STAGE 4: Aggregate Spend Data");
    console.log(SEP);

    const pipeline = [
      { $match: { buyerId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalSpend: { $sum: "$amount" },
                totalTransactions: { $sum: 1 },
                earliest: { $min: "$date" },
                latest: { $max: "$date" },
              },
            },
          ],
          byCategory: [
            {
              $group: {
                _id: "$category",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
          byVendor: [
            {
              $group: {
                _id: "$vendorNormalized",
                vendor: { $first: "$vendor" },
                total: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 50 },
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  month: { $month: "$date" },
                },
                total: { $sum: "$amount" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ];

    const [aggResult] = await db
      .collection("spendtransactions")
      .aggregate(pipeline)
      .toArray();

    if (!aggResult) {
      console.log("No aggregation result.");
      return;
    }

    const totals = aggResult.totals?.[0] ?? {
      totalSpend: 0,
      totalTransactions: 0,
      earliest: null,
      latest: null,
    };

    const categoryBreakdown = (aggResult.byCategory as Array<{
      _id: string;
      total: number;
      count: number;
    }>).map((c) => ({
      category: c._id ?? "Other",
      total: c.total,
      count: c.count,
    }));

    const vendorBreakdown = (aggResult.byVendor as Array<{
      _id: string;
      vendor: string;
      total: number;
      count: number;
    }>).map((v) => ({
      vendor: v.vendor ?? v._id,
      total: v.total,
      count: v.count,
    }));

    const monthlyTotals = (aggResult.byMonth as Array<{
      _id: { year: number; month: number };
      total: number;
    }>).map((m) => ({
      year: m._id.year,
      month: m._id.month,
      total: m.total,
    }));

    const csvFiles = await db
      .collection("spendtransactions")
      .distinct("sourceFile", { buyerId });

    console.log(`\n${DASH}`);
    console.log("AGGREGATION RESULTS:");
    console.log(DASH);
    console.log(`Total transactions: ${totals.totalTransactions}`);
    console.log(`Total spend: £${totals.totalSpend.toFixed(2)}`);
    console.log(
      `Date range: ${totals.earliest?.toISOString().slice(0, 10) ?? "—"} → ${totals.latest?.toISOString().slice(0, 10) ?? "—"}`
    );
    console.log(`Categories: ${categoryBreakdown.length}`);
    categoryBreakdown.slice(0, 10).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.category}: £${c.total.toFixed(2)} (${c.count} txns)`);
    });
    console.log(`Vendors: ${vendorBreakdown.length}`);
    vendorBreakdown.slice(0, 10).forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.vendor}: £${v.total.toFixed(2)} (${v.count} txns)`);
    });
    console.log(`Monthly totals: ${monthlyTotals.length} months`);
    console.log(`CSV files: ${csvFiles.length}`);

    // Upsert spend summary
    const now = new Date();
    await db.collection("spendsummaries").updateOne(
      { buyerId },
      {
        $set: {
          totalTransactions: totals.totalTransactions,
          totalSpend: totals.totalSpend,
          dateRange: {
            earliest: totals.earliest ?? undefined,
            latest: totals.latest ?? undefined,
          },
          categoryBreakdown,
          vendorBreakdown,
          monthlyTotals,
          csvFilesProcessed: csvFiles as string[],
          lastComputedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          buyerId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Mark buyer as spend data available
    await db.collection("buyers").updateOne(
      { _id: buyerId },
      {
        $set: {
          spendDataAvailable: true,
          lastSpendIngestAt: now,
          updatedAt: now,
        },
      }
    );

    console.log(`\n${SEP}`);
    console.log("PIPELINE COMPLETE");
    console.log(SEP);
    console.log(`Buyer: ${buyer.name}`);
    console.log(`Transactions: ${totals.totalTransactions}`);
    console.log(`Total spend: £${totals.totalSpend.toFixed(2)}`);
    console.log(`Categories: ${categoryBreakdown.length}`);
    console.log(`Vendors: ${vendorBreakdown.length}`);
    console.log(`Spend data available: true`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
