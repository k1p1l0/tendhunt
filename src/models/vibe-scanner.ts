import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contractScoreSchema = new Schema(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    score: { type: Number, min: 0, max: 10, required: true },
    reasoning: { type: String, required: true },
  },
  { _id: false }
);

const buyerScoreSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    score: { type: Number, min: 0, max: 10, required: true },
    reasoning: { type: String, required: true },
  },
  { _id: false }
);

const vibeScannerSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    companyProfileId: {
      type: Schema.Types.ObjectId,
      ref: "CompanyProfile",
    },
    scoringPrompt: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
    lastScoredAt: { type: Date },
    contractScores: [contractScoreSchema],
    buyerScores: [buyerScoreSchema],
    threshold: { type: Number, default: 5.0, min: 0, max: 10 },
  },
  { timestamps: true }
);

// Compound indexes for efficient lookups
vibeScannerSchema.index({ userId: 1, "contractScores.contractId": 1 });
vibeScannerSchema.index({ userId: 1, "contractScores.score": -1 });

export type IVibeScanner = InferSchemaType<typeof vibeScannerSchema>;

const VibeScanner =
  mongoose.models.VibeScanner ||
  mongoose.model("VibeScanner", vibeScannerSchema);

export default VibeScanner;
