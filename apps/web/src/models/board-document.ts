import mongoose, { Schema, type InferSchemaType } from "mongoose";

const boardDocumentSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    dataSourceName: { type: String, required: true },
    title: { type: String, required: true },
    meetingDate: { type: Date },
    committeeId: { type: String },
    committeeName: { type: String },
    documentType: {
      type: String,
      enum: ["minutes", "agenda", "report", "board_pack"],
    },
    sourceUrl: { type: String, required: true },
    r2Key: { type: String },
    textContent: { type: String },
    textLength: { type: Number },
    extractionStatus: {
      type: String,
      enum: ["pending", "extracted", "failed"],
      default: "pending",
    },
    signalExtractionStatus: {
      type: String,
      enum: ["pending", "extracted", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

boardDocumentSchema.index({ buyerId: 1, sourceUrl: 1 }, { unique: true });

export type IBoardDocument = InferSchemaType<typeof boardDocumentSchema>;

const BoardDocument =
  mongoose.models.BoardDocument ||
  mongoose.model("BoardDocument", boardDocumentSchema);

export default BoardDocument;
