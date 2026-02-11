import mongoose, { Schema, type InferSchemaType } from "mongoose";

export type ScannerType = "rfps" | "meetings" | "buyers";

const aiColumnSchema = new Schema(
  {
    columnId: { type: String, required: true },
    name: { type: String, required: true },
    prompt: { type: String, required: true },
  },
  { _id: false }
);

const scoreEntrySchema = new Schema(
  {
    entityId: { type: Schema.Types.ObjectId, required: true },
    columnId: { type: String, required: true },
    score: { type: Number, min: 0, max: 10 },
    value: { type: String },
    reasoning: { type: String },
  },
  { _id: false }
);

const scannerSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["rfps", "meetings", "buyers"],
      required: true,
    },
    searchQuery: { type: String, default: "" },
    filters: {
      sector: { type: String },
      region: { type: String },
      valueMin: { type: Number },
      valueMax: { type: Number },
      deadline: { type: Date },
      signalType: { type: String },
      dateFrom: { type: Date },
      dateTo: { type: Date },
    },
    aiColumns: [aiColumnSchema],
    scores: [scoreEntrySchema],
    lastScoredAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for efficient lookups
scannerSchema.index({ userId: 1, type: 1 });
scannerSchema.index({ userId: 1, updatedAt: -1 });

export type IScanner = InferSchemaType<typeof scannerSchema>;

const Scanner =
  mongoose.models.Scanner || mongoose.model("Scanner", scannerSchema);

export default Scanner;
