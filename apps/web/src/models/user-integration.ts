import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const userIntegrationSchema = new Schema(
  {
    userId: { type: String, required: true },
    integrationId: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    apiKey: { type: String },
    config: { type: Schema.Types.Mixed, default: {} },
    lastTestedAt: { type: Date },
  },
  { timestamps: true }
);

userIntegrationSchema.index({ userId: 1, integrationId: 1 }, { unique: true });

export type IUserIntegration = InferSchemaType<typeof userIntegrationSchema>;

if (mongoose.models.UserIntegration) {
  mongoose.deleteModel("UserIntegration");
}

const UserIntegration = mongoose.model(
  "UserIntegration",
  userIntegrationSchema
);

export default UserIntegration;
