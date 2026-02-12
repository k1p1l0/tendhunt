import { ObjectId, type Db } from "mongodb";
import type { Env, EnrichmentJobDoc, BuyerDoc } from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";
import { upsertBoardDocuments } from "../db/board-documents";
import {
  getMeetings,
  testConnection,
} from "../api-clients/moderngov-client";
import type { BoardDocumentDoc } from "../types";

// ---------------------------------------------------------------------------
// Stage 3: Fetch meeting data from ModernGov SOAP API
// ---------------------------------------------------------------------------

/**
 * Stage 3: For buyers with democracyPlatform = "ModernGov", call the
 * ModernGov SOAP API to discover recent meetings and create BoardDocument
 * records for each.
 *
 * Logic:
 * 1. Process buyers in batches of 20 (each buyer requires HTTP calls)
 * 2. Filter: democracyPlatform = "ModernGov" AND democracyPortalUrl set
 *    AND enrichmentSources does NOT contain "moderngov"
 * 3. For each buyer:
 *    a. Test SOAP API connection
 *    b. Fetch meetings for last 12 months
 *    c. Create BoardDocument for each meeting
 *    d. Add "moderngov" to enrichmentSources
 *
 * Non-ModernGov councils (CMIS, Custom, Jadu) are automatically skipped
 * by the democracyPlatform filter.
 */
export async function fetchModernGovData(
  db: Db,
  _env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 20;
  const collection = db.collection<BuyerDoc>("buyers");

  let processed = 0;
  let errors = 0;
  let totalMeetings = 0;
  let currentCursor = job.cursor;

  // Date range: last 12 months
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = formatDate(oneYearAgo);
  const endDate = formatDate(now);

  while (processed < maxItems) {
    // Build filter: ModernGov buyers not yet processed by this stage
    const filter: Record<string, unknown> = {
      democracyPlatform: "ModernGov",
      democracyPortalUrl: { $exists: true, $nin: [null, ""] },
      enrichmentSources: { $nin: ["moderngov"] },
    };

    // Cursor-based pagination
    if (currentCursor) {
      filter._id = { $gt: new ObjectId(currentCursor) };
    }

    const batch = await collection
      .find(filter)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    // No more buyers matching criteria -- stage complete
    if (batch.length === 0) {
      console.log(
        `ModernGov stage complete: ${processed} buyers processed, ${totalMeetings} meetings found, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        const baseUrl = buyer.democracyPortalUrl!;

        // Step 1: Quick connection test
        const isAlive = await testConnection(baseUrl);
        if (!isAlive) {
          console.warn(
            `ModernGov API unreachable for "${buyer.name}" at ${baseUrl}`
          );
          errors++;
          errorMessages.push(
            `Connection failed: ${buyer.name} (${baseUrl})`
          );
          continue;
        }

        // Step 2: Fetch meetings for last 12 months
        const meetings = await getMeetings(baseUrl, startDate, endDate);

        if (meetings.length === 0) {
          console.log(
            `No meetings found for "${buyer.name}" (${baseUrl})`
          );
        } else {
          console.log(
            `Found ${meetings.length} meetings for "${buyer.name}"`
          );

          // Step 3: Create BoardDocument records
          const boardDocs: Array<
            Partial<BoardDocumentDoc> & { buyerId: ObjectId; sourceUrl: string }
          > = meetings.map((meeting) => ({
            buyerId: buyer._id!,
            dataSourceName: buyer.name,
            title: meeting.title || meeting.committeeName || "Meeting",
            meetingDate: parseMeetingDate(meeting.date),
            committeeId: String(meeting.committeeId),
            committeeName: meeting.committeeName,
            documentType: "minutes" as const,
            sourceUrl: `${baseUrl.replace(/\/$/, "")}/mgConvert2PDF.aspx?ID=${meeting.id}`,
            extractionStatus: "pending" as const,
          }));

          // Step 4: Upsert board documents (deduplicates on buyerId + sourceUrl)
          const upserted = await upsertBoardDocuments(db, boardDocs);
          totalMeetings += upserted;
        }

        // Step 5: Mark buyer as processed by this stage
        await collection.updateOne(
          { _id: buyer._id },
          {
            $set: {
              lastEnrichedAt: new Date(),
              updatedAt: new Date(),
            },
            $addToSet: { enrichmentSources: "moderngov" },
          }
        );
      } catch (err) {
        errors++;
        const msg = `ModernGov processing failed for "${buyer.name}": ${
          err instanceof Error ? err.message : String(err)
        }`;
        errorMessages.push(msg);
        console.error(msg);
      }
    }

    // Update cursor and progress
    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    // Save progress after EVERY batch (crash-safe)
    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  // Budget reached, but more buyers may remain
  console.log(
    `ModernGov paused (budget ${maxItems} reached): ${processed} processed, ${totalMeetings} meetings, ${errors} errors`
  );
  return { processed, errors, done: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date as dd/MM/yyyy for the ModernGov SOAP API.
 */
function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Parse a date string from ModernGov into a Date object.
 * ModernGov returns dates in various formats; this handles common ones.
 */
function parseMeetingDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try parsing as-is (ISO format, etc.)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try dd/MM/yyyy format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return d;
  }

  console.warn(`Could not parse meeting date: ${dateStr}`);
  return undefined;
}
