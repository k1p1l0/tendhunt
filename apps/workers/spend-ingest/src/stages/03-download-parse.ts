import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import Papa from "papaparse";
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

            // Download the CSV
            let csvText: string;
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

              // Check content type
              const contentType = response.headers.get("content-type") ?? "";
              if (
                !contentType.includes("text/csv") &&
                !contentType.includes("text/plain") &&
                !contentType.includes("application/csv") &&
                !contentType.includes("application/octet-stream") &&
                !contentType.includes("application/vnd")
              ) {
                console.warn(
                  `Skipping non-CSV content-type "${contentType}" for ${csvUrl}`
                );
                continue;
              }

              csvText = await response.text();
            } catch (err) {
              console.warn(
                `Download failed for CSV ${csvUrl}: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
              continue;
            }

            // Parse with PapaParse
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

            if (parseResult.data.length === 0) continue;

            // Get column mapping (cache per buyer — most councils reuse format)
            if (!columnMapping) {
              const headers = parseResult.meta.fields ?? [];
              const sampleRows = parseResult.data
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

            for (const row of parseResult.data) {
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
