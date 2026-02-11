/** Resolve a dot-path accessor from a row object */
export function resolveAccessor(
  row: Record<string, unknown>,
  accessor: string
): unknown {
  const parts = accessor.split(".");
  let value: unknown = row;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("en-GB");

/** Format a date value as "DD MMM YYYY" */
export function formatDate(value: unknown): string {
  if (!value) return "--";
  const d = new Date(value as string | number);
  if (isNaN(d.getTime())) return "--";
  return dateFmt.format(d);
}

/** Format a currency value as GBP */
export function formatCurrency(value: unknown): string {
  if (value == null || value === "") return "--";
  const num = Number(value);
  if (isNaN(num)) return "--";
  return currencyFmt.format(num);
}

/** Extract sorted unique non-empty string values for a column */
export function getUniqueColumnValues(
  rows: Array<Record<string, unknown>>,
  accessor: string
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const raw = resolveAccessor(row, accessor);
    if (raw == null) continue;
    const val = String(raw).trim();
    if (val !== "" && val !== "--") seen.add(val);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** Format a number */
export function formatNumber(value: unknown): string {
  if (value == null || value === "") return "--";
  const num = Number(value);
  if (isNaN(num)) return "--";
  return numberFmt.format(num);
}
