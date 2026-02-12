/**
 * Batch runner: Run unified enrichment pipeline for all Tier 0 buyers.
 *
 * Queries all buyers matched to Tier 0 DataSources with a website.
 * Runs enrich-buyer.ts for each one as a child process (logo, LinkedIn,
 * governance, ModernGov, personnel, spend, score).
 *
 * Usage:
 *   cd apps/web
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/batch-spend-tier0.ts
 */
import { MongoClient } from "mongodb";
import { execSync } from "child_process";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const SCRIPT_PATH = path.resolve(__dirname, "enrich-buyer.ts");

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Use $lookup to find buyers matched to Tier 0 DataSources
  // (enrichmentPriority is unreliable — was set to 1 for all buyers)
  const buyers = await db
    .collection("buyers")
    .aggregate([
      {
        $match: {
          dataSourceId: { $ne: null },
          website: { $nin: [null, ""] },
          spendDataAvailable: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "datasources",
          localField: "dataSourceId",
          foreignField: "_id",
          as: "ds",
        },
      },
      { $match: { "ds.tier": 0 } },
      { $project: { name: 1, orgType: 1, website: 1 } },
      { $sort: { name: 1 } },
    ])
    .toArray();

  // Reset any previously failed discoveries so they get retried
  const resetResult = await db.collection("buyers").updateMany(
    {
      _id: { $in: buyers.map((b) => b._id) },
      transparencyPageUrl: "none",
    },
    {
      $unset: {
        transparencyPageUrl: "",
        discoveryMethod: "",
        csvLinksExtracted: "",
        csvLinks: "",
      },
      $set: { updatedAt: new Date() },
    }
  );
  if (resetResult.modifiedCount > 0) {
    console.log(`Reset ${resetResult.modifiedCount} failed discoveries for retry.`);
  }

  await client.close();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`Batch Enrichment: ${buyers.length} Tier 0 buyers`);
  console.log(`${"═".repeat(60)}\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (let i = 0; i < buyers.length; i++) {
    const buyer = buyers[i];
    const progress = `[${i + 1}/${buyers.length}]`;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`${progress} ${buyer.name} (${buyer.orgType})`);
    console.log(`${"─".repeat(60)}`);

    try {
      const result = execSync(
        `DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config "${SCRIPT_PATH}" "${buyer.name.replace(/"/g, '\\"')}"`,
        {
          cwd: path.resolve(__dirname, ".."),
          timeout: 180000, // 3 min per buyer (LinkedIn lookup adds ~30s)
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        }
      );

      const output = result.toString();
      if (output.includes("PIPELINE COMPLETE")) {
        success++;
        const spendMatch = output.match(/Total spend: £([\d,.]+)/);
        const txMatch = output.match(/Transactions: (\d+)/);
        console.log(
          `  ✓ Success — ${txMatch?.[1] ?? "?"} transactions, ${spendMatch?.[1] ?? "?"} spend`
        );
      } else if (
        output.includes("No transparency URL") ||
        output.includes("No CSV links found") ||
        output.includes("No website") ||
        output.includes("Marking as 'none'")
      ) {
        skipped++;
        console.log(`  ○ Skipped — no transparency/spend data found`);
      } else {
        skipped++;
        console.log(`  ○ Completed — no spend data extracted`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const shortMsg = msg.split("\n")[0].slice(0, 100);
      failures.push(`${buyer.name}: ${shortMsg}`);
      console.log(`  ✗ Failed — ${shortMsg}`);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("BATCH COMPLETE");
  console.log(`${"═".repeat(60)}`);
  console.log(`Total: ${buyers.length}`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped} (no data found)`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
