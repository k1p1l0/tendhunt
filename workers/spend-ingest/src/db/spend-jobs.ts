import type { Db, ObjectId } from "mongodb";
import type { SpendJobDoc, SpendIngestStage } from "../types";

const COLLECTION = "spendingestjobs";

/**
 * Get existing job for a stage, or create a new one in "running" status.
 */
export async function getOrCreateJob(
  db: Db,
  stage: SpendIngestStage
): Promise<SpendJobDoc> {
  const collection = db.collection<SpendJobDoc>(COLLECTION);

  const existing = await collection.findOne({ stage });
  if (existing) return existing;

  const now = new Date();
  const newJob: SpendJobDoc = {
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
  const collection = db.collection<SpendJobDoc>(COLLECTION);

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
  const collection = db.collection<SpendJobDoc>(COLLECTION);
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
 * Mark a job as errored with an error message.
 */
export async function markJobError(
  db: Db,
  jobId: ObjectId,
  errorMsg: string
): Promise<void> {
  const collection = db.collection<SpendJobDoc>(COLLECTION);
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
