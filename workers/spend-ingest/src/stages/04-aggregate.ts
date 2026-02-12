import type { Db } from "mongodb";
import type { Env, SpendJobDoc } from "../types";

/**
 * Stage 4: Aggregate spend data into per-buyer summaries.
 *
 * Computes SpendSummary records with category breakdowns,
 * vendor breakdowns, monthly totals, and date ranges.
 */
export async function aggregateSpendData(
  _db: Db,
  _env: Env,
  _job: SpendJobDoc,
  _maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  console.log("Stage aggregate: not yet implemented");
  return { processed: 0, errors: 0, done: true };
}
