import mongoose, { Schema } from "mongoose";

/**
 * Ofsted report PDF fetcher with text extraction and MongoDB caching.
 *
 * Fetches PDFs from files.ofsted.gov.uk, extracts text via pdf-parse,
 * and caches the extracted text in MongoDB to avoid redundant downloads.
 * Cache entries expire after 90 days (reports don't change once published).
 */

// ---------------------------------------------------------------------------
// Cache model
// ---------------------------------------------------------------------------

const reportCacheSchema = new Schema(
  {
    urn: { type: Number, required: true, index: true },
    reportUrl: { type: String, required: true },
    text: { type: String, required: true },
    charCount: { type: Number },
    fetchedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { collection: "ofstedReportCache" }
);

reportCacheSchema.index({ urn: 1, reportUrl: 1 }, { unique: true });

const ReportCache =
  mongoose.models.OfstedReportCache ||
  mongoose.model("OfstedReportCache", reportCacheSchema);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_DAYS = 90;
const MAX_TEXT_CHARS = 40_000;
const FETCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ReportText {
  text: string;
  charCount: number;
  fromCache: boolean;
  reportUrl: string;
}

/**
 * Gets the extracted text from an Ofsted report PDF.
 *
 * 1. Checks MongoDB cache first
 * 2. If not cached, fetches PDF from reportUrl, extracts text, and caches it
 * 3. Truncates to MAX_TEXT_CHARS to keep AI prompts within token limits
 */
export async function getReportText(
  urn: number,
  reportUrl: string
): Promise<ReportText | null> {
  if (!reportUrl) return null;

  // Check cache
  const cached = await ReportCache.findOne({ urn, reportUrl }).lean();
  if (cached) {
    return {
      text: (cached as { text: string }).text,
      charCount: (cached as { charCount?: number }).charCount ?? (cached as { text: string }).text.length,
      fromCache: true,
      reportUrl,
    };
  }

  // Fetch and extract
  const text = await fetchAndExtractReport(reportUrl);
  if (!text) return null;

  const truncated = text.slice(0, MAX_TEXT_CHARS);

  // Cache the result
  try {
    await ReportCache.findOneAndUpdate(
      { urn, reportUrl },
      {
        urn,
        reportUrl,
        text: truncated,
        charCount: truncated.length,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      { upsert: true }
    );
  } catch (err) {
    // Log but don't fail — the text was still extracted successfully
    console.error(`[ofsted-report] Cache write failed for URN ${urn}:`, err);
  }

  return {
    text: truncated,
    charCount: truncated.length,
    fromCache: false,
    reportUrl,
  };
}

/**
 * Batch-fetches report texts for multiple schools.
 * Used by the scoring engine to pre-fetch reports before scoring.
 *
 * Returns a Map of entityId -> report text (or null if unavailable).
 */
export async function batchGetReportTexts(
  schools: Array<{ _id: unknown; urn: number; reportUrl?: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // First, check cache for all schools at once
  const urns = schools.filter((s) => s.reportUrl).map((s) => s.urn);
  const urls = schools.filter((s) => s.reportUrl).map((s) => s.reportUrl!);

  const cachedEntries = await ReportCache.find({
    $or: urns.map((urn, i) => ({ urn, reportUrl: urls[i] })),
  }).lean();

  const cachedMap = new Map<string, string>();
  for (const entry of cachedEntries) {
    const e = entry as { urn: number; text: string };
    cachedMap.set(String(e.urn), e.text);
  }

  // Populate from cache and identify misses
  const uncached: Array<{ _id: unknown; urn: number; reportUrl: string }> = [];
  for (const school of schools) {
    const id = String(school._id);
    const cached = cachedMap.get(String(school.urn));
    if (cached) {
      results.set(id, cached);
    } else if (school.reportUrl) {
      uncached.push({ _id: school._id, urn: school.urn, reportUrl: school.reportUrl });
    }
  }

  // Fetch uncached reports (sequentially to avoid hammering Ofsted servers)
  for (const school of uncached) {
    try {
      const report = await getReportText(school.urn, school.reportUrl);
      if (report) {
        results.set(String(school._id), report.text);
      }
    } catch (err) {
      console.error(
        `[ofsted-report] Failed to fetch report for URN ${school.urn}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function fetchAndExtractReport(reportUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(reportUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TendHunt/1.0 (Ofsted Report Analysis)",
        Accept: "application/pdf",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[ofsted-report] HTTP ${response.status} fetching ${reportUrl}`
      );
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      console.error(
        `[ofsted-report] Unexpected content-type "${contentType}" for ${reportUrl}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) {
      console.error(`[ofsted-report] PDF too small (${buffer.length} bytes) for ${reportUrl}`);
      return null;
    }

    // Dynamic import to avoid build-time issues with pdfjs-dist
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const text = result.text?.trim() || "";
    if (text.length < 50) {
      console.error(`[ofsted-report] Extracted text too short (${text.length} chars) for ${reportUrl}`);
      return null;
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[ofsted-report] Timeout fetching ${reportUrl}`);
    } else {
      console.error(
        `[ofsted-report] Error fetching/extracting ${reportUrl}:`,
        err instanceof Error ? err.message : err
      );
    }
    return null;
  }
}
