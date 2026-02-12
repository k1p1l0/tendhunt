import { ObjectId } from "mongodb";
import type { Db, Collection } from "mongodb";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import type {
  Env,
  SignalJobDoc,
  SignalDoc,
  BoardDocumentDoc,
} from "../types";
import { updateJobProgress } from "../db/signal-jobs";

// ---------------------------------------------------------------------------
// Stage 1: Extract buying signals from BoardDocuments via Claude Haiku
// ---------------------------------------------------------------------------

const VALID_SIGNAL_TYPES = [
  "budget_approval",
  "procurement_intent",
  "contract_renewal",
  "digital_transformation",
  "leadership_change",
  "policy_change",
] as const;

type ValidSignalType = (typeof VALID_SIGNAL_TYPES)[number];

// ---------------------------------------------------------------------------
// Prompts (adapted from reference project for Anthropic SDK)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert at analyzing UK public sector board meeting minutes and extracting business intelligence signals. You always return valid JSON.

Focus on actionable signals:
- budget_approval: Budgets, savings targets, cost improvement programmes, financial approvals
- procurement_intent: Tenders, contracts, supplier changes, framework agreements
- contract_renewal: Existing contract renewals, extensions, re-procurements
- digital_transformation: IT systems, infrastructure, digital transformation projects
- leadership_change: Senior appointments, restructures, recruitment campaigns
- policy_change: Major policy changes, regulatory compliance, audits, inspections

Only extract signals with clear business value. Skip routine administrative items.`;

const EXTRACTION_PROMPT = `Analyze this board meeting minutes excerpt and extract business signals.

For each signal found, provide:
- signal_type: budget_approval | procurement_intent | contract_renewal | digital_transformation | leadership_change | policy_change
- title: Short title (5-10 words)
- summary: Brief description (1-2 sentences)
- confidence: 0.0-1.0
- entities: Named entities object with companies (array), amounts (array), dates (array), people (array)
- quote: Relevant verbatim quote (max 200 chars)

Organisation: {org_name}
Sector: {sector}
Meeting date: {meeting_date}

Text:
{chunk_text}

Return a JSON array of signals. Return an empty array [] if no signals found.
Only return valid JSON, no explanation text.`;

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

const MAX_CHUNK_CHARS = 4000;
const OVERLAP_CHARS = 200;

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + MAX_CHUNK_CHARS;

    if (end < text.length) {
      // Look for paragraph break first
      const paraBreak = text.lastIndexOf("\n\n", end);
      if (paraBreak > start + MAX_CHUNK_CHARS / 2) {
        end = paraBreak + 2;
      } else {
        // Look for sentence end
        for (const punct of [". ", ".\n", "? ", "! "]) {
          const sentBreak = text.lastIndexOf(punct, end);
          if (sentBreak > start + MAX_CHUNK_CHARS / 2) {
            end = sentBreak + punct.length;
            break;
          }
        }
      }
    }

    chunks.push(text.substring(start, end).trim());
    start = end - OVERLAP_CHARS;

    if (start < 0) start = end;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Signal JSON parsing and validation
// ---------------------------------------------------------------------------

interface RawSignal {
  signal_type?: string;
  title?: string;
  summary?: string;
  confidence?: number;
  quote?: string;
  entities?: {
    companies?: string[];
    amounts?: string[];
    dates?: string[];
    people?: string[];
  };
}

function parseSignals(content: string): RawSignal[] {
  try {
    let json = content;
    // Handle markdown code blocks
    if (json.startsWith("```")) {
      json = json.split("```")[1];
      if (json.startsWith("json")) {
        json = json.substring(4);
      }
    }

    const parsed = JSON.parse(json.trim());

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidSignal);
  } catch (error) {
    console.error("Error parsing signals JSON:", error);
    return [];
  }
}

function isValidSignal(obj: unknown): obj is RawSignal {
  if (!obj || typeof obj !== "object") return false;

  const signal = obj as Record<string, unknown>;

  return (
    typeof signal.signal_type === "string" &&
    typeof signal.summary === "string" &&
    (signal.summary as string).length > 10
  );
}

