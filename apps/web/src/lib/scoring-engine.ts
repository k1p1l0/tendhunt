import pLimit from "p-limit";
import { anthropic } from "@/lib/anthropic";
import type { ScannerType } from "@/models/scanner";
import { resolveModelId, resolveMaxTokens, isTextUseCase, type AIModel } from "@/lib/ai-column-config";

/**
 * Scoring engine for batch AI scoring of scanner entities.
 *
 * Uses configurable Claude models with prompt caching on the system prompt (>4096 tokens).
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
  model?: string;
  useCase?: string;
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
  columnPrompt: string,
  useCase?: string
): string {
  if (isTextUseCase(useCase)) {
    // Text-mode: strip the scoring rubric from the base prompt and use company
    // profile as context only. The base prompt includes scoring instructions
    // ("score from 1-10", rubric tables) that pollute text analysis responses.
    const profileSection = baseScoringPrompt.split("## Scoring Rubric")[0] || baseScoringPrompt;

    return `${profileSection.trim()}

---

## Current Analysis Task

${columnPrompt}

IMPORTANT: Do NOT provide a numeric score. Do NOT format your response as a score with reasoning. Instead, provide a thorough qualitative analysis as plain text.

Respond with valid JSON:
{
  "response": "<your full analysis text>"
}

Put your entire analysis in the "response" field as plain text (not JSON, not a score).`;
  }

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

    case "schools": {
      const ratingLabels: Record<number, string> = { 1: "Outstanding", 2: "Good", 3: "Requires Improvement", 4: "Inadequate" };
      const currentRating = entity.overallEffectiveness as number | undefined;
      const prevRating = entity.previousOverallEffectiveness as number | undefined;
      return `Analyze this Ofsted-inspected school:

School: ${entity.name || "Unknown"}
URN: ${entity.urn || "N/A"}
Phase: ${entity.phase || "Unknown"}
Type: ${entity.schoolType || "Unknown"}
Region: ${entity.region || "Unknown"}
Local Authority: ${entity.localAuthority || "Unknown"}
Pupils: ${entity.totalPupils || "Unknown"}
Current Overall Rating: ${currentRating ? `${currentRating} (${ratingLabels[currentRating] || "Unknown"})` : "Not rated"}
Quality of Education: ${entity.qualityOfEducation || "N/A"}
Behaviour & Attitudes: ${entity.behaviourAndAttitudes || "N/A"}
Personal Development: ${entity.personalDevelopment || "N/A"}
Leadership & Management: ${entity.leadershipAndManagement || "N/A"}
Previous Rating: ${prevRating ? `${prevRating} (${ratingLabels[prevRating] || "Unknown"})` : "N/A"}
Rating Direction: ${entity.ratingDirection || "Unknown"}
Last Downgrade Date: ${entity.lastDowngradeDate || "None"}
Downgrade Type: ${entity.downgradeType || "None"}
Last Inspection: ${entity.inspectionDate || "Unknown"}
${queryContext}`;
    }

    default:
      return `Analyze this entity:\n${JSON.stringify(entity, null, 2)}${queryContext}`;
  }
}

// ---------------------------------------------------------------------------
// Single entity scoring
// ---------------------------------------------------------------------------

/**
 * Scores a single entity against a specific AI column using the configured Claude model.
 *
 * Uses cache_control on the system prompt for prompt caching (>4096 tokens).
 */
export async function scoreOneEntity(
  entity: Record<string, unknown>,
  scannerType: ScannerType,
  systemPrompt: string,
  searchQuery?: string,
  model: AIModel = "haiku",
  useCase?: string
): Promise<{ score: number | null; reasoning: string; response: string }> {
  const userMessage = buildEntityUserPrompt(entity, scannerType, searchQuery);
  const maxRetries = 4;
  const textMode = isTextUseCase(useCase);

  const jsonSchema = textMode
    ? {
        type: "object" as const,
        properties: {
          response: {
            type: "string" as const,
            description: "Full analysis text",
          },
        },
        required: ["response"] as const,
        additionalProperties: false,
      }
    : {
        type: "object" as const,
        properties: {
          score: {
            type: ["number", "null"] as unknown as "number",
            description:
              "Score from 1.0-10.0 or null for text-only columns",
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
      };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: resolveModelId(model),
        max_tokens: resolveMaxTokens(model, useCase),
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
            schema: jsonSchema,
          },
        },
      });

      const content = response.content[0];
      if (content.type === "text") {
        let parsed: { score?: number | null; reasoning?: string; response: string };
        try {
          parsed = JSON.parse(content.text) as typeof parsed;
        } catch {
          // Truncated JSON (max_tokens hit) — attempt to salvage
          const text = content.text;
          const scoreMatch = text.match(/"score"\s*:\s*([\d.]+|null)/);
          const reasoningMatch = text.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          parsed = {
            score: scoreMatch
              ? scoreMatch[1] === "null" ? null : parseFloat(scoreMatch[1])
              : null,
            reasoning: reasoningMatch ? reasoningMatch[1] : "Response truncated",
            response: "(truncated)",
          };
        }

        if (textMode) {
          let textResponse = parsed.response || "";
          // Safety: if model returned score-mode JSON inside the response field, extract useful text
          if (textResponse.startsWith("{") && textResponse.includes('"score"')) {
            try {
              const inner = JSON.parse(textResponse) as { response?: string; reasoning?: string };
              textResponse = inner.response || inner.reasoning || textResponse;
            } catch {
              // keep original
            }
          }
          return { score: null, reasoning: "", response: textResponse };
        }

        return {
          score:
            typeof parsed.score === "number"
              ? Math.round(parsed.score * 10) / 10
              : null,
          reasoning: parsed.reasoning || "",
          response: parsed.response || "",
        };
      }

      return {
        score: null,
        reasoning: "Failed to parse response",
        response: "",
      };
    } catch (err: unknown) {
      const apiErr = err as { status?: number; headers?: Record<string, string> };

      // Retry on 429 (rate limit) and 529 (overloaded) with exponential backoff
      if (
        (apiErr.status === 429 || apiErr.status === 529) &&
        attempt < maxRetries
      ) {
        // Use retry-after header if available, otherwise exponential backoff
        const retryAfterHeader =
          apiErr.headers?.["retry-after"] ?? String(2 ** attempt * 2);
        const waitSec = Math.min(parseFloat(retryAfterHeader) || 2 ** attempt * 2, 60);
        console.log(
          `[scoring-engine] Rate limited (${apiErr.status}), retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      throw err;
    }
  }

  return { score: null, reasoning: "Max retries exceeded", response: "" };
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
  const limit = pLimit(2);

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
      column.prompt,
      column.useCase
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
            scanner.searchQuery,
            (column.model as AIModel) || "haiku",
            column.useCase
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
