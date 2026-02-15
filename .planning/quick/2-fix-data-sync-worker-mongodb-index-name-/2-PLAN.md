---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/workers/data-sync/src/db/buyers.ts
autonomous: true
must_haves:
  truths:
    - "data-sync worker no longer crashes on autoExtractBuyers due to index name conflict"
    - "buyer upsert deduplication still works correctly via the existing nameLower_1 unique index"
    - "worker typecheck passes cleanly"
  artifacts:
    - path: "apps/workers/data-sync/src/db/buyers.ts"
      provides: "buyer auto-extraction without runtime index creation"
  key_links:
    - from: "apps/workers/data-sync/src/db/buyers.ts"
      to: "MongoDB buyers collection"
      via: "bulkWrite upsert on nameLower field"
      pattern: "bulkWrite"
---

<objective>
Remove the conflicting `createIndex` call from the data-sync worker's buyer extraction module.

Purpose: The worker crashes every invocation because `autoExtractBuyers()` tries to create index `nameLower_1_unique` but MongoDB already has an identical index named `nameLower_1` (created by the Mongoose Buyer model in the web app). MongoDB rejects creating the same index with a different name. This blocks ALL contract syncing (both FaT and Contracts Finder).

Output: Fixed `buyers.ts` that relies on the existing Mongoose-managed index instead of trying to create its own.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/workers/data-sync/src/db/buyers.ts
@apps/workers/data-sync/src/sync-engine.ts
@apps/web/src/models/buyer.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove conflicting createIndex call from worker buyer extraction</name>
  <files>apps/workers/data-sync/src/db/buyers.ts</files>
  <action>
Remove lines 54-58 in `apps/workers/data-sync/src/db/buyers.ts` — the `createIndex({ nameLower: 1 }, { unique: true, sparse: true, name: "nameLower_1_unique" })` call.

The index already exists as `nameLower_1` (created by Mongoose from `apps/web/src/models/buyer.ts` line 42: `nameLower: { type: String, unique: true, sparse: true }`). The worker should NOT manage indexes that the web app's Mongoose models define. The bulkWrite upsert on `nameLower` will continue to work correctly because the unique index already exists in the database.

Update the comment block (lines 4-14) to note that the unique index on `nameLower` is managed by the Mongoose Buyer model in the web app, not by this worker module.

Do NOT change any other logic — the bulkWrite upserts, the buyerIdMap fetch, and the return value must remain identical.
  </action>
  <verify>
Run `pnpm --filter @tendhunt/worker-data-sync exec tsc --noEmit` to confirm typecheck passes. Verify the `createIndex` call is gone by searching the file. Confirm the bulkWrite and find logic is untouched.
  </verify>
  <done>
`autoExtractBuyers()` no longer calls `createIndex`. The function goes straight from getting the collection reference to building and executing the bulkWrite operations. Worker typecheck passes.
  </done>
</task>

</tasks>

<verification>
- `pnpm --filter @tendhunt/worker-data-sync exec tsc --noEmit` passes with no errors
- `apps/workers/data-sync/src/db/buyers.ts` contains zero `createIndex` calls
- The bulkWrite upsert logic using `nameLower` filter remains intact
- No other files in the worker were modified
</verification>

<success_criteria>
The data-sync worker's buyer extraction no longer attempts to create a MongoDB index at runtime. The existing Mongoose-managed `nameLower_1` unique index handles deduplication. After deploying this fix, the worker will self-recover on the next cron invocation via the existing error-recovery logic in `sync-engine.ts` (lines 62-65).
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-data-sync-worker-mongodb-index-name-/2-SUMMARY.md`
</output>
