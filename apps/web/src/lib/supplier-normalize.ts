/**
 * Supplier name normalization utility.
 *
 * Strips legal suffixes (Ltd, Limited, PLC, LLP, CIC, Inc, Corp, etc.),
 * normalizes whitespace, and lowercases for comparison.
 */

const LEGAL_SUFFIXES = [
  // UK forms
  "limited",
  "ltd",
  "plc",
  "llp",
  "cic",
  "lp",
  // Intl forms
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "group",
  "holdings",
  "international",
  "uk",
  "consulting",
  "services",
  "solutions",
];

// Build a regex that strips any trailing legal suffixes (possibly with dots or commas)
// e.g. "Capita Business Services Ltd." → "Capita Business Services"
const suffixPattern = new RegExp(
  `\\b(${LEGAL_SUFFIXES.join("|")})\\.?\\s*$`,
  "gi"
);

/**
 * Normalize a supplier name for comparison/matching.
 *
 * 1. Lowercase
 * 2. Strip leading/trailing whitespace
 * 3. Remove legal suffixes (Ltd, Limited, PLC, etc.)
 * 4. Remove trailing punctuation (commas, dots, dashes)
 * 5. Collapse multiple spaces into one
 * 6. Trim again after suffix removal
 */
export function normalizeSupplierName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove content in parentheses at end — e.g. "Serco (Holdings)"
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, "");

  // Strip legal suffixes iteratively (handle "Services Ltd" → "Services" → keep)
  let prev = "";
  while (prev !== normalized) {
    prev = normalized;
    normalized = normalized.replace(suffixPattern, "").trim();
  }

  // Remove trailing punctuation
  normalized = normalized.replace(/[.,\-–—]+$/, "").trim();

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");

  return normalized;
}

/**
 * Build a case-insensitive regex pattern for searching supplier names.
 * Escapes special regex characters and handles common variations.
 */
export function buildSupplierSearchPattern(query: string): RegExp {
  const normalized = normalizeSupplierName(query);

  // Escape regex special chars
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Allow flexible matching between words (optional legal suffixes, punctuation)
  // This means "capita" matches "Capita Business Services Ltd"
  return new RegExp(escaped, "i");
}

/**
 * Check if two supplier names likely refer to the same entity.
 */
export function isSameSupplier(nameA: string, nameB: string): boolean {
  return normalizeSupplierName(nameA) === normalizeSupplierName(nameB);
}
