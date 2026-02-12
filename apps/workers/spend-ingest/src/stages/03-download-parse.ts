import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import pLimit from "p-limit";
import type { Env, SpendJobDoc, SpendTransactionDoc } from "../types";
import { getBuyerBatchForDownload, updateBuyerSpendFields } from "../db/buyers";
import { updateJobProgress } from "../db/spend-jobs";
import { bulkUpsertTransactions } from "../db/spend-data";
import { fetchWithDomainDelay } from "../api-clients/rate-limiter";
import { mapColumns } from "../normalization/column-mapper";
import { parseFlexibleDate } from "../normalization/date-parser";
import { parseAmount } from "../normalization/amount-parser";
import { normalizeVendor } from "../normalization/vendor-normalizer";
import { normalizeCategory } from "../normalization/category-taxonomy";
import type { ColumnMapping } from "../normalization/known-schemas";

// ---------------------------------------------------------------------------
// Stage 3: Download and parse CSV spend data files
// ---------------------------------------------------------------------------

const BATCH_SIZE = 10;
const MAX_TRANSACTIONS_PER_BUYER = 5000;
const UPSERT_CHUNK_SIZE = 500;

type FileFormat = "csv" | "ods" | "xlsx" | "unknown";

/**
 * Detect file format from content-type header and URL extension.
 */
function detectFileFormat(contentType: string, url: string): FileFormat {
  const ct = contentType.toLowerCase();

  if (ct.includes("text/csv") || ct.includes("application/csv")) return "csv";
  if (ct.includes("application/vnd.oasis.opendocument.spreadsheet")) return "ods";
  if (ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml")) return "xlsx";

  // Fallback to URL extension for octet-stream or generic types
  const urlLower = url.toLowerCase();
  const pathPart = urlLower.split("?")[0];
  if (pathPart.endsWith(".csv")) return "csv";
  if (pathPart.endsWith(".ods")) return "ods";
  if (pathPart.endsWith(".xlsx")) return "xlsx";
  if (pathPart.endsWith(".xls")) return "xlsx";

  // text/plain often used for CSV
  if (ct.includes("text/plain")) return "csv";

  // Generic vnd.* or octet-stream — check URL more carefully
  if (ct.includes("application/octet-stream") || ct.includes("application/vnd")) {
    if (urlLower.includes(".ods")) return "ods";
    if (urlLower.includes(".xlsx") || urlLower.includes(".xls")) return "xlsx";
    if (urlLower.includes(".csv")) return "csv";
  }

  return "unknown";
}

/**
 * Parse ODS/XLSX spreadsheet buffer into rows with headers.
 * Returns the same shape as PapaParse output for downstream compatibility.
 */
function parseSpreadsheet(buffer: ArrayBuffer): {
  data: Record<string, string>[];
  headers: string[];
} {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { data: [], headers: [] };

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });

  if (rows.length === 0) return { data: [], headers: [] };

  const headers = Object.keys(rows[0]);
  return { data: rows, headers };
}

/**
 * Get the value from a CSV row using the column mapping.
 * Handles case-insensitive column name matching.
 */
function getField(
  row: Record<string, string>,
  columnName: string | undefined
): string {
  if (!columnName) return "";

  // Direct match
  if (row[columnName] !== undefined) return row[columnName];

  // Case-insensitive match
  const lower = columnName.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) {
      return row[key];
    }
  }

  return "";
}

/**
 * Stage 3: Download and parse CSV files.
 *
 * Downloads CSV files from buyer csvLinks, parses with PapaParse,
 * normalizes via hybrid column mapper, and bulk-upserts SpendTransaction records.
 * Caps at MAX_TRANSACTIONS_PER_BUYER per buyer.
 */
