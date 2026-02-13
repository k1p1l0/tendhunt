import { ObjectId, type Db, type Collection } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import type {
  Env,
  EnrichmentJobDoc,
  BuyerDoc,
  BoardDocumentDoc,
  KeyPersonnelDoc,
} from "../types";
import { updateJobProgress } from "../db/enrichment-jobs";
import { upsertKeyPersonnel } from "../db/key-personnel";

// ---------------------------------------------------------------------------
// Stage 5: Extract key personnel using Claude Haiku
// ---------------------------------------------------------------------------

/**
 * Stage 5: For buyers that have been scraped (Stage 4) or have ModernGov data
 * (Stage 3), extract key personnel from governance page text using Claude Haiku.
 *
 * Extracts procurement-relevant roles:
 * - Chief executives, directors, board members
 * - Procurement leads, finance directors, CFOs, treasurers
 * - Chairs, committee chairs, councillors
 *
 * Cost: ~676 Tier 0 orgs at ~$0.01/org = ~$7 per full run
 */
export async function extractKeyPersonnel(
  db: Db,
  env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 10; // Smaller batches since each buyer needs an AI call
  const collection = db.collection<BuyerDoc>("buyers");
  const boardDocsCollection = db.collection<BoardDocumentDoc>("boarddocuments");

  // Initialize Anthropic client
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Limit concurrent Claude API calls to 2
  const limit = pLimit(2);

  let processed = 0;
  let errors = 0;
  let totalPersonnel = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Filter: buyers with scrape or moderngov data, not yet processed for personnel
    const filter: Record<string, unknown> = {
      enrichmentSources: {
        $in: ["scrape", "moderngov"],
        $nin: ["personnel"],
      },
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
        `Personnel extraction complete: ${processed} buyers processed, ${totalPersonnel} personnel extracted, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    // Process batch with concurrency limit
    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          try {
            const result = await processOneBuyer(
              db,
              anthropic,
              boardDocsCollection,
              collection,
              buyer
            );
            return result;
          } catch (err) {
            const msg = `Personnel extraction failed for "${buyer.name}": ${
              err instanceof Error ? err.message : String(err)
            }`;
            console.error(msg);
            return { error: msg, personnelCount: 0 };
          }
        })
      )
    );

    // Aggregate results
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.error) {
          errors++;
          errorMessages.push(result.value.error);
        }
        totalPersonnel += result.value.personnelCount;
      } else {
        errors++;
        errorMessages.push(result.reason?.message ?? String(result.reason));
      }
    }

    // Update cursor and progress
    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    // Log cost estimate for this batch
    const estimatedCost = (batch.length * 0.01).toFixed(2);
    console.log(
      `Personnel batch: ${batch.length} buyers, ~$${estimatedCost} estimated cost, ${totalPersonnel} total personnel`
    );

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
    `Personnel paused (budget ${maxItems} reached): ${processed} processed, ${totalPersonnel} personnel, ${errors} errors`
  );
  return { processed, errors, done: false };
}

// ---------------------------------------------------------------------------
// Per-buyer extraction logic
// ---------------------------------------------------------------------------

/**
 * Process a single buyer: fetch board documents, call Claude Haiku,
 * parse response, upsert key personnel records.
 */
async function processOneBuyer(
  db: Db,
  anthropic: Anthropic,
  boardDocsCollection: Collection<BoardDocumentDoc>,
  buyersCollection: Collection<BuyerDoc>,
  buyer: BuyerDoc
): Promise<{ error?: string; personnelCount: number }> {
  // Fetch board documents with extracted text content
  const boardDocs = (await boardDocsCollection
    .find({
      buyerId: buyer._id!,
      extractionStatus: "extracted",
      textContent: { $exists: true, $ne: "" },
    })
    .sort({ updatedAt: -1 })
    .limit(3)
    .toArray()) as BoardDocumentDoc[];

  // Combine text from up to 3 documents, max 8000 chars total
  let combinedText = "";
  for (const doc of boardDocs) {
    if (!doc.textContent) continue;
    const remaining = 8000 - combinedText.length;
    if (remaining <= 0) break;
    combinedText += doc.textContent.slice(0, remaining) + "\n\n";
  }
  combinedText = combinedText.trim();

  // If no text available, skip this buyer but mark as processed
  if (combinedText.length === 0) {
    await markBuyerPersonnelProcessed(buyersCollection, buyer._id!);
    console.log(`No text for "${buyer.name}" -- skipping personnel extraction`);
    return { personnelCount: 0 };
  }

  // Call Claude Haiku for personnel extraction
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are extracting key personnel from UK public sector organization governance pages.
Extract ONLY people with procurement-relevant roles: chief executives, directors, board members, procurement leads, finance directors, treasurers, chairs.
Return a JSON array. If no relevant personnel found, return [].`,
    messages: [
      {
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
      },
    ],
  });

  // Extract text content from response
  const responseText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Parse JSON array from response
  const personnel = parsePersonnelJson(responseText);

  if (personnel.length > 0) {
    // Get source URL from first board document
    const sourceUrl = boardDocs[0]?.sourceUrl ?? undefined;

    // Build KeyPersonnel documents
    const personnelDocs: Array<
      Partial<KeyPersonnelDoc> & { buyerId: ObjectId; name: string }
    > = personnel.map((p) => ({
      buyerId: buyer._id!,
      name: p.name,
      title: p.title ?? undefined,
      role: p.role ?? undefined,
      department: p.department ?? undefined,
      email: p.email ?? undefined,
      confidence: typeof p.confidence === "number" ? p.confidence : undefined,
      extractionMethod: "claude_haiku" as const,
      sourceUrl,
    }));

    // Upsert key personnel records
    const upserted = await upsertKeyPersonnel(db, personnelDocs);
    console.log(
      `Extracted ${upserted} personnel for "${buyer.name}"`
    );
  } else {
    console.log(`No personnel found for "${buyer.name}"`);
  }

  // Mark buyer as processed
  await markBuyerPersonnelProcessed(buyersCollection, buyer._id!);

  return { personnelCount: personnel.length };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a JSON array of personnel from Claude's response text.
 * Uses regex to extract the JSON array, then JSON.parse.
 * Returns empty array on any parse failure.
 */
function parsePersonnelJson(
  text: string
): Array<{
  name: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  confidence?: number;
}> {
  try {
    // Extract JSON array from response (may be surrounded by markdown or text)
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.warn("No JSON array found in Claude response");
      return [];
    }

    const parsed = JSON.parse(match[0]);

    if (!Array.isArray(parsed)) {
      console.warn("Parsed result is not an array");
      return [];
    }

    // Validate each entry has at least a name
    return parsed.filter(
      (entry: unknown): entry is { name: string } =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        typeof (entry as Record<string, unknown>).name === "string" &&
        (entry as Record<string, unknown>).name !== ""
    );
  } catch (err) {
    console.warn(
      `Failed to parse personnel JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

/**
 * Mark a buyer as processed by the personnel extraction stage.
 */
async function markBuyerPersonnelProcessed(
  collection: Collection<BuyerDoc>,
  buyerId: ObjectId
): Promise<void> {
  await collection.updateOne(
    { _id: buyerId },
    {
      $set: {
        lastEnrichedAt: new Date(),
        updatedAt: new Date(),
      },
      $addToSet: { enrichmentSources: "personnel" },
    }
  );
}
