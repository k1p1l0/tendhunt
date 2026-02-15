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

const linkedinSchema = new Schema(
  {
    id: { type: String },
    universalName: { type: String },
    tagline: { type: String },
    companyType: { type: String },
    foundedYear: { type: Number },
    followerCount: { type: Number },
    employeeCountRange: {
      start: { type: Number },
      end: { type: Number },
    },
    specialities: [{ type: Schema.Types.Mixed }],
    industries: [{ type: Schema.Types.Mixed }],
    locations: [{ type: Schema.Types.Mixed }],
    logos: [{ type: Schema.Types.Mixed }],
    backgroundCovers: [{ type: Schema.Types.Mixed }],
    phone: { type: String },
    fundingData: { type: Schema.Types.Mixed },
    lastFetchedAt: { type: Date },
  },
  { _id: false }
);

const buyerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    nameLower: { type: String, unique: true, sparse: true },
    orgId: { type: String, unique: true, sparse: true },
    sector: { type: String, index: true },
    region: { type: String, index: true },
    website: { type: String },
    description: { type: String },
    address: { type: String },
    industry: { type: String },
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
    linkedin: { type: linkedinSchema },
    enrichmentSources: [{ type: String }],
    lastEnrichedAt: { type: Date },
    enrichmentVersion: { type: Number, default: 0 },
    enrichmentPriority: { type: Number, default: 0, index: true },

    // Parent-child hierarchy (single-level only)
    parentBuyerId: { type: Schema.Types.ObjectId, ref: "Buyer", index: true },
    childBuyerIds: [{ type: Schema.Types.ObjectId, ref: "Buyer" }],
    isParent: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound indexes for enrichment worker queries
buyerSchema.index({ enrichmentSources: 1, orgType: 1 });
buyerSchema.index({ dataSourceId: 1, lastEnrichedAt: 1 });

export type IBuyer = InferSchemaType<typeof buyerSchema>;

const Buyer = mongoose.models.Buyer || mongoose.model("Buyer", buyerSchema);

export default Buyer;
