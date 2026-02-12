---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/workers/data-sync/src/db/buyers.ts
  - apps/workers/data-sync/src/sync-engine.ts
  - apps/workers/data-sync/src/types.ts
  - apps/workers/data-sync/src/index.ts
  - apps/workers/data-sync/wrangler.toml
autonomous: true
must_haves:
  truths:
    - "data-sync worker no longer crashes on createIndex conflict"
    - "New buyers discovered during sync trigger enrichment worker fire-and-forget"
    - "Existing buyers (contractCount increment only) do NOT trigger enrichment"
    - "Sync loop is NOT slowed down by enrichment requests"
  artifacts:
    - path: "apps/workers/data-sync/src/db/buyers.ts"
      provides: "Buyer extraction without createIndex, returns newBuyerIds"
      contains: "result.upsertedIds"
    - path: "apps/workers/data-sync/src/sync-engine.ts"
      provides: "Fire-and-forget enrichment trigger for new buyers"
      contains: "ENRICHMENT_WORKER_URL"
    - path: "apps/workers/data-sync/src/types.ts"
      provides: "Env interface with ENRICHMENT_WORKER_URL"
      contains: "ENRICHMENT_WORKER_URL"
    - path: "apps/workers/data-sync/wrangler.toml"
      provides: "Enrichment worker URL env var"
      contains: "ENRICHMENT_WORKER_URL"
  key_links:
    - from: "apps/workers/data-sync/src/sync-engine.ts"
      to: "https://tendhunt-enrichment.kozak-74d.workers.dev/run-buyer"
      via: "fire-and-forget fetch per new buyer ID"
      pattern: "fetch.*run-buyer"
    - from: "apps/workers/data-sync/src/index.ts"
      to: "apps/workers/data-sync/src/sync-engine.ts"
      via: "passes env.ENRICHMENT_WORKER_URL to processSyncJob"
      pattern: "env\\.ENRICHMENT_WORKER_URL"
---

<objective>
Fix data-sync worker crash caused by MongoDB index name conflict, and add fire-and-forget enrichment triggering for newly discovered buyers.

Purpose: The worker currently crashes every invocation because it tries to create an index with a different name than the one Mongoose already created. Additionally, new buyers should be enriched automatically when first discovered.
Output: Working data-sync worker that syncs contracts, extracts buyers, and triggers enrichment for new buyers without blocking.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/workers/data-sync/src/db/buyers.ts
@apps/workers/data-sync/src/sync-engine.ts
@apps/workers/data-sync/src/types.ts
@apps/workers/data-sync/src/index.ts
@apps/workers/data-sync/wrangler.toml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove createIndex call and return new buyer IDs</name>
  <files>
    apps/workers/data-sync/src/db/buyers.ts
    apps/workers/data-sync/src/types.ts
  </files>
  <action>
  In `apps/workers/data-sync/src/db/buyers.ts`:

  1. Remove lines 59-63 — the entire `createIndex` call block:
     ```
     // Ensure unique index on nameLower (idempotent — no-op if already exists)
     await collection.createIndex(
       { nameLower: 1 },
       { unique: true, sparse: true, name: "nameLower_1_unique" }
     );
     ```
     The index already exists as `nameLower_1` (created by Mongoose in the web app). The worker relies on it for upsert dedup — it does NOT need to create it.

  2. After the `bulkWrite` call, collect ObjectIds of newly created buyers from `result.upsertedIds`. The `upsertedIds` is a `Record<number, ObjectId>` where keys are the operation indices. Collect them into an `ObjectId[]`:
     ```typescript
     const newBuyerIds: ObjectId[] = Object.values(result.upsertedIds ?? {});
     ```

  3. Update the return statement to include `newBuyerIds`:
     ```typescript
     return { created: result.upsertedCount, buyerIdMap, newBuyerIds };
     ```

  In `apps/workers/data-sync/src/types.ts`:

  4. Add `ENRICHMENT_WORKER_URL?: string` to the `Env` interface (optional — enrichment is a nice-to-have, not a hard requirement for sync).
  </action>
  <verify>TypeScript compiles: `cd apps/workers/data-sync && npx tsc --noEmit` (expect no errors related to buyers.ts or types.ts)</verify>
  <done>createIndex call removed. autoExtractBuyers returns newBuyerIds array. Env interface has optional ENRICHMENT_WORKER_URL.</done>
</task>

