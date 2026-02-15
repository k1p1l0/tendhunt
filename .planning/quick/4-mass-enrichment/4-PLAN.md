# Mass Enrichment — Process All 7,124 Buyers

## Context

The enrichment pipeline processes 500 buyers per hourly cron (one stage at a time). At that rate, all 9 stages × 7,124 buyers takes 2-3 days. We want to blast through it now by running the worker locally without Cloudflare limits.

## Current State (Feb 14, 11:30 PM)

- 7,124 total buyers
- 1,255 have enrichment scores (18%)
- parent_link: 3,447 processed (running)
- All other stages: reset to "running" with cursor:null (waiting)

## The Plan

### Step 1: Write a loop script

Create `apps/web/scripts/run-mass-enrichment.ts` that:
1. Calls the deployed enrichment worker `/run?max=9999` in a loop
2. Each call processes one stage until it returns `done: true`
3. When a stage completes, the next call picks up the next stage
4. When `all_complete` is returned, all stages are done
5. Print progress after each call
6. Pause 2s between calls to avoid overwhelming MongoDB

The script should NOT use wrangler dev — it should call the **deployed** Cloudflare worker directly via HTTP. The worker has `usage_model = "standard"` (15 min CPU, 10K subrequests) so it can handle large batches.

BUT: the `/run` endpoint requires WORKER_SECRET auth. Check if it's set:
```bash
# In wrangler.toml [vars] or as a secret
```

If WORKER_SECRET is not set, the script should call the worker locally via wrangler dev instead.

### Step 2: Disable the hourly cron temporarily

To avoid the cron interfering with our mass run, temporarily change the cron to a far-future schedule or comment it out. Restore after mass enrichment completes.

Actually — DON'T disable the cron. The cron and our script can coexist because:
- Both use cursor-based resume
- MongoDB operations are atomic (updateOne/bulkWrite)
- The worst case is duplicate processing, which is idempotent

### Step 3: Run the script

```bash
cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/run-mass-enrichment.ts
```

Expected duration: 30-60 minutes for all 9 stages (parent_link is the slowest at ~7K buyers, but classify/score are fast since most are already processed).

### Step 4: Verify

Run the health check:
```bash
cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/check-sync-health.ts
```

Expected: enrichmentScore count should be close to 7,124 (minus buyers with no data).

## Important Notes

- **Apify credits**: website_discovery and logo_linkedin stages use Apify API calls ($0.001-0.01 each). With ~6,000 unprocessed buyers, budget ~$6-60 in Apify credits.
- **Claude API**: personnel stage uses Claude Haiku ($0.25/M tokens). With ~6,000 buyers, budget ~$5-15.
- **Rate limits**: The script should respect rate limits. The enrichment worker has built-in per-domain rate limiting (2-3s delays for ModernGov, NHS, GOV.UK).
- **The worker runs BOTH pipelines**: buyer enrichment + doc enrichment. The `/run` endpoint only runs buyer enrichment. Doc enrichment runs via `/run-doc-enrichment`.

## Script Pseudocode

```typescript
const WORKER_URL = "http://localhost:8795"; // or deployed URL with secret

let stage = "";
let iteration = 0;

while (stage !== "all_complete") {
  iteration++;
  console.log(`\n--- Iteration ${iteration} ---`);

  const res = await fetch(`${WORKER_URL}/run?max=9999`);
  const result = await res.json();

  stage = result.stage;
  console.log(`Stage: ${stage}, processed: ${result.processed}, errors: ${result.errors}, done: ${result.done}`);

  if (stage === "all_complete") break;

  // Wait 2s between calls
  await new Promise(r => setTimeout(r, 2000));
}

console.log("All enrichment stages complete!");
```

## Run via wrangler dev (local, no limits)

```bash
# Terminal 1: start local worker
cd apps/workers/enrichment && npx wrangler dev --port 8795

# Terminal 2: run mass enrichment script
cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/run-mass-enrichment.ts
```
