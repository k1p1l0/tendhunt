import { connectDB, disconnectDB } from "./lib/db";
import Buyer from "../src/models/buyer";
import { readFileSync } from "fs";
import { resolve } from "path";

interface ContactSeedData {
  name: string;
  title: string;
  email: string;
  linkedIn: string;
  isRevealed: boolean;
}

interface BuyerSeedData {
  name: string;
  orgId: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  contractCount?: number;
  contacts: ContactSeedData[];
}

async function main() {
  const startTime = Date.now();
  console.log("=== Seed Buyers ===\n");

  try {
    await connectDB();

    // Load seed data
    const dataPath = resolve(__dirname, "data/buyers.json");
    const buyersData: BuyerSeedData[] = JSON.parse(
      readFileSync(dataPath, "utf-8")
    );
    console.log(`Loaded ${buyersData.length} buyer records from JSON\n`);

    // Build bulkWrite operations: upsert by orgId (unique identifier)
    const ops = buyersData.map((buyer) => ({
      updateOne: {
        filter: { orgId: buyer.orgId },
        update: { $set: buyer },
        upsert: true,
      },
    }));

    const result = await Buyer.bulkWrite(ops, { ordered: false });

    console.log("Seed results:");
    console.log(`  Upserted: ${result.upsertedCount}`);
    console.log(`  Modified: ${result.modifiedCount}`);
    console.log(`  Matched:  ${result.matchedCount}`);

    // Count total in collection
    const total = await Buyer.countDocuments();
    console.log(`  Total in collection: ${total}\n`);

    // Count total contacts
    const contactAgg = await Buyer.aggregate([
      { $project: { contactCount: { $size: "$contacts" } } },
      { $group: { _id: null, total: { $sum: "$contactCount" } } },
    ]);
    const totalContacts = contactAgg[0]?.total ?? 0;
    console.log(`Total contacts across all buyers: ${totalContacts}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s`);
  } catch (error) {
    console.error("Error seeding buyers:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

main();
