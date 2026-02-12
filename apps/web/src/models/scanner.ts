import mongoose, { Schema, type InferSchemaType } from "mongoose";

export type ScannerType = "rfps" | "meetings" | "buyers";

const aiColumnSchema = new Schema(
  {
    columnId: { type: String, required: true },
    name: { type: String, required: true },
    prompt: { type: String, required: true },
    useCase: {
      type: String,
      enum: ["score", "research", "decision-makers", "bid-recommendation", "find-contacts"],
      default: "score",
    },
    model: {
      type: String,
      enum: ["haiku", "sonnet", "opus"],
      default: "haiku",
    },
  },
  { _id: false }
);

const customColumnSchema = new Schema(
  {
    columnId: { type: String, required: true },
    name: { type: String, required: true },
    accessor: { type: String, required: true },
    dataType: {
      type: String,
      enum: [
        "text",
        "number",
        "date",
        "currency",
        "badge",
        "url",
        "email",
        "checkbox",
        "paragraph",
      ],
      required: true,
    },
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
    customColumns: [customColumnSchema],
    scores: [scoreEntrySchema],
    columnRenames: { type: Map, of: String, default: new Map() },
    columnFilters: { type: Map, of: [String], default: new Map() },
    autoRun: { type: Boolean, default: false },
    lastScoredAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for efficient lookups
scannerSchema.index({ userId: 1, type: 1 });
scannerSchema.index({ userId: 1, updatedAt: -1 });

export type IScanner = InferSchemaType<typeof scannerSchema>;

// Delete cached model so HMR picks up schema changes (e.g. new customColumns field)
if (mongoose.models.Scanner) {
  mongoose.deleteModel("Scanner");
}

const Scanner = mongoose.model("Scanner", scannerSchema);

export default Scanner;
