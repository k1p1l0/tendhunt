// ---------------------------------------------------------------------------
// Hybrid column mapper: known schemas + Claude Haiku AI fallback
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { KNOWN_SCHEMAS, type ColumnMapping } from "./known-schemas";

/** In-memory cache for AI-generated mappings (keyed by sorted headers hash) */
const aiMappingCache = new Map<string, ColumnMapping["map"] | null>();

/**
 * Create a cache key from headers by sorting and joining.
 */
function headersCacheKey(headers: string[]): string {
  return headers
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join("|");
}

/**
 * Parse Claude's JSON response for column mapping.
 */
function parseColumnMappingResponse(text: string): ColumnMapping["map"] | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    // Validate required fields
    if (!parsed.date || !parsed.amount || !parsed.vendor) {
      return null;
    }

    return {
      date: parsed.date,
      amount: parsed.amount,
      vendor: parsed.vendor,
      category: parsed.category ?? undefined,
      subcategory: parsed.subcategory ?? undefined,
      department: parsed.department ?? undefined,
      reference: parsed.reference ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Map CSV column headers to the unified spending data schema.
 *
 * 1. Try each known schema's detect() function against the headers
 * 2. If a known schema matches, return its map immediately (no AI call)
 * 3. If no match, call Claude Haiku with the headers and sample rows
 * 4. Cache AI-generated mappings in memory for repeat calls
 * 5. Return null if even AI can't map
 */
export async function mapColumns(
  headers: string[],
  sampleRows: string[][],
  anthropicApiKey: string
): Promise<ColumnMapping["map"] | null> {
  // Step 1: Try known schemas
  for (const schema of KNOWN_SCHEMAS) {
    if (schema.detect(headers)) {
      console.log(`Column mapping: matched known schema "${schema.name}"`);
      return schema.map;
    }
  }

  // Step 2: Check cache
  const cacheKey = headersCacheKey(headers);
  if (aiMappingCache.has(cacheKey)) {
    const cached = aiMappingCache.get(cacheKey)!;
    console.log(`Column mapping: using cached AI mapping`);
    return cached;
  }

  // Step 3: AI fallback via Claude Haiku
  console.log(`Column mapping: no known schema matched, using AI fallback`);

  try {
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Map these CSV columns to a unified spending data schema.

CSV headers: ${headers.join(", ")}
Sample rows:
${sampleRows
  .slice(0, 3)
  .map((r) => r.join(" | "))
  .join("\n")}

Map to these fields (use the exact CSV column name, or null if not found):
- date: column containing the payment/transaction date
- amount: column containing the payment amount in GBP
- vendor: column containing the supplier/payee name
- category: column containing the spend category, service area, or purpose
- subcategory: column with more specific categorization (or null)
- department: column with the council department or directorate (or null)
- reference: column with transaction/invoice number (or null)

Return ONLY valid JSON:
{ "date": "column_name", "amount": "column_name", "vendor": "column_name", "category": "column_name", "subcategory": null, "department": null, "reference": null }`,
        },
      ],
    });

    const responseText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    const mapping = parseColumnMappingResponse(responseText);

    // Cache the result (even if null) to avoid repeat AI calls
    aiMappingCache.set(cacheKey, mapping);

    if (mapping) {
      console.log(`Column mapping: AI mapped successfully`);
    } else {
      console.warn(`Column mapping: AI could not map columns`);
    }

    return mapping;
  } catch (err) {
    console.error(
      `Column mapping AI error: ${err instanceof Error ? err.message : String(err)}`
    );
    aiMappingCache.set(cacheKey, null);
    return null;
  }
}
