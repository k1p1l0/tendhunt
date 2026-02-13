import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contractSchema = new Schema(
  {
    // Source fields
    ocid: { type: String, sparse: true },
    noticeId: { type: String, required: true },
    source: {
      type: String,
      enum: ["FIND_A_TENDER", "CONTRACTS_FINDER"],
      required: true,
    },
    sourceUrl: { type: String },

    // Core fields
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "AWARDED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },
    stage: {
      type: String,
      enum: ["PLANNING", "TENDER", "AWARD"],
      default: "TENDER",
    },

    // Buyer fields
    buyerName: { type: String, required: true, index: true },
    buyerOrg: { type: String },
    buyerRegion: { type: String, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", index: true },

    // Classification
    cpvCodes: [{ type: String }],
    sector: { type: String, index: true },

    // Value
    valueMin: { type: Number },
    valueMax: { type: Number },
    currency: { type: String, default: "GBP" },

    // Dates
    publishedDate: { type: Date, index: true },
    deadlineDate: { type: Date, index: true },

    // Procurement method
    procurementMethod: { type: String },
    procurementMethodDetails: { type: String },
    submissionMethod: [{ type: String }],
    submissionPortalUrl: { type: String },

    // Buyer contact from notice
    buyerContact: {
      type: new Schema(
        {
          name: { type: String },
          email: { type: String },
          telephone: { type: String },
        },
        { _id: false }
      ),
    },

    // Documents attached to the notice
    documents: [
      new Schema(
        {
          id: { type: String },
          documentType: { type: String },
          description: { type: String },
          url: { type: String },
          datePublished: { type: String },
          format: { type: String },
        },
        { _id: false }
      ),
    ],

    // Lots breakdown
    lots: [
      new Schema(
        {
          lotId: { type: String },
          title: { type: String },
          description: { type: String },
          value: { type: Number },
          currency: { type: String, default: "GBP" },
          contractPeriodDays: { type: Number },
          hasRenewal: { type: Boolean, default: false },
          renewalDescription: { type: String },
          hasOptions: { type: Boolean, default: false },
          optionsDescription: { type: String },
          variantPolicy: { type: String },
          status: { type: String },
          awardCriteria: [
            new Schema(
              {
                name: { type: String },
                criteriaType: { type: String },
                weight: { type: Number },
              },
              { _id: false }
            ),
          ],
        },
        { _id: false }
      ),
    ],
    lotCount: { type: Number },
    maxLotsBidPerSupplier: { type: Number },

    // AI scoring (Phase 5 placeholder)
    vibeScore: { type: Number, min: 0, max: 10 },
    vibeReasoning: { type: String },

    // Raw data
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Text indexes for search
contractSchema.index({ title: "text", description: "text" });

// Compound indexes
contractSchema.index({ source: 1, noticeId: 1 }, { unique: true });
contractSchema.index({ status: 1, publishedDate: -1 });
contractSchema.index({ sector: 1, status: 1 });

export type IContract = InferSchemaType<typeof contractSchema>;

const Contract =
  mongoose.models.Contract || mongoose.model("Contract", contractSchema);

export default Contract;
