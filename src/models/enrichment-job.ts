import mongoose, { Schema, type InferSchemaType } from "mongoose";

const enrichmentJobSchema = new Schema(
  {
    stage: {
      type: String,
      required: true,
      enum: [
        "classify",
        "governance_urls",
        "moderngov",
        "scrape",
        "personnel",
        "score",
      ],
    },
    status: {
      type: String,
      enum: ["running", "paused", "complete", "error"],
      default: "running",
    },
    cursor: { type: String, default: null },
    batchSize: { type: Number, default: 100 },
    totalProcessed: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    errorLog: [{ type: String }],
    startedAt: { type: Date, default: Date.now },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

enrichmentJobSchema.index({ stage: 1 }, { unique: true });

export type IEnrichmentJob = InferSchemaType<typeof enrichmentJobSchema>;

const EnrichmentJob =
  mongoose.models.EnrichmentJob ||
  mongoose.model("EnrichmentJob", enrichmentJobSchema);

export default EnrichmentJob;
