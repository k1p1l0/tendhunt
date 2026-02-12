import mongoose, { Schema, type InferSchemaType } from "mongoose";

const categoryBreakdownSchema = new Schema(
  {
    category: { type: String, required: true },
    total: { type: Number, required: true },
    count: { type: Number, required: true },
  },
  { _id: false }
);

const vendorBreakdownSchema = new Schema(
  {
    vendor: { type: String, required: true },
    total: { type: Number, required: true },
    count: { type: Number, required: true },
  },
  { _id: false }
);

const monthlyTotalSchema = new Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const spendSummarySchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      unique: true,
    },
    totalTransactions: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    dateRange: {
      earliest: { type: Date },
      latest: { type: Date },
    },
    categoryBreakdown: [categoryBreakdownSchema],
    vendorBreakdown: [vendorBreakdownSchema],
    monthlyTotals: [monthlyTotalSchema],
    csvFilesProcessed: [{ type: String }],
    lastComputedAt: { type: Date },
  },
  { timestamps: true }
);

export type ISpendSummary = InferSchemaType<typeof spendSummarySchema>;

const SpendSummary =
  mongoose.models.SpendSummary ||
  mongoose.model("SpendSummary", spendSummarySchema);

export default SpendSummary;
