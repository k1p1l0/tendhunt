import type { Db, ObjectId } from "mongodb";

export type PipelineWorker = "enrichment" | "spend-ingest" | "board-minutes" | "data-sync";
export type PipelineErrorType = "api_403" | "timeout" | "parse_error" | "unreachable" | "no_data" | "rate_limit" | "other";

interface PipelineErrorInput {
  worker: PipelineWorker;
  stage: string;
  buyerId?: ObjectId;
  buyerName?: string;
  errorType: PipelineErrorType;
  message: string;
  url?: string;
}

export async function reportPipelineError(
  db: Db,
  error: PipelineErrorInput
): Promise<void> {
  try {
    await db.collection("pipelineerrors").insertOne({
      ...error,
      resolvedAt: null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to report pipeline error:", err);
  }
}
