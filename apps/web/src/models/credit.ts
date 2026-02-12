import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Credit Account schema
const creditAccountSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true }, // Clerk user ID
    balance: { type: Number, required: true, default: 10, min: 0 },
    totalEarned: { type: Number, default: 10 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Credit Transaction schema
const creditTransactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["SIGNUP_BONUS", "CONTACT_REVEAL", "PURCHASE", "REFUND"],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credits in, negative = credits out
    description: { type: String },
    contactId: { type: String }, // reference to revealed contact (optional)
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

export type ICreditAccount = InferSchemaType<typeof creditAccountSchema>;
export type ICreditTransaction = InferSchemaType<
  typeof creditTransactionSchema
>;

export const CreditAccount =
  mongoose.models.CreditAccount ||
  mongoose.model("CreditAccount", creditAccountSchema);

export const CreditTransaction =
  mongoose.models.CreditTransaction ||
  mongoose.model("CreditTransaction", creditTransactionSchema);
