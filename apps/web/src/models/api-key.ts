import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const apiKeySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    name: { type: String, required: true },
    scopes: [{ type: String }],
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

apiKeySchema.index({ userId: 1, isActive: 1 });

export type IApiKey = InferSchemaType<typeof apiKeySchema>;

if (mongoose.models.ApiKey) {
  mongoose.deleteModel("ApiKey");
}

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

export default ApiKey;