export async function downloadAndParseCsvs(
  db: Db,
  env: Env,
  job: SpendJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const limit = pLimit(2);

  let processed = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let totalTransactions = 0;

  while (processed < maxItems) {
    const batch = await getBuyerBatchForDownload(db, currentCursor, BATCH_SIZE);

    if (batch.length === 0) {
      console.log(
        `Download/parse complete: ${totalTransactions} transactions from ${processed} buyers`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          const csvLinks = buyer.csvLinks ?? [];
          if (csvLinks.length === 0) {
            await updateBuyerSpendFields(db, buyer._id!, {
              spendDataIngested: true,
            });
            return { error: false, transactions: 0 };
          }

          let buyerTransactionCount = 0;
          let columnMapping: ColumnMapping["map"] | null = null;
          let capReached = false;

          // Process each CSV file sequentially for this buyer
          for (const csvUrl of csvLinks) {
            if (capReached) break;

            // Check if already processed
            const existing = await db
              .collection("spendtransactions")
              .findOne({ buyerId: buyer._id!, sourceFile: csvUrl });
            if (existing) continue;

            // Download the file
            let parsedData: Record<string, string>[];
            let parsedHeaders: string[];
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15000);
              const response = await fetchWithDomainDelay(csvUrl, {
                signal: controller.signal,
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (compatible; TendHunt/1.0; spend-ingest)",
                },
              });
              clearTimeout(timeout);

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const contentType = response.headers.get("content-type") ?? "";
              const format = detectFileFormat(contentType, csvUrl);

              if (format === "unknown") {
                // Accept text/html only if it looks like it might be a redirect
                if (contentType.includes("text/html")) {
                  console.warn(
                    `Skipping HTML content-type for ${csvUrl}`
                  );
                  continue;
                }
                // Try as CSV for unknown types
                console.warn(
                  `Unknown format "${contentType}" for ${csvUrl}, trying as CSV`
                );
              }

              if (format === "ods" || format === "xlsx") {
                // Spreadsheet: read as ArrayBuffer, parse via SheetJS
                const buffer = await response.arrayBuffer();
                const result = parseSpreadsheet(buffer);
                parsedData = result.data;
                parsedHeaders = result.headers;
                console.log(
                  `Parsed ${format.toUpperCase()} file: ${parsedData.length} rows, ${parsedHeaders.length} cols`
                );
              } else {
                // CSV: read as text, parse via PapaParse
                const csvText = await response.text();
                const parseResult = Papa.parse<Record<string, string>>(csvText, {
                  header: true,
                  skipEmptyLines: true,
                  dynamicTyping: false,
                });

                // Skip files with > 50% error rate
                if (
                  parseResult.data.length > 0 &&
                  parseResult.errors.length / parseResult.data.length > 0.5
                ) {
                  console.warn(
                    `Skipping CSV ${csvUrl}: ${parseResult.errors.length}/${parseResult.data.length} rows have errors`
                  );
                  continue;
                }

                parsedData = parseResult.data;
                parsedHeaders = parseResult.meta.fields ?? [];
              }
            } catch (err) {
              console.warn(
                `Download failed for ${csvUrl}: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
              continue;
            }

            if (parsedData.length === 0) continue;

            // Get column mapping (cache per buyer — most councils reuse format)
            if (!columnMapping) {
              const headers = parsedHeaders;
              const sampleRows = parsedData
                .slice(0, 3)
                .map((row) => headers.map((h) => row[h] ?? ""));

              columnMapping = await mapColumns(
                headers,
                sampleRows,
                env.ANTHROPIC_API_KEY
              );

              if (!columnMapping) {
                console.warn(
                  `Could not map columns for "${buyer.name}" CSV: ${csvUrl}`
                );
                continue;
              }
            }

            // Normalize rows
            const transactions: SpendTransactionDoc[] = [];

            for (const row of parsedData) {
              if (buyerTransactionCount + transactions.length >= MAX_TRANSACTIONS_PER_BUYER) {
                capReached = true;
                console.log(
                  `Transaction cap (${MAX_TRANSACTIONS_PER_BUYER}) reached for "${buyer.name}"`
                );
                break;
              }

              const dateStr = getField(row, columnMapping.date);
              const amountStr = getField(row, columnMapping.amount);
              const vendorStr = getField(row, columnMapping.vendor);
              const categoryStr = getField(row, columnMapping.category);

              const date = parseFlexibleDate(dateStr);
              const amount = parseAmount(amountStr);
              const vendor = vendorStr.trim();

              // Skip invalid rows
              if (!date || amount === 0 || !vendor) continue;

              const now = new Date();
              transactions.push({
                buyerId: buyer._id! as ObjectId,
                date,
                amount,
                vendor,
                vendorNormalized: normalizeVendor(vendor),
                category: normalizeCategory(categoryStr),
                subcategory: columnMapping.subcategory
                  ? getField(row, columnMapping.subcategory) || undefined
                  : undefined,
                department: columnMapping.department
                  ? getField(row, columnMapping.department) || undefined
                  : undefined,
                reference: columnMapping.reference
                  ? getField(row, columnMapping.reference) || undefined
                  : undefined,
                sourceFile: csvUrl,
                createdAt: now,
                updatedAt: now,
              });
            }

            // Bulk upsert in chunks
            for (let i = 0; i < transactions.length; i += UPSERT_CHUNK_SIZE) {
              const chunk = transactions.slice(i, i + UPSERT_CHUNK_SIZE);
              const result = await bulkUpsertTransactions(db, chunk);
              totalTransactions += result.upsertedCount;
            }

            buyerTransactionCount += transactions.length;

            console.log(
              `Parsed ${transactions.length} transactions from ${csvUrl} for "${buyer.name}"`
            );
          }

          // Mark buyer as ingested
          await updateBuyerSpendFields(db, buyer._id!, {
            spendDataIngested: true,
            lastSpendIngestAt: new Date(),
          });

          return { error: false, transactions: buyerTransactionCount };
        })
      )
    );

    // Count errors
    for (const result of results) {
      if (result.status === "rejected") {
        errors++;
        errorMessages.push(result.reason?.message ?? String(result.reason));
      } else if (result.value.error) {
        errors++;
      }
    }

    // Update cursor and progress
    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Download/parse paused (budget ${maxItems} reached): ${totalTransactions} transactions from ${processed} buyers`
  );
  return { processed, errors, done: false };
}
