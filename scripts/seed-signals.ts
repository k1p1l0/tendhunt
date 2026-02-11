import { connectDB, disconnectDB } from "./lib/db";
import Signal from "../src/models/signal";
import { readFileSync } from "fs";
import { resolve } from "path";

interface SignalSeedData {
  organizationName: string;
  signalType: string;
  title: string;
  insight: string;
  source?: string;
  sourceDate?: string;
  sector?: string;
  confidence?: number;
}

async function main() {
  const startTime = Date.now();
  console.log("=== Seed Signals ===\n");

  try {
    await connectDB();

    // Load seed data
    const dataPath = resolve(__dirname, "data/signals.json");
    const signalsData: SignalSeedData[] = JSON.parse(
      readFileSync(dataPath, "utf-8")
    );
    console.log(`Loaded ${signalsData.length} signal records from JSON\n`);

    // Build bulkWrite operations: upsert by compound key (organizationName + signalType + title)
    const ops = signalsData.map((signal) => ({
      updateOne: {
        filter: {
          organizationName: signal.organizationName,
          signalType: signal.signalType,
          title: signal.title,
        },
        update: {
          $set: {
            ...signal,
            sourceDate: signal.sourceDate
              ? new Date(signal.sourceDate)
              : undefined,
          },
        },
        upsert: true,
      },
    }));

    const result = await Signal.bulkWrite(ops, { ordered: false });

    console.log("Seed results:");
    console.log(`  Upserted: ${result.upsertedCount}`);
    console.log(`  Modified: ${result.modifiedCount}`);
    console.log(`  Matched:  ${result.matchedCount}`);

    // Count total in collection
    const total = await Signal.countDocuments();
    console.log(`  Total in collection: ${total}\n`);

    // Breakdown by signalType
    const typeCounts = await Signal.aggregate([
      { $group: { _id: "$signalType", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    console.log("Signal type breakdown:");
    for (const t of typeCounts) {
      console.log(`  ${t._id}: ${t.count}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s`);
  } catch (error) {
    console.error("Error seeding signals:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

main();
