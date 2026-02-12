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

const FILE_EXT_PATTERN = /\.(?:csv|xls|xlsx)$/i;
const DOWNLOAD_PATTERN = /(?:download|export).*csv|csv.*(?:download|export)/i;

function extractLinksViaRegex(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (FILE_EXT_PATTERN.test(href)) {
      links.push(href);
      continue;
    }
    if (DOWNLOAD_PATTERN.test(href)) {
      links.push(href);
    }
  }

  return resolveAndDedup(links, baseUrl);
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
function parseFlexibleDate(s: string): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  // Try ISO
  const iso = new Date(trimmed);
  if (!isNaN(iso.getTime())) return iso;
  // Try DD/MM/YYYY
  const ukMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (ukMatch) {
    const day = parseInt(ukMatch[1]);
    const month = parseInt(ukMatch[2]) - 1;
    let year = parseInt(ukMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
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
      console.log("No website — cannot discover transparency page. Stopping.");
      return;
    } else {
      const websiteUrl = buyer.website as string;
      console.log(`Fetching homepage: ${websiteUrl}`);

      let html: string;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(websiteUrl, {
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
        console.log("Marking as 'none' and stopping.");
        await db.collection("buyers").updateOne(
          { _id: buyerId },
          { $set: { transparencyPageUrl: "none", updatedAt: new Date() } }
        );
        return;
      }

      const strippedHtml = stripHtml(html).slice(0, 12000);

      console.log("Calling Claude Haiku for transparency page analysis...");
      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You are analyzing a UK public sector website to find spending transparency data.

Organization: ${buyer.name}
Website: ${websiteUrl}
Organization type: ${buyer.orgType ?? "unknown"}

HTML content:
<html>${strippedHtml}</html>

Find links to:
1. "transparency", "spending", "payments over 500", "expenditure", "open data" pages
2. Direct CSV/Excel file download links containing spending/payment data
3. Links to external open data portals (data.gov.uk, etc.)

Look in navigation menus, footer links, and body content.

Return ONLY valid JSON (no markdown):
{
  "transparencyUrl": "full URL or null if not found",
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
        console.log("No transparency page found. Marking as 'none'.");
        await db.collection("buyers").updateOne(
          { _id: buyerId },
          { $set: { transparencyPageUrl: "none", updatedAt: new Date() } }
        );
        return;
      }

      // Resolve relative URL
      try {
        transparencyUrl = new URL(parsed.transparencyUrl, websiteUrl).href;
      } catch {
        transparencyUrl = parsed.transparencyUrl;
      }

      const validCsvLinks = parsed.csvLinks
        .map((link) => {
          try {
            return new URL(link, websiteUrl).href;
          } catch {
            return null;
          }
        })
        .filter((link): link is string =>
          link !== null && (link.startsWith("http://") || link.startsWith("https://"))
        );

      console.log(`\nDiscovered transparency URL: ${transparencyUrl}`);
      console.log(`Direct CSV links found: ${validCsvLinks.length}`);
      validCsvLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));

      await db.collection("buyers").updateOne(
        { _id: buyerId },
        {
          $set: {
            transparencyPageUrl: transparencyUrl,
            ...(validCsvLinks.length > 0 ? { csvLinks: validCsvLinks } : {}),
            updatedAt: new Date(),
          },
        }
      );
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

      // Pass 1: Regex
      const regexLinks = extractLinksViaRegex(html!, transparencyUrl);
      console.log(`Regex found ${regexLinks.length} links`);

      // Pass 2: Claude Haiku if regex found < 3
      let aiLinks: string[] = [];
      if (regexLinks.length < 3) {
        console.log("Regex found < 3 links, using Claude Haiku fallback...");

        const strippedHtml = stripHtml(html!)
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .slice(0, 15000);

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

      // Merge all links
      const allLinks = Array.from(new Set([...csvLinks, ...regexLinks, ...aiLinks]));

      // Filter: keep only valid download links
      csvLinks = allLinks.filter((link) => {
        try {
          const url = new URL(link);
          const path = url.pathname.toLowerCase();
          return (
            FILE_EXT_PATTERN.test(path) ||
            path.includes("download") ||
            path.includes("export")
          );
        } catch {
          return false;
        }
      });

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

    // ─── STAGE 3: Download & Parse CSVs ────────────────────────────

    console.log(`\n${SEP}`);
    console.log("STAGE 3: Download & Parse CSVs");
    console.log(SEP);

    let totalTransactions = 0;
    const MAX_CSVS = 5; // Limit for testing
    const MAX_TRANSACTIONS = 500;

    for (let i = 0; i < Math.min(csvLinks.length, MAX_CSVS); i++) {
      const csvUrl = csvLinks[i];
      console.log(`\n${DASH}`);
      console.log(`CSV ${i + 1}/${Math.min(csvLinks.length, MAX_CSVS)}: ${csvUrl}`);
      console.log(DASH);

      // Check if already processed
      const existing = await db
        .collection("spendtransactions")
        .findOne({ buyerId, sourceFile: csvUrl });
      if (existing) {
        console.log("Already processed — skipping.");
        continue;
      }

      // Download
      let csvText: string;
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
        console.log(`Content-Type: ${contentType}`);

        if (
          !contentType.includes("text/csv") &&
          !contentType.includes("text/plain") &&
          !contentType.includes("application/csv") &&
          !contentType.includes("application/octet-stream") &&
          !contentType.includes("application/vnd")
        ) {
          console.warn(`Non-CSV content-type — skipping.`);
          continue;
        }

        csvText = await response.text();
        console.log(`Downloaded ${csvText.length} chars`);
      } catch (err) {
        console.warn(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      // Parse
      const parseResult = parseCSV(csvText);

      console.log(`Parsed ${parseResult.data.length} rows`);

      if (parseResult.data.length === 0) {
        console.log("No data rows — skipping.");
        continue;
      }

      // Column mapping (use AI since we're testing)
      const headers = parseResult.fields;
      console.log(`Headers: ${headers.join(", ")}`);

      const sampleRows = parseResult.data
        .slice(0, 3)
        .map((row) => headers.map((h) => row[h] ?? ""));

      console.log("Sample rows:");
      sampleRows.forEach((r) => console.log(`  ${r.join(" | ")}`));

      // Try to figure out columns — simple heuristic first
      let columnMapping: Record<string, string | undefined> | null = null;

      // Check common patterns
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
      } else {
        console.log("Heuristic mapping failed, calling Claude Haiku...");
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
        sourceFile: string;
        createdAt: Date;
        updatedAt: Date;
      }

      const transactions: TxDoc[] = [];
      let skipped = 0;

      for (const row of parseResult.data) {
        if (transactions.length >= MAX_TRANSACTIONS) break;

        const dateStr = row[columnMapping.date!] ?? "";
        const amountStr = row[columnMapping.amount!] ?? "";
        const vendorStr = row[columnMapping.vendor!] ?? "";
        const categoryStr = columnMapping.category ? row[columnMapping.category] ?? "" : "";

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
            { $limit: 30 },
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
