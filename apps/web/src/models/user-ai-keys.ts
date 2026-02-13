import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const userAiKeysSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    anthropicApiKey: { type: String },
    openaiApiKey: { type: String },
    preferredProvider: {
      type: String,
      enum: ["anthropic", "openai"],
      default: "anthropic",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type IUserAiKeys = InferSchemaType<typeof userAiKeysSchema>;

if (mongoose.models.UserAiKeys) {
  mongoose.deleteModel("UserAiKeys");
}

const UserAiKeys = mongoose.model("UserAiKeys", userAiKeysSchema);

export default UserAiKeys;
