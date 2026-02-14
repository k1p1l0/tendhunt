import type { Db } from "mongodb";
import type { Env, EnrichmentStage, EnrichmentJobDoc, StageFn } from "./types";
import { STAGE_ORDER } from "./types";
import {
  getOrCreateJob,
  markJobComplete,
  markJobError,
} from "./db/enrichment-jobs";
import { linkParentBuyers } from "./stages/00-parent-link";
import { classifyBuyers } from "./stages/01-classify";
import { discoverWebsites } from "./stages/01b-website-discovery";
import { enrichLogoLinkedin } from "./stages/01c-logo-linkedin";
import { mapGovernanceUrls } from "./stages/02-governance-urls";
import { fetchModernGovData } from "./stages/03-moderngov";
import { scrapeGovernancePages } from "./stages/04-scrape";
import { extractKeyPersonnel } from "./stages/05-personnel";
import { computeEnrichmentScores } from "./stages/06-score";

// ---------------------------------------------------------------------------
// Stage registry — maps stage name to its implementation function
// ---------------------------------------------------------------------------

const STAGE_FUNCTIONS: Record<EnrichmentStage, StageFn> = {
  parent_link: linkParentBuyers,
  classify: classifyBuyers,
  website_discovery: discoverWebsites,
  logo_linkedin: enrichLogoLinkedin,
  governance_urls: mapGovernanceUrls,
  moderngov: fetchModernGovData,
  scrape: scrapeGovernancePages,
  personnel: extractKeyPersonnel,
  score: computeEnrichmentScores,
};

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

/**
 * Process the enrichment pipeline.
 *
 * Determines the current stage by finding the first incomplete stage in order,
 * then runs that stage's function. Stages process buyers in batches with
 * cursor-based resume for crash-safe operation across Worker invocations.
 *
 * @param db - MongoDB database connection
 * @param env - Worker environment bindings
 * @param maxItemsPerRun - Maximum items to process per invocation (default 500)
 * @returns Stage name, items processed, errors, and whether stage completed
 */
export async function processEnrichmentPipeline(
  db: Db,
  env: Env,
  maxItemsPerRun: number = 500
): Promise<{ stage: string; processed: number; errors: number; done: boolean }> {
  // Find the first incomplete stage
  const currentStage = await findCurrentStage(db);

  if (!currentStage) {
    console.log("All enrichment stages complete.");
    return { stage: "all_complete", processed: 0, errors: 0, done: true };
  }

  console.log(`Current enrichment stage: ${currentStage}`);

  // Get or create the job tracker for this stage
  const job = await getOrCreateJob(db, currentStage);

  // If job was previously errored, resume it
  if (job.status === "error") {
    console.log(`Resuming errored job for stage ${currentStage} from cursor ${job.cursor}`);
  }

  // Look up the stage function (all 8 stages are implemented)
  const stageFn = STAGE_FUNCTIONS[currentStage];

  // Execute the stage
  try {
    const result = await stageFn(db, env, job, maxItemsPerRun);

    // If stage completed all buyers, mark job as complete
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
async function findCurrentStage(db: Db): Promise<EnrichmentStage | null> {
  for (const stage of STAGE_ORDER) {
    const job = await getOrCreateJob(db, stage);

    // If this stage is not complete, it's the current stage
    if (job.status !== "complete") {
      return stage;
    }
  }

  return null;
}
