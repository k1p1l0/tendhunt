import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const slackIntegrationSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    botToken: { type: String, required: true },
    channelId: { type: String },
    channelName: { type: String },
    webhookUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ISlackIntegration = InferSchemaType<typeof slackIntegrationSchema>;

if (mongoose.models.SlackIntegration) {
  mongoose.deleteModel("SlackIntegration");
}

const SlackIntegration = mongoose.model(
  "SlackIntegration",
  slackIntegrationSchema
);

export default SlackIntegration;
