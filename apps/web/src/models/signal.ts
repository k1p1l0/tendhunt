import mongoose, { Schema, type InferSchemaType } from "mongoose";

const signalSchema = new Schema(
  {
    organizationName: { type: String, required: true, index: true },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
    },
    signalType: {
      type: String,
      enum: [
        "PROCUREMENT",
        "STAFFING",
        "STRATEGY",
        "FINANCIAL",
        "PROJECTS",
        "REGULATORY",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    insight: { type: String, required: true },
    source: { type: String },
    sourceDate: { type: Date, index: true },
    sector: { type: String, index: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
  },
  { timestamps: true }
);

signalSchema.index({ title: "text", insight: "text" });

export type ISignal = InferSchemaType<typeof signalSchema>;

const Signal =
  mongoose.models.Signal || mongoose.model("Signal", signalSchema);

export default Signal;
