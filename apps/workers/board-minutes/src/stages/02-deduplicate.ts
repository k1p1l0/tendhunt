import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Env, SignalJobDoc, SignalDoc } from "../types";
import { updateJobProgress } from "../db/signal-jobs";

// ---------------------------------------------------------------------------
// Stage 2: Deduplicate signals per buyer within 30-day windows
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function extractKeywords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .sort()
    .slice(0, 5)
    .join("-");
}

export async function deduplicateSignals(
  db: Db,
  _env: Env,
  job: SignalJobDoc,
  maxItems: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  const BATCH_SIZE = 50;
  const signalsCollection = db.collection<SignalDoc>("signals");
  const buyersCollection = db.collection("buyers");

  let processed = 0;
  let errors = 0;
  let totalDeleted = 0;
  let currentCursor = job.cursor;

  while (processed < maxItems) {
    // Cursor-paginated buyer iteration
    const buyerFilter: Record<string, unknown> = {
      dataSourceId: { $exists: true, $ne: null },
    };

    if (currentCursor) {
      buyerFilter._id = { $gt: new ObjectId(currentCursor) };
    }

    const batch = await buyersCollection
      .find(buyerFilter)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (batch.length === 0) {
      console.log(
        `Deduplication complete: ${processed} buyers, ${totalDeleted} duplicates removed, ${errors} errors`
      );
      return { processed, errors, done: true };
    }

    const errorMessages: string[] = [];

    for (const buyer of batch) {
      try {
        const buyerId = buyer._id as ObjectId;

        // Fetch all signals for this buyer, sorted by sourceDate descending
        const signals = await signalsCollection
          .find({ buyerId })
          .sort({ sourceDate: -1 })
          .toArray();

        if (signals.length < 2) continue;

        // Group by signalType
        const byType = new Map<string, SignalDoc[]>();
        for (const signal of signals) {
          const existing = byType.get(signal.signalType) ?? [];
          existing.push(signal);
          byType.set(signal.signalType, existing);
        }

        const idsToDelete: ObjectId[] = [];

        // Within each type group, compare within 30-day windows
        for (const [, group] of byType) {
          if (group.length < 2) continue;

          const seen = new Map<string, SignalDoc>();

          for (const signal of group) {
            const keyText = `${signal.title ?? ""} ${signal.insight ?? ""}`;
            const key = extractKeywords(keyText);

            if (!key) continue;

            const existing = seen.get(key);
            if (existing) {
              const existingDate = existing.sourceDate
                ? new Date(existing.sourceDate).getTime()
                : 0;
              const signalDate = signal.sourceDate
                ? new Date(signal.sourceDate).getTime()
                : 0;

              // Within 30-day window?
              if (Math.abs(existingDate - signalDate) <= THIRTY_DAYS_MS) {
                // Keep the one with higher confidence, delete the other
                if (signal.confidence > existing.confidence) {
                  idsToDelete.push(existing._id!);
                  seen.set(key, signal);
                } else {
                  idsToDelete.push(signal._id!);
                }
              } else {
                // Outside window, treat as distinct
                seen.set(key, signal);
              }
            } else {
              seen.set(key, signal);
            }
          }
        }

        if (idsToDelete.length > 0) {
          const bulkOps = idsToDelete.map((id) => ({
            deleteOne: { filter: { _id: id } },
          }));

          const result = await signalsCollection.bulkWrite(bulkOps);
          totalDeleted += result.deletedCount ?? 0;
          console.log(
            `Deduplicated ${result.deletedCount ?? 0} signals for "${buyer.name}"`
          );
        }
      } catch (err) {
        errors++;
        const msg = `Deduplication failed for buyer ${buyer._id}: ${
          err instanceof Error ? err.message : String(err)
        }`;
        console.error(msg);
        errorMessages.push(msg);
      }
    }

    processed += batch.length;
    const lastId = batch[batch.length - 1]._id!.toString();
    currentCursor = lastId;

    await updateJobProgress(db, job._id!, {
      cursor: currentCursor,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    });
  }

  console.log(
    `Deduplication paused (budget ${maxItems} reached): ${processed} processed, ${totalDeleted} deleted, ${errors} errors`
  );
  return { processed, errors, done: false };
}
