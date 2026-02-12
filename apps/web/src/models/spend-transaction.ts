import mongoose, { Schema, type InferSchemaType } from "mongoose";

const spendTransactionSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true },
    vendor: { type: String, required: true },
    vendorNormalized: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String },
    department: { type: String },
    reference: { type: String },
    sourceFile: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
spendTransactionSchema.index({ buyerId: 1, date: -1 });
spendTransactionSchema.index({ buyerId: 1, category: 1 });
spendTransactionSchema.index({ buyerId: 1, vendorNormalized: 1 });

export type ISpendTransaction = InferSchemaType<typeof spendTransactionSchema>;

const SpendTransaction =
  mongoose.models.SpendTransaction ||
  mongoose.model("SpendTransaction", spendTransactionSchema);

export default SpendTransaction;
