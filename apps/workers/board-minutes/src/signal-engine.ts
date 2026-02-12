import type { Db } from "mongodb";
import type { Env, SignalIngestStage, StageFn } from "./types";
import { STAGE_ORDER } from "./types";
import {
  getOrCreateJob,
  markJobComplete,
  markJobError,
} from "./db/signal-jobs";

// ---------------------------------------------------------------------------
// Stage registry -- maps stage name to its implementation function
// Placeholder stages will be replaced by Plan 03 with real extraction logic.
// ---------------------------------------------------------------------------

const extractSignalsPlaceholder: StageFn = async (_db, _env, _job, _maxItems) => {
  console.log("Stage extract_signals not yet implemented (placeholder)");
  return { processed: 0, errors: 0, done: true };
};

const deduplicatePlaceholder: StageFn = async (_db, _env, _job, _maxItems) => {
  console.log("Stage deduplicate not yet implemented (placeholder)");
  return { processed: 0, errors: 0, done: true };
};

const STAGE_FUNCTIONS: Record<SignalIngestStage, StageFn> = {
  extract_signals: extractSignalsPlaceholder,
  deduplicate: deduplicatePlaceholder,
};

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

/**
 * Process the signal ingest pipeline.
 *
 * Determines the current stage by finding the first incomplete stage in order,
 * then runs that stage's function. Stages process buyers in batches with
 * cursor-based resume for crash-safe operation across Worker invocations.
 *
 * @param db - MongoDB database connection
 * @param env - Worker environment bindings
 * @param maxItemsPerRun - Maximum items to process per invocation (default 100)
 * @returns Stage name, items processed, errors, and whether stage completed
 */
export async function processSignalPipeline(
  db: Db,
  env: Env,
  maxItemsPerRun: number = 100
): Promise<{ stage: string; processed: number; errors: number; done: boolean }> {
  // Find the first incomplete stage
  const currentStage = await findCurrentStage(db);

  if (!currentStage) {
    console.log("All signal ingest stages complete.");
    return { stage: "all_complete", processed: 0, errors: 0, done: true };
  }

  console.log(`Current signal ingest stage: ${currentStage}`);

  // Get or create the job tracker for this stage
  const job = await getOrCreateJob(db, currentStage);

  // If job was previously errored, resume it
  if (job.status === "error") {
    console.log(`Resuming errored job for stage ${currentStage} from cursor ${job.cursor}`);
  }

  // Look up the stage function
  const stageFn = STAGE_FUNCTIONS[currentStage];

  // Execute the stage
  try {
    const result = await stageFn(db, env, job, maxItemsPerRun);

    // If stage completed all items, mark job as complete
    if (result.done) {
      await markJobComplete(db, job._id!);
      console.log(
        `Stage ${currentStage} complete: processed=${result.processed}, errors=${result.errors}`
      );
    } else {
      console.log(
        `Stage ${currentStage} paused (budget reached): processed=${result.processed}, errors=${result.errors}`
      );
    }

    return { stage: currentStage, ...result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await markJobError(db, job._id!, errorMsg);
    console.error(`Stage ${currentStage} failed:`, errorMsg);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the first incomplete stage in the pipeline order.
 * Returns null if all stages are complete.
 */
async function findCurrentStage(db: Db): Promise<SignalIngestStage | null> {
  for (const stage of STAGE_ORDER) {
    const job = await getOrCreateJob(db, stage);

    // If this stage is not complete, it's the current stage
    if (job.status !== "complete") {
      return stage;
    }
  }

  return null;
}
