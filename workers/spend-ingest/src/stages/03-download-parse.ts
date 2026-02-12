import type { Db } from "mongodb";
import type { Env, SpendJobDoc } from "../types";

/**
 * Stage 3: Download and parse CSV/Excel spend data files.
 *
 * Downloads spend data files, parses them with PapaParse,
 * normalizes vendor names, and upserts SpendTransaction records.
 */
export async function downloadAndParseCsvs(
  _db: Db,
  _env: Env,
  _job: SpendJobDoc,
  _maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  console.log("Stage download_parse: not yet implemented");
  return { processed: 0, errors: 0, done: true };
}
