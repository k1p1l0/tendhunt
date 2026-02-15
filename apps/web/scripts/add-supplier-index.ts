/**
 * One-time migration: Add MongoDB index on contracts.awardedSuppliers.name
 * for efficient supplier search.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/add-supplier-index.ts
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set");
  process.exit(1);
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);

  const db = mongoose.connection.db!;
  const contracts = db.collection("contracts");

  console.log("Creating index on awardedSuppliers.name...");
  await contracts.createIndex(
    { "awardedSuppliers.name": 1 },
    { name: "awardedSuppliers_name_1", sparse: true }
  );
  console.log("Index awardedSuppliers_name_1 created.");

  // Also create a text index on awardedSuppliers.name for $text search if needed
  // Note: MongoDB only allows one text index per collection, and contracts already
  // has a text index on title+description. So we rely on regex for supplier search.

  console.log("Creating index on spend_transactions.vendor...");
  const spendTx = db.collection("spendtransactions");
  await spendTx.createIndex(
    { vendor: 1 },
    { name: "vendor_1", sparse: true }
  );
  console.log("Index vendor_1 created.");

  await spendTx.createIndex(
    { vendorNormalized: 1 },
    { name: "vendorNormalized_1", sparse: true }
  );
  console.log("Index vendorNormalized_1 created.");

  console.log("Done. All supplier indexes created.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
