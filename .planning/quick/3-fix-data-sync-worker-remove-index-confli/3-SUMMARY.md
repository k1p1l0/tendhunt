# Quick Task 3: Fix data-sync worker — index conflict + enrichment trigger

## What was done

### Bug Fix: MongoDB index name conflict
- Removed `createIndex({ nameLower: 1 }, { name: "nameLower_1_unique" })` from `buyers.ts`
- The Mongoose web app already creates `nameLower_1` on the same field — having two names for the same index caused every worker invocation to crash with "Index already exists with a different name"
- The sync engine's error-recovery logic will auto-resume both FaT and CF jobs on the next cron invocation

### New Feature: Fire-and-forget enrichment for new buyers
- `autoExtractBuyers()` now returns `newBuyerIds` (from bulkWrite `upsertedIds`) alongside `buyerIdMap`
- After upserting contracts, the sync engine fires a non-blocking `fetch()` to the enrichment worker's `/run-buyer?id=X` endpoint for each newly created buyer
- Only new buyers trigger enrichment — existing buyers (contractCount increment only) do not
- Enrichment is fire-and-forget: no `await`, `.catch()` for safety, warning-level logging on failure
- `ENRICHMENT_WORKER_URL` added as optional env var in `wrangler.toml` `[vars]`

## Files modified

| File | Change |
|------|--------|
| `apps/workers/data-sync/src/db/buyers.ts` | Removed createIndex, added newBuyerIds return |
| `apps/workers/data-sync/src/sync-engine.ts` | Added enrichmentWorkerUrl param + fire-and-forget fetch |
| `apps/workers/data-sync/src/index.ts` | Passes env.ENRICHMENT_WORKER_URL to processSyncJob |
| `apps/workers/data-sync/src/types.ts` | Added ENRICHMENT_WORKER_URL to Env interface |
| `apps/workers/data-sync/wrangler.toml` | Added [vars] with ENRICHMENT_WORKER_URL |

## Verification
- TypeScript compiles cleanly (`npx tsc --noEmit`)
- Zero `createIndex` calls remain in worker source
- ENRICHMENT_WORKER_URL wired through types → index → sync-engine → wrangler.toml

## Next steps
- Deploy worker: `cd apps/workers/data-sync && wrangler deploy`
- The FaT syncJob (status: "error") will self-recover on next cron run
- Optionally clear FaT errorLog in MongoDB: `db.syncJobs.updateOne({ source: "FIND_A_TENDER" }, { $set: { errorLog: [] } })`
