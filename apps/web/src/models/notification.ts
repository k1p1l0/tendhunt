import mongoose, { Schema, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "NEW_CONTRACT",
        "NEW_REGION",
        "NEW_SECTOR",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    entityLink: { type: String },
    supplierName: { type: String, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract" },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export type INotification = InferSchemaType<typeof notificationSchema>;

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
