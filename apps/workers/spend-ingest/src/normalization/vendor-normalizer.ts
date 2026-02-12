// ---------------------------------------------------------------------------
// Vendor name normalizer for consistent deduplication
// ---------------------------------------------------------------------------

const STRIP_SUFFIXES = [
  " limited",
  " ltd",
  " plc",
  " inc",
  " llp",
  " llc",
  " uk",
  " (uk)",
  " co",
  " corp",
  " corporation",
  " group",
];

/**
 * Normalize a vendor name for deduplication.
 *
 * 1. Trim and lowercase
 * 2. Strip common company suffixes (Ltd, Limited, PLC, etc.)
 * 3. Strip trailing punctuation (periods, commas, dashes)
 * 4. Collapse multiple spaces to single space
 */
export function normalizeVendor(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let normalized = raw.trim().toLowerCase();

  // Strip common suffixes (case-insensitive, already lowercased)
  for (const suffix of STRIP_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
    }
  }

  // Strip trailing punctuation
  normalized = normalized.replace(/[.,\-]+$/, "");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}
