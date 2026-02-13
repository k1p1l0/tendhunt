import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

import { STAGE_ORDER } from "@/lib/constants/pipeline-stages";

const autoSendRuleSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    scannerId: {
      type: Schema.Types.ObjectId,
      ref: "Scanner",
      required: true,
    },
    scannerName: { type: String },
    columnId: { type: String, required: true },
    columnName: { type: String },
    threshold: { type: Number, required: true, min: 0, max: 10 },
    stage: {
      type: String,
      enum: STAGE_ORDER,
      default: "NEW",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

autoSendRuleSchema.index(
  { userId: 1, scannerId: 1, columnId: 1 },
  { unique: true }
);

export type IAutoSendRule = InferSchemaType<typeof autoSendRuleSchema>;

if (mongoose.models.AutoSendRule) {
  mongoose.deleteModel("AutoSendRule");
}

const AutoSendRule = mongoose.model("AutoSendRule", autoSendRuleSchema);

export default AutoSendRule;
