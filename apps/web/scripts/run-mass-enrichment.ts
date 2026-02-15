/**
 * Mass enrichment — run all enrichment stages locally at max speed.
 *
 * Usage:
 *   Terminal 1: cd apps/workers/enrichment && npx wrangler dev --port 8795
 *   Terminal 2: cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/run-mass-enrichment.ts
 */

const WORKER_URL = "https://tendhunt-enrichment.kozak-74d.workers.dev";
const WORKER_SECRET = "temp_1771112481";
const MAX_ITEMS_PER_CALL = 1000; // Smaller batches to avoid 15-min timeout
const PAUSE_BETWEEN_CALLS_MS = 2000;

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Mass Enrichment — All 9 Stages");
  console.log("═══════════════════════════════════════════\n");

  let stage = "";
  let iteration = 0;
  const startTime = Date.now();

  while (stage !== "all_complete") {
    iteration++;
    console.log(`\n[${new Date().toISOString()}] --- Iteration ${iteration} ---`);

    try {
      const res = await fetch(`${WORKER_URL}/run?max=${MAX_ITEMS_PER_CALL}&secret=${WORKER_SECRET}`);

      if (!res.ok) {
        console.error(`Worker returned ${res.status}: ${await res.text()}`);
        console.log("Retrying in 5s...");
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      const result = await res.json();

      if (result.error) {
        console.error(`Worker error: ${result.error}`);
        console.log("Retrying in 5s...");
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      stage = result.stage;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      console.log(`  Stage: ${stage}`);
      console.log(`  Processed: ${result.processed}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Done: ${result.done}`);
      console.log(`  Elapsed: ${elapsed}s`);

      if (stage === "all_complete") {
        console.log("\n✅ All enrichment stages complete!");
        break;
      }

      // Pause between calls to avoid overwhelming MongoDB
      await new Promise(r => setTimeout(r, PAUSE_BETWEEN_CALLS_MS));

    } catch (err) {
      console.error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      console.log("Retrying in 5s...");
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  const totalTime = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Total time: ${totalTime} minutes`);
  console.log(`  Total iterations: ${iteration}`);
  console.log(`═══════════════════════════════════════════`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
