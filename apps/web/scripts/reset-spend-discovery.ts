/**
 * Reset failed spend discoveries so buyers can be re-discovered.
 *
 * Finds all buyers with enrichmentPriority >= 1 AND transparencyPageUrl = "none"
 * and unsets discovery fields so the pipeline will retry them.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/reset-spend-discovery.ts
 */
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  try {
    const filter = {
      enrichmentPriority: { $gte: 1 },
      transparencyPageUrl: "none",
    };

    const count = await db.collection("buyers").countDocuments(filter);
    console.log(`Found ${count} buyers with transparencyPageUrl = "none" and enrichmentPriority >= 1`);

    if (count === 0) {
      console.log("Nothing to reset.");
      return;
    }

    const result = await db.collection("buyers").updateMany(filter, {
      $unset: {
        transparencyPageUrl: "",
        discoveryMethod: "",
        csvLinksExtracted: "",
        csvLinks: "",
      },
      $set: { updatedAt: new Date() },
    });

    console.log(`Reset ${result.modifiedCount} buyers for re-discovery.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
