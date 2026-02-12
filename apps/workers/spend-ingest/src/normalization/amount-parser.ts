// ---------------------------------------------------------------------------
// Amount parser for UK council CSV formats
// ---------------------------------------------------------------------------

/**
 * Parse a monetary amount string to a number.
 *
 * Handles:
 * - Parentheses as negative: "(1,234.56)" -> -1234.56
 * - CR/DR prefix: "CR 500.00" -> -500.00 (credit = negative)
 * - Currency symbols: strip GBP, £, $, etc.
 * - Comma thousands separators: "1,234,567.89" -> 1234567.89
 * - Negative sign: "-1234.56" -> -1234.56
 *
 * Returns 0 for unparseable values.
 */
export function parseAmount(raw: string): number {
  if (!raw || typeof raw !== "string") return 0;

  let trimmed = raw.trim();
  if (trimmed.length === 0) return 0;

  // Check for parentheses-negative: "(1,234.56)" or "( 1,234.56 )"
  let isNegative = false;
  const parenMatch = trimmed.match(/^\((.+)\)$/);
  if (parenMatch) {
    isNegative = true;
    trimmed = parenMatch[1].trim();
  }

  // Check for CR prefix (credit = negative in accounting)
  if (/^CR\b/i.test(trimmed)) {
    isNegative = true;
    trimmed = trimmed.replace(/^CR\s*/i, "");
  }

  // Check for DR prefix (debit = positive, but strip the prefix)
  if (/^DR\b/i.test(trimmed)) {
    trimmed = trimmed.replace(/^DR\s*/i, "");
  }

  // Strip currency symbols and whitespace
  trimmed = trimmed.replace(/[£$€¥\s]/g, "");

  // Strip "GBP" text
  trimmed = trimmed.replace(/GBP/gi, "");

  // Check for negative sign
  if (trimmed.startsWith("-")) {
    isNegative = !isNegative; // Double negative = positive
    trimmed = trimmed.slice(1);
  }

  // Remove comma thousands separators
  trimmed = trimmed.replace(/,/g, "");

  // Parse the number
  const value = parseFloat(trimmed);
  if (isNaN(value)) return 0;

  return isNegative ? -value : value;
}
