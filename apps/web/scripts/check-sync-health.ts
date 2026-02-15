/**
 * Quick health check for data-sync and enrichment workers.
 * Run: DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/check-sync-health.ts
 */

import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("tendhunt");

  console.log("═══════════════════════════════════════════");
  console.log("  TendHunt Worker Health Check");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════\n");

  // Data sync jobs
  const syncJobs = await db.collection("syncJobs").find({}).toArray();
  console.log("📡 DATA SYNC");
  for (const job of syncJobs) {
    const lastRun = job.lastRunAt ? new Date(job.lastRunAt) : null;
    const hoursAgo = lastRun ? ((Date.now() - lastRun.getTime()) / 3600000).toFixed(1) : "never";
    console.log(`  ${job.source}: ${job.status} | lastRun: ${hoursAgo}h ago | total: ${job.totalFetched}`);
  }

  // Contracts today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayContracts = await db.collection("contracts").aggregate([
    { $match: { createdAt: { $gte: todayStart } } },
    { $group: { _id: "$source", count: { $sum: 1 } } },
  ]).toArray();
  console.log(`\n  Contracts today: ${todayContracts.map((c) => `${c._id}=${c.count}`).join(", ") || "0"}`);

  // Enrichment jobs
  console.log("\n🔧 ENRICHMENT");
  const enrichJobs = await db
    .collection("enrichmentjobs")
    .find({})
    .sort({ lastRunAt: -1 })
    .toArray();
  for (const job of enrichJobs) {
    const lastRun = job.lastRunAt ? new Date(job.lastRunAt) : null;
    const hoursAgo = lastRun ? ((Date.now() - lastRun.getTime()) / 3600000).toFixed(1) : "never";
    console.log(`  ${job.stage}: ${job.status} | lastRun: ${hoursAgo}h ago | processed: ${job.totalProcessed} | errors: ${job.totalErrors}`);
  }

  // Recently enriched buyers
  const recentBuyers = await db
    .collection("buyers")
    .find({ lastEnrichedAt: { $gte: new Date(Date.now() - 24 * 3600000) } })
    .sort({ lastEnrichedAt: -1 })
    .limit(5)
    .project({ name: 1, enrichmentScore: 1, lastEnrichedAt: 1 })
    .toArray();
  console.log(`\n  Recently enriched (24h): ${recentBuyers.length} buyers`);
  for (const b of recentBuyers) {
    console.log(`    ${b.name} — score: ${b.enrichmentScore ?? "?"}, at: ${new Date(b.lastEnrichedAt).toISOString()}`);
  }

  // Pipeline errors
  const errorCount = await db.collection("pipelineerrors").countDocuments({ resolved: { $ne: true } });
  console.log(`\n⚠️  Unresolved pipeline errors: ${errorCount}`);

  // Total counts
  const contracts = await db.collection("contracts").estimatedDocumentCount();
  const buyers = await db.collection("buyers").estimatedDocumentCount();
  const spend = await db.collection("spendsummaries").countDocuments();
  console.log(`\n📊 TOTALS: ${contracts} contracts | ${buyers} buyers | ${spend} with spend data`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