function normalizeSignalType(raw: string): ValidSignalType {
  // Handle both UPPER_CASE (reference project) and lower_case (our schema)
  const normalized = raw.toLowerCase();
  const typeMap: Record<string, ValidSignalType> = {
    procurement: "procurement_intent",
    procurement_intent: "procurement_intent",
    staffing: "leadership_change",
    strategy: "policy_change",
    financial: "budget_approval",
    budget_approval: "budget_approval",
    projects: "digital_transformation",
    digital_transformation: "digital_transformation",
    regulatory: "policy_change",
    policy_change: "policy_change",
    contract_renewal: "contract_renewal",
    leadership_change: "leadership_change",
  };
  return typeMap[normalized] ?? "digital_transformation";
}

// ---------------------------------------------------------------------------
// Main stage function
// ---------------------------------------------------------------------------

export async function extractSignals(
  db: Db,
  env: Env,
  job: SignalJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 10;
  const buyersCollection = db.collection("buyers");
  const boardDocsCollection =
    db.collection<BoardDocumentDoc>("boarddocuments");
  const signalsCollection = db.collection<SignalDoc>("signals");

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const limit = pLimit(2);

  let processed = 0;
  let errors = 0;
  let totalSignals = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Two-step: find buyerIds with qualifying BoardDocuments, then fetch Tier 0 buyers
    const qualifyingBuyerIds = await boardDocsCollection.distinct("buyerId", {
      extractionStatus: "extracted",
      signalExtractionStatus: { $ne: "extracted" },
      textContent: { $exists: true, $ne: "" },
    });

    if (qualifyingBuyerIds.length === 0) {
      console.log(
        `Signal extraction complete: ${processed} buyers processed, ${totalSignals} signals extracted, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const buyerFilter: Record<string, unknown> = {
      dataSourceId: { $exists: true, $ne: null },
      _id: { $in: qualifyingBuyerIds },
    };

    // Cursor-based pagination
    if (currentCursor) {
      buyerFilter._id = {
        $gt: new ObjectId(currentCursor),
        $in: qualifyingBuyerIds,
      };
    }

    const batch = await buyersCollection
      .find(buyerFilter)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (batch.length === 0) {
      console.log(
        `Signal extraction complete: ${processed} buyers, ${totalSignals} signals, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    const results = await Promise.allSettled(
      batch.map((buyer) =>
        limit(async () => {
          try {
            const result = await processOneBuyer(
              anthropic,
              boardDocsCollection,
              signalsCollection,
              buyer
            );
            return result;
          } catch (err) {
            const msg = `Signal extraction failed for "${buyer.name}": ${
              err instanceof Error ? err.message : String(err)
            }`;
            console.error(msg);
            return { error: msg, signalCount: 0 };
          }
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.error) {
          errors++;
          errorMessages.push(result.value.error);
        }
        totalSignals += result.value.signalCount;
      } else {
        errors++;
        errorMessages.push(result.reason?.message ?? String(result.reason));
      }
    }

    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    console.log(
      `Signal extraction batch: ${batch.length} buyers, ${totalSignals} total signals`
    );

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Signal extraction paused (budget ${maxItems} reached): ${processed} processed, ${totalSignals} signals, ${errors} errors`
  );
  return { processed, errors, done: false };
}

// ---------------------------------------------------------------------------
// Per-buyer extraction logic
// ---------------------------------------------------------------------------

async function processOneBuyer(
  anthropic: Anthropic,
  boardDocsCollection: Collection<BoardDocumentDoc>,
  signalsCollection: Collection<SignalDoc>,
  buyer: Record<string, unknown>
): Promise<{ error?: string; signalCount: number }> {
  const buyerId = buyer._id as ObjectId;
  const buyerName = (buyer.name as string) ?? "Unknown";
  const sector = (buyer.orgType as string) ?? (buyer.sector as string) ?? "public_sector";

  // Fetch up to 5 most recent unprocessed BoardDocuments with text content
  const docs = await boardDocsCollection
    .find({
      buyerId,
      extractionStatus: "extracted",
      signalExtractionStatus: { $ne: "extracted" },
      textContent: { $exists: true, $ne: "" },
    })
    .sort({ meetingDate: -1 })
    .limit(5)
    .toArray();

  if (docs.length === 0) {
    console.log(`No qualifying documents for "${buyerName}" -- skipping`);
    return { signalCount: 0 };
  }

  let totalExtracted = 0;

  for (const doc of docs) {
    try {
      const textContent = doc.textContent ?? "";
      if (textContent.length === 0) continue;

      const meetingDate = doc.meetingDate
        ? new Date(doc.meetingDate).toISOString().split("T")[0]
        : "Unknown";

      const chunks = chunkText(textContent);
      console.log(
        `Processing ${chunks.length} chunks for "${buyerName}" doc "${doc.title}"`
      );

      const docSignals: RawSignal[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const prompt = EXTRACTION_PROMPT
          .replace("{org_name}", buyerName)
          .replace("{sector}", sector)
          .replace("{meeting_date}", meetingDate)
          .replace("{chunk_text}", chunks[i]);

        try {
          const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20250401",
            max_tokens: 2000,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: prompt }],
          });

          const responseText =
            response.content[0]?.type === "text"
              ? response.content[0].text
              : "[]";

          const signals = parseSignals(responseText);
          docSignals.push(...signals);
        } catch (apiErr) {
          console.error(
            `Claude API error for "${buyerName}" chunk ${i + 1}:`,
            apiErr
          );
        }

        // 500ms sleep between chunks to avoid rate issues
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Build and upsert Signal documents
      if (docSignals.length > 0) {
        const bulkOps = docSignals.map((raw) => {
          const signalType = normalizeSignalType(raw.signal_type ?? "PROJECTS");
          const title =
            typeof raw.title === "string" && raw.title.length > 0
              ? raw.title
              : (raw.summary ?? "Untitled signal").slice(0, 60);
          const confidence =
            typeof raw.confidence === "number"
              ? Math.min(1, Math.max(0, raw.confidence))
              : 0.5;
          const entities = raw.entities ?? {};
          const now = new Date();

          const signalDoc: Omit<SignalDoc, "_id"> = {
            buyerId,
            boardDocumentId: doc._id!,
            organizationName: buyerName,
            signalType,
            title,
            insight: raw.summary ?? "",
            source: doc.sourceUrl,
            sourceDate: doc.meetingDate,
            sector,
            confidence,
            quote:
              typeof raw.quote === "string"
                ? raw.quote.substring(0, 200)
                : undefined,
            entities: {
              companies: Array.isArray(entities.companies)
                ? entities.companies
                : [],
              amounts: Array.isArray(entities.amounts) ? entities.amounts : [],
              dates: Array.isArray(entities.dates) ? entities.dates : [],
              people: Array.isArray(entities.people) ? entities.people : [],
            },
            createdAt: now,
            updatedAt: now,
          };

          return {
            updateOne: {
              filter: {
                buyerId,
                boardDocumentId: doc._id!,
                signalType,
                title,
              },
              update: { $set: signalDoc, $setOnInsert: { createdAt: now } },
              upsert: true,
            },
          };
        });

        const bulkResult = await signalsCollection.bulkWrite(bulkOps);
        const upserted =
          (bulkResult.upsertedCount ?? 0) + (bulkResult.modifiedCount ?? 0);
        totalExtracted += upserted;
        console.log(
          `Upserted ${upserted} signals for "${buyerName}" doc "${doc.title}"`
        );
      }

      // Mark document as processed for signals
      await boardDocsCollection.updateOne(
        { _id: doc._id! },
        {
          $set: {
            signalExtractionStatus: "extracted" as const,
            updatedAt: new Date(),
          },
        }
      );
    } catch (docErr) {
      console.error(
        `Error processing doc "${doc.title}" for "${buyerName}":`,
        docErr
      );
      // Mark as failed and continue
      await boardDocsCollection.updateOne(
        { _id: doc._id! },
        {
          $set: {
            signalExtractionStatus: "failed" as const,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  return { signalCount: totalExtracted };
}
