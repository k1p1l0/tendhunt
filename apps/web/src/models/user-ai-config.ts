import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const userAiConfigSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    anthropicApiKey: { type: String },
    preferredScoringModel: {
      type: String,
      default: "claude-haiku-4-5-20251001",
    },
    preferredAgentModel: {
      type: String,
      default: "claude-sonnet-4-5-20250929",
    },
    useOwnKey: { type: Boolean, default: false },
    keyValidatedAt: { type: Date },
  },
  { timestamps: true }
);

export type IUserAiConfig = InferSchemaType<typeof userAiConfigSchema>;

const UserAiConfig =
  mongoose.models.UserAiConfig ||
  mongoose.model("UserAiConfig", userAiConfigSchema);

export default UserAiConfig;
