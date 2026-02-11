import pLimit from "p-limit";
import { anthropic } from "@/lib/anthropic";
import type { ScannerType } from "@/models/scanner";

/**
 * Scoring engine for batch AI scoring of scanner entities.
 *
 * Uses Claude Haiku 4.5 with prompt caching on the system prompt (>4096 tokens).
 * Async generator pattern yields structured events for SSE streaming.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringEvent {
  type:
    | "column_start"
    | "progress"
    | "column_complete"
    | "complete"
    | "error";
  columnId?: string;
  columnName?: string;
  entityId?: string;
  score?: number | null;
  reasoning?: string;
  response?: string;
  scored?: number;
  total?: number;
}

interface AIColumn {
  columnId: string;
  name: string;
  prompt: string;
}

interface ScannerLike {
  aiColumns: AIColumn[];
  searchQuery?: string;
  type: ScannerType;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt for a specific AI column.
 *
 * Combines the base scoring prompt (company profile context, >4096 tokens for
 * Haiku prompt caching) with the specific AI column's evaluation instructions.
 */
export function buildScoringSystemPrompt(
  baseScoringPrompt: string,
  columnPrompt: string
): string {
  return `${baseScoringPrompt}

---

## Current Analysis Task

${columnPrompt}

Respond with valid JSON:
{
  "score": <number 1.0-10.0 or null if not applicable>,
  "reasoning": "<1-2 sentence explanation>",
  "response": "<full analysis text>"
}

The "score" field should be a number between 1.0 and 10.0 for relevance/scoring columns. Set it to null for columns that produce text responses (like identifying key contacts). The "response" field contains the full analysis text.`;
}

/**
 * Constructs the user message from entity data depending on scanner type.
 */
export function buildEntityUserPrompt(
  entity: Record<string, unknown>,
  scannerType: ScannerType,
  searchQuery?: string
): string {
  const queryContext = searchQuery
    ? `\nSearch Query Context: ${searchQuery}`
    : "";

  switch (scannerType) {
    case "rfps":
      return `Analyze this contract:

Title: ${entity.title || "Unknown"}
Buyer: ${entity.buyerName || "Unknown"}
Description: ${((entity.description as string) || "").substring(0, 2000)}
Sector: ${entity.sector || "Unknown"}
Region: ${entity.buyerRegion || "Unknown"}
Value: ${entity.valueMin || "N/A"}-${entity.valueMax || "N/A"} GBP
CPV Codes: ${Array.isArray(entity.cpvCodes) ? entity.cpvCodes.join(", ") : "None"}
Deadline: ${entity.deadlineDate || "Not specified"}
${queryContext}`;

    case "meetings":
      return `Analyze this board meeting signal:

Organization: ${entity.organizationName || "Unknown"}
Signal Type: ${entity.signalType || "Unknown"}
Title: ${entity.title || "Unknown"}
Insight: ${entity.insight || "No insight available"}
Sector: ${entity.sector || "Unknown"}
Source Date: ${entity.sourceDate || "Unknown"}
${queryContext}`;

    case "buyers":
      return `Analyze this buyer organization:

Organization: ${entity.name || "Unknown"}
Sector: ${entity.sector || "Unknown"}
Region: ${entity.region || "Unknown"}
Description: ${((entity.description as string) || "").substring(0, 1000)}
Contract Count: ${entity.contractCount || 0}
Website: ${entity.website || "Not available"}
${queryContext}`;

    default:
      return `Analyze this entity:\n${JSON.stringify(entity, null, 2)}${queryContext}`;
  }
}

// ---------------------------------------------------------------------------
// Single entity scoring
// ---------------------------------------------------------------------------

/**
 * Scores a single entity against a specific AI column using Claude Haiku 4.5.
 *
 * Uses cache_control on the system prompt for prompt caching (>4096 tokens).
 */
export async function scoreOneEntity(
  entity: Record<string, unknown>,
  scannerType: ScannerType,
  systemPrompt: string,
  searchQuery?: string
): Promise<{ score: number | null; reasoning: string; response: string }> {
  const userMessage = buildEntityUserPrompt(entity, scannerType, searchQuery);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    output_config: {
      format: {
        type: "json_schema" as const,
        schema: {
          type: "object" as const,
          properties: {
            score: {
              type: ["number", "null"] as unknown as "number",
              description: "Score from 1.0-10.0 or null for text-only columns",
            },
            reasoning: {
              type: "string" as const,
              description: "1-2 sentence explanation of the score",
            },
            response: {
              type: "string" as const,
              description: "Full analysis text",
            },
          },
          required: ["score", "reasoning", "response"] as const,
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.content[0];
  if (content.type === "text") {
    const parsed = JSON.parse(content.text) as {
      score: number | null;
      reasoning: string;
      response: string;
    };
    return {
      score:
        typeof parsed.score === "number"
          ? Math.round(parsed.score * 10) / 10
          : null,
      reasoning: parsed.reasoning || "",
      response: parsed.response || "",
    };
  }

  return { score: null, reasoning: "Failed to parse response", response: "" };
}

// ---------------------------------------------------------------------------
// Batch scoring (async generator)
// ---------------------------------------------------------------------------

/**
 * Batch-scores all entities across all AI columns for a scanner.
 *
 * Yields structured ScoringEvent objects that can be serialised directly
 * to SSE `data:` frames. Uses p-limit(5) to stay within API rate limits.
 *
 * Per-entity error handling ensures one failure does not block the batch.
 */
export async function* scoreEntities(
  scanner: ScannerLike,
  entities: Array<Record<string, unknown>>,
  baseScoringPrompt: string
): AsyncGenerator<ScoringEvent> {
  const limit = pLimit(5);

  for (const column of scanner.aiColumns) {
    // Notify: column starting
    yield {
      type: "column_start",
      columnId: column.columnId,
      columnName: column.name,
      total: entities.length,
    };

    // Build the system prompt for this column (cached across entities)
    const systemPrompt = buildScoringSystemPrompt(
      baseScoringPrompt,
      column.prompt
    );

    let scored = 0;

    // Score all entities for this column concurrently (max 5 at a time)
    const promises = entities.map((entity) =>
      limit(async (): Promise<ScoringEvent> => {
        const entityId = String(
          entity._id || entity.id || "unknown"
        );

        try {
          const result = await scoreOneEntity(
            entity,
            scanner.type,
            systemPrompt,
            scanner.searchQuery
          );

          scored++;

          return {
            type: "progress",
            columnId: column.columnId,
            entityId,
            score: result.score,
            reasoning: result.reasoning,
            response: result.response,
            scored,
            total: entities.length,
          };
        } catch (err) {
          console.error(
            `Scoring error [${column.columnId}] entity ${entityId}:`,
            err
          );

          scored++;

          return {
            type: "error",
            columnId: column.columnId,
            entityId,
            scored,
            total: entities.length,
          };
        }
      })
    );

    // Yield events as they resolve (order not guaranteed due to concurrency)
    const results = await Promise.all(promises);
    for (const event of results) {
      yield event;
    }

    // Notify: column complete
    yield {
      type: "column_complete",
      columnId: column.columnId,
      scored,
    };
  }

  // All columns done
  yield { type: "complete" };
}
