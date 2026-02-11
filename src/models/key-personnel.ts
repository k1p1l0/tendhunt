import mongoose, { Schema, type InferSchemaType } from "mongoose";

const keyPersonnelSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    title: { type: String },
    role: {
      type: String,
      enum: [
        "chief_executive",
        "director",
        "board_member",
        "procurement_lead",
        "finance_director",
        "cfo",
        "cto",
        "chair",
        "councillor",
        "committee_chair",
      ],
    },
    department: { type: String },
    email: { type: String },
    phone: { type: String },
    sourceUrl: { type: String },
    extractionMethod: {
      type: String,
      enum: ["moderngov_api", "website_scrape", "claude_haiku"],
    },
    confidence: { type: Number, min: 0, max: 100 },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

keyPersonnelSchema.index({ buyerId: 1, name: 1 }, { unique: true });

export type IKeyPersonnel = InferSchemaType<typeof keyPersonnelSchema>;

const KeyPersonnel =
  mongoose.models.KeyPersonnel ||
  mongoose.model("KeyPersonnel", keyPersonnelSchema);

export default KeyPersonnel;
