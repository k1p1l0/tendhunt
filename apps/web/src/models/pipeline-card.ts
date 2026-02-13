import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

import { STAGE_ORDER } from "@/lib/constants/pipeline-stages";

const pipelineCardSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ["contract", "buyer", "signal"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    value: { type: Number },
    currency: { type: String, default: "GBP" },
    deadlineDate: { type: Date },
    sector: { type: String },
    buyerName: { type: String },
    logoUrl: { type: String },
    stage: {
      type: String,
      enum: STAGE_ORDER,
      default: "NEW",
      index: true,
    },
    position: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    addedBy: {
      type: String,
      enum: ["manual", "auto_rule"],
      default: "manual",
    },
    autoRuleId: { type: String },
    stageChangedAt: { type: Date },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

pipelineCardSchema.index({ userId: 1, stage: 1, position: 1 });
pipelineCardSchema.index(
  { userId: 1, entityType: 1, entityId: 1 },
  { unique: true }
);
pipelineCardSchema.index({ userId: 1, isArchived: 1 });

export type IPipelineCard = InferSchemaType<typeof pipelineCardSchema>;

if (mongoose.models.PipelineCard) {
  mongoose.deleteModel("PipelineCard");
}

const PipelineCard = mongoose.model("PipelineCard", pipelineCardSchema);

export default PipelineCard;
