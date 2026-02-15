import type { Db, ObjectId } from "mongodb";
import type { EnrichmentJobDoc, EnrichmentStage, DocEnrichmentStage } from "../types";

const COLLECTION = "enrichmentjobs";

/**
 * Get existing job for a stage, or create a new one in "running" status.
 */
export async function getOrCreateJob(
  db: Db,
  stage: EnrichmentStage | DocEnrichmentStage
): Promise<EnrichmentJobDoc> {
  const collection = db.collection<EnrichmentJobDoc>(COLLECTION);

  const existing = await collection.findOne({ stage });
  if (existing) return existing;

  const now = new Date();
  const newJob: EnrichmentJobDoc = {
    stage,
    status: "running",
    cursor: null,
    batchSize: 100,
    totalProcessed: 0,
    totalErrors: 0,
    errorLog: [],
    startedAt: now,
    lastRunAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newJob);
  newJob._id = result.insertedId;
  return newJob;
}

/**
 * Update job progress after processing a batch.
 * Saves cursor position for crash-safe resume.
 */
export async function updateJobProgress(
  db: Db,
  jobId: ObjectId,
  updates: {
    cursor?: string | null;
    totalProcessed?: number;
    totalErrors?: number;
    errorMessages?: string[];
  }
): Promise<void> {
  const collection = db.collection<EnrichmentJobDoc>(COLLECTION);

  const setFields: Record<string, unknown> = {
    lastRunAt: new Date(),
    updatedAt: new Date(),
  };

  if (updates.cursor !== undefined) setFields.cursor = updates.cursor;
  if (updates.totalProcessed !== undefined)
    setFields.totalProcessed = updates.totalProcessed;
  if (updates.totalErrors !== undefined)
    setFields.totalErrors = updates.totalErrors;

  const updateOp: Record<string, unknown> = { $set: setFields };

  // Push error messages and cap at 100 entries
  if (updates.errorMessages && updates.errorMessages.length > 0) {
    updateOp.$push = {
      errorLog: {
        $each: updates.errorMessages,
        $slice: -100,
      },
    };
  }

  await collection.updateOne({ _id: jobId }, updateOp);
}

/**
 * Mark a job as complete.
 */
export async function markJobComplete(
  db: Db,
  jobId: ObjectId
): Promise<void> {
  const collection = db.collection<EnrichmentJobDoc>(COLLECTION);
  await collection.updateOne(
    { _id: jobId },
    {
      $set: {
        status: "complete" as const,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Reset all completed stage jobs back to "running" with cursor: null.
 * Called when all stages are complete to start a new enrichment cycle
 * that picks up newly added buyers.
 */
export async function resetCompletedJobs(
  db: Db,
  stages: readonly (EnrichmentStage | DocEnrichmentStage)[]
): Promise<number> {
  const collection = db.collection<EnrichmentJobDoc>(COLLECTION);
  const result = await collection.updateMany(
    { stage: { $in: stages as (EnrichmentStage | DocEnrichmentStage)[] }, status: "complete" },
    {
      $set: {
        status: "running" as const,
        cursor: null,
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount;
}

/**
 * Mark a job as errored with an error message.
 */
export async function markJobError(
  db: Db,
  jobId: ObjectId,
  errorMsg: string
): Promise<void> {
  const collection = db.collection<EnrichmentJobDoc>(COLLECTION);
  await collection.updateOne(
    { _id: jobId },
    {
      $set: {
        status: "error" as const,
        updatedAt: new Date(),
      },
      $push: {
        errorLog: {
          $each: [errorMsg],
          $slice: -100,
        },
      },
    }
  );
}
