import type { Db } from "mongodb";
import type { Env, SpendJobDoc } from "../types";

/**
 * Stage 2: Extract CSV/Excel download links from transparency pages.
 *
 * Parses discovered transparency pages to find direct links
 * to spend data files (CSV, XLS, XLSX).
 */
export async function extractCsvLinks(
  _db: Db,
  _env: Env,
  _job: SpendJobDoc,
  _maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  console.log("Stage extract_links: not yet implemented");
  return { processed: 0, errors: 0, done: true };
}
