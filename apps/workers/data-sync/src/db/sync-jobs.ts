import type { Db, ObjectId } from "mongodb";
import type { SyncJob } from "../types";

/**
 * Get existing sync job for a source, or create one in "backfilling" status.
 */
export async function getOrCreateSyncJob(
  db: Db,
  source: SyncJob["source"],
  backfillStartDate: string
): Promise<SyncJob> {
  const collection = db.collection<SyncJob>("syncJobs");

  const existing = await collection.findOne({ source });
  if (existing) return existing;

  const now = new Date();
  const newJob: SyncJob = {
    source,
    status: "backfilling",
    cursor: null,
    backfillStartDate,
    lastSyncedDate: null,
    totalFetched: 0,
    lastRunAt: now,
    lastRunFetched: 0,
    lastRunErrors: 0,
    errorLog: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newJob);
  newJob._id = result.insertedId;
  return newJob;
}

/**
 * Update sync progress after processing a page.
 * Saves cursor position for crash-safe resume.
 * Caps errorLog at 100 entries via $slice.
 */
export async function updateSyncProgress(
  db: Db,
  jobId: ObjectId,
  update: {
    cursor: string | null;
    fetched: number;
    errors: number;
    totalFetched: number;
    errorMessages?: string[];
  }
): Promise<void> {
  const collection = db.collection<SyncJob>("syncJobs");

  const updateOp: Record<string, unknown> = {
    $set: {
      cursor: update.cursor,
      totalFetched: update.totalFetched,
      lastRunAt: new Date(),
      lastRunFetched: update.fetched,
      lastRunErrors: update.errors,
      updatedAt: new Date(),
    },
  };

  // Push error messages and cap at 100 entries
  if (update.errorMessages && update.errorMessages.length > 0) {
    updateOp.$push = {
      errorLog: {
        $each: update.errorMessages,
        $slice: -100,
      },
    };
  }

  await collection.updateOne({ _id: jobId }, updateOp);
}

/**
 * Mark a backfill as complete -- transitions status to "syncing".
 * Clears cursor and sets lastSyncedDate for future delta sync.
 */
export async function markSyncComplete(
  db: Db,
  jobId: ObjectId
): Promise<void> {
  const collection = db.collection<SyncJob>("syncJobs");
  await collection.updateOne(
    { _id: jobId },
    {
      $set: {
        status: "syncing" as const,
        cursor: null,
        lastSyncedDate: new Date().toISOString(),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Mark a sync job as errored with an error message.
 * Pushes to errorLog (capped at 100 entries).
 */
export async function markSyncError(
  db: Db,
  jobId: ObjectId,
  error: string
): Promise<void> {
  const collection = db.collection<SyncJob>("syncJobs");
  await collection.updateOne(
    { _id: jobId },
    {
      $set: {
        status: "error" as const,
        updatedAt: new Date(),
      },
      $push: {
        errorLog: {
          $each: [error],
          $slice: -100,
        },
      },
    }
  );
}
