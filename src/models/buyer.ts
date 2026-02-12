import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contactSchema = new Schema(
  {
    name: { type: String },
    title: { type: String },
    email: { type: String },
    phone: { type: String },
    linkedIn: { type: String },
    isRevealed: { type: Boolean, default: false },
  },
  { _id: false }
);

const buyerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    orgId: { type: String, unique: true, sparse: true },
    sector: { type: String, index: true },
    region: { type: String, index: true },
    website: { type: String },
    description: { type: String },
    contractCount: { type: Number, default: 0 },
    contacts: [contactSchema],
    vibeScore: { type: Number, min: 0, max: 10 },
    vibeReasoning: { type: String },
    orgType: { type: String, index: true },
    orgSubType: { type: String },
    dataSourceId: { type: Schema.Types.ObjectId, ref: "DataSource" },
    democracyPortalUrl: { type: String },
    democracyPlatform: { type: String },
    boardPapersUrl: { type: String },
    staffCount: { type: Number },
    annualBudget: { type: Number },
    enrichmentScore: { type: Number, min: 0, max: 100 },
    logoUrl: { type: String },
    linkedinUrl: { type: String },
    enrichmentSources: [{ type: String }],
    lastEnrichedAt: { type: Date },
    enrichmentVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type IBuyer = InferSchemaType<typeof buyerSchema>;

const Buyer = mongoose.models.Buyer || mongoose.model("Buyer", buyerSchema);

export default Buyer;
