import mongoose, { Schema, type InferSchemaType } from "mongoose";

const supplierSnapshotSchema = new Schema(
  {
    sectors: [{ type: String }],
    regions: [{ type: String }],
    contractCount: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    snapshotAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const watchlistSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    supplierName: { type: String, required: true },
    normalizedName: { type: String, required: true, index: true },
    notifyEmail: { type: Boolean, default: false },
    lastSnapshot: { type: supplierSnapshotSchema },
  },
  { timestamps: true }
);

watchlistSchema.index({ userId: 1, normalizedName: 1 }, { unique: true });
watchlistSchema.index({ normalizedName: 1 });

export type IWatchlist = InferSchemaType<typeof watchlistSchema>;

const Watchlist =
  mongoose.models.Watchlist || mongoose.model("Watchlist", watchlistSchema);

export default Watchlist;