<task type="auto">
  <name>Task 2: Wire enrichment trigger into sync engine and worker entry point</name>
  <files>
    apps/workers/data-sync/src/sync-engine.ts
    apps/workers/data-sync/src/index.ts
    apps/workers/data-sync/wrangler.toml
  </files>
  <action>
  In `apps/workers/data-sync/src/sync-engine.ts`:

  1. Update `processSyncJob` signature to accept an optional `enrichmentWorkerUrl?: string` parameter (add after `maxItemsPerRun`).

  2. After the `autoExtractBuyers` + `upsertContracts` block (around line 107), add fire-and-forget enrichment for new buyers:
     ```typescript
     // Fire-and-forget enrichment for newly discovered buyers
     if (enrichmentWorkerUrl && buyerIdMap_result.newBuyerIds.length > 0) {
       for (const buyerId of buyerIdMap_result.newBuyerIds) {
         fetch(`${enrichmentWorkerUrl}/run-buyer?id=${buyerId.toHexString()}`)
           .catch((err) => console.warn(`Enrichment trigger failed for ${buyerId}:`, err));
       }
     }
     ```
     Key points:
     - Do NOT await the fetch calls — they are fire-and-forget
     - `.catch()` on each to prevent unhandled rejection crashes
     - Log a warning (not error) on failure — enrichment is best-effort
     - Destructure the `autoExtractBuyers` result to get `newBuyerIds` alongside `buyerIdMap`

  3. Update the destructuring of the `autoExtractBuyers` call to capture `newBuyerIds`:
     ```typescript
     const { buyerIdMap, newBuyerIds } = await autoExtractBuyers(db, batch);
     ```

  In `apps/workers/data-sync/src/index.ts`:

  4. Pass `env.ENRICHMENT_WORKER_URL` to both `processSyncJob` calls as the new parameter:
     ```typescript
     const fatResult = await processSyncJob(
       db, "FIND_A_TENDER", fatFetchPage, fatStart, FAT_MAX_ITEMS, env.ENRICHMENT_WORKER_URL
     );
     // ...same for CF
     const cfResult = await processSyncJob(
       db, "CONTRACTS_FINDER", cfFetchPage, cfStart, CF_MAX_ITEMS, env.ENRICHMENT_WORKER_URL
     );
     ```

  In `apps/workers/data-sync/wrangler.toml`:

  5. Add a `[vars]` section with the enrichment worker URL:
     ```toml
     [vars]
     ENRICHMENT_WORKER_URL = "https://tendhunt-enrichment.kozak-74d.workers.dev"
     ```

  </action>
  <verify>
  1. TypeScript compiles: `cd apps/workers/data-sync && npx tsc --noEmit`
  2. Verify no `createIndex` remains: `grep -r "createIndex" apps/workers/data-sync/src/` returns nothing
  3. Verify enrichment URL is wired: `grep -r "ENRICHMENT_WORKER_URL" apps/workers/data-sync/` returns entries in types.ts, sync-engine.ts, index.ts, wrangler.toml
  </verify>
  <done>
  - data-sync worker compiles without createIndex conflict
  - New buyers trigger fire-and-forget enrichment via /run-buyer endpoint
  - Existing buyers (contractCount increment) do NOT trigger enrichment
  - Enrichment URL configured in wrangler.toml as env var
  - Sync loop is not blocked by enrichment requests (no await on fetch)
  </done>
</task>

</tasks>

<verification>
1. `cd apps/workers/data-sync && npx tsc --noEmit` passes (no type errors)
2. No `createIndex` calls remain in `apps/workers/data-sync/src/`
3. `ENRICHMENT_WORKER_URL` appears in types.ts, sync-engine.ts, index.ts, and wrangler.toml
4. The fetch calls in sync-engine.ts are NOT awaited (fire-and-forget pattern)
5. Only `newBuyerIds` (from `result.upsertedIds`) are enriched, not all buyers
</verification>

<success_criteria>
- data-sync worker TypeScript compiles cleanly
- createIndex call completely removed from buyers.ts
- autoExtractBuyers returns newBuyerIds from bulkWrite upsertedIds
- processSyncJob fires fetch to enrichment worker for each new buyer ID
- Enrichment fetch is fire-and-forget (not awaited, .catch() for safety)
- ENRICHMENT_WORKER_URL configured in wrangler.toml [vars]
- Env interface updated with optional ENRICHMENT_WORKER_URL
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-data-sync-worker-remove-index-confli/3-SUMMARY.md`
</output>
