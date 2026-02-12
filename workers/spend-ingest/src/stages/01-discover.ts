import type { Db } from "mongodb";
import type { Env, SpendJobDoc } from "../types";

/**
 * Stage 1: Discover transparency pages on buyer websites.
 *
 * Crawls buyer websites looking for transparency/spending pages
 * that contain links to CSV/Excel spend data files.
 */
export async function discoverTransparencyPages(
  _db: Db,
  _env: Env,
  _job: SpendJobDoc,
  _maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  console.log("Stage discover: not yet implemented");
  return { processed: 0, errors: 0, done: true };
}
