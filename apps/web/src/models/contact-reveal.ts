import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contactRevealSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },
    revealedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index: each user can only reveal a buyer once
contactRevealSchema.index({ userId: 1, buyerId: 1 }, { unique: true });

export type IContactReveal = InferSchemaType<typeof contactRevealSchema>;

const ContactReveal =
  mongoose.models.ContactReveal ||
  mongoose.model("ContactReveal", contactRevealSchema);

export default ContactReveal;
