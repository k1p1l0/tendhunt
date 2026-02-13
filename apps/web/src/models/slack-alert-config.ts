import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const slackAlertConfigSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    slackIntegrationId: {
      type: Schema.Types.ObjectId,
      ref: "SlackIntegration",
      required: true,
    },
    alertType: {
      type: String,
      required: true,
      enum: [
        "scanner_threshold",
        "daily_digest",
        "new_contracts",
        "new_signals",
      ],
    },
    scannerId: {
      type: Schema.Types.ObjectId,
      ref: "Scanner",
    },
    columnId: { type: String },
    threshold: { type: Number, min: 0, max: 10 },
    digestTime: { type: String },
    digestDays: { type: [Number] },
    channelOverride: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

slackAlertConfigSchema.index(
  { userId: 1, alertType: 1, scannerId: 1, columnId: 1 },
  { unique: true }
);

export type ISlackAlertConfig = InferSchemaType<typeof slackAlertConfigSchema>;

if (mongoose.models.SlackAlertConfig) {
  mongoose.deleteModel("SlackAlertConfig");
}

const SlackAlertConfig = mongoose.model(
  "SlackAlertConfig",
  slackAlertConfigSchema
);

export default SlackAlertConfig;
