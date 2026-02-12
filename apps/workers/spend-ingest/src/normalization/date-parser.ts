// ---------------------------------------------------------------------------
// Flexible date parser for UK council CSV formats
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8, sept: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Resolve a two-digit year: < 50 = 2000s, >= 50 = 1900s.
 */
function resolveYear(y: number): number {
  if (y < 100) {
    return y < 50 ? 2000 + y : 1900 + y;
  }
  return y;
}

/**
 * Parse a date string in various UK council formats.
 *
 * Supported formats (tried in order):
 * 1. ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * 2. DD/MM/YYYY or DD-MM-YYYY
 * 3. DD-Mon-YY or DD-Mon-YYYY (e.g., "12-Nov-25", "12-November-2025")
 * 4. MM/DD/YYYY fallback (only if day > 12 to disambiguate)
 *
 * Returns null if none match.
 */
export function parseFlexibleDate(raw: string): Date | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // 1. ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T[\d:.]+)?(?:Z|[+-]\d{2}:\d{2})?$/
  );
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = resolveYear(parseInt(dmyMatch[3], 10));

    // Only accept as DD/MM/YYYY if day <= 31 and month <= 11
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 3. DD-Mon-YY or DD-Mon-YYYY (e.g., "12-Nov-25", "12-November-2025", "12 Nov 2025")
  const dMonYMatch = trimmed.match(
    /^(\d{1,2})[\s\-/]([A-Za-z]+)[\s\-/](\d{2,4})$/
  );
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const monthName = dMonYMatch[2].toLowerCase();
    const year = resolveYear(parseInt(dMonYMatch[3], 10));
    const month = MONTH_MAP[monthName];

    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Also try Mon DD, YYYY (US-style month name format, sometimes found)
  const monDYMatch = trimmed.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/
  );
  if (monDYMatch) {
    const monthName = monDYMatch[1].toLowerCase();
    const day = parseInt(monDYMatch[2], 10);
    const year = parseInt(monDYMatch[3], 10);
    const month = MONTH_MAP[monthName];

    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 4. Fallback: MM/DD/YYYY — only if first part > 12 (can't be a month, so swap)
  if (dmyMatch) {
    const first = parseInt(dmyMatch[1], 10);
    const second = parseInt(dmyMatch[2], 10);
    if (first > 12 && second <= 12) {
      // Already handled in step 2 as DD/MM/YYYY
    } else if (second > 12 && first <= 12) {
      // This is MM/DD/YYYY
      const month = first - 1;
      const day = second;
      const year = resolveYear(parseInt(dmyMatch[3], 10));
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        return new Date(Date.UTC(year, month, day));
      }
    }
  }

  return null;
}
