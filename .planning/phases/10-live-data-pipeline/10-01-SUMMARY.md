---
phase: 10-live-data-pipeline
plan: 01
subsystem: infra
tags: [cloudflare-workers, mongodb, ocds, data-pipeline, cron, backfill]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: "OCDS mapper logic, CPV sector map, API pagination patterns"
provides:
  - "Cloudflare Worker project scaffolding with wrangler config and nodejs_compat_v2"
  - "TypeScript interfaces mirroring existing Mongoose schemas for CF Workers"
  - "Native MongoDB driver connection with serverless pool settings"
  - "OCDS-to-contract mapper with full 43-entry CPV sector classification"
  - "Contract upsert on {source, noticeId} compound key via bulkWrite"
  - "Buyer auto-extraction with $setOnInsert non-destructive upsert"
  - "SyncJob CRUD for crash-safe backfill/sync progress tracking"
  - "Core sync engine with backfill detection, cursor resume, and FetchPageFn injection"
affects: [10-live-data-pipeline]

# Tech tracking
tech-stack:
  added: ["mongodb ^6.15.0 (native driver)", "wrangler ^4.4.0", "@cloudflare/workers-types"]
  patterns: ["Native MongoDB driver in CF Workers (not Mongoose)", "FetchPageFn dependency injection for API client decoupling", "Per-page cursor persistence for crash-safe resume", "Per-release try/catch for batch resilience"]

key-files:
  created:
    - workers/data-sync/package.json
    - workers/data-sync/wrangler.toml
    - workers/data-sync/tsconfig.json
    - workers/data-sync/src/types.ts
    - workers/data-sync/src/db/client.ts
    - workers/data-sync/src/db/contracts.ts
    - workers/data-sync/src/db/buyers.ts
    - workers/data-sync/src/db/sync-jobs.ts
    - workers/data-sync/src/mappers/ocds-mapper.ts
    - workers/data-sync/src/sync-engine.ts
    - workers/data-sync/src/index.ts
  modified: []

key-decisions:
  - "MongoClientOptions cast needed due to @cloudflare/workers-types TLSSocket conflict with Node.js tls types"
  - "Added @types/node devDependency alongside @cloudflare/workers-types for type compatibility"
  - "valueMin uses minValue.amount falling back to value.amount (Phase 2 used only value.amount for both)"
  - "buyerOrg extracted from party.id and buyer.id fields for existing Buyer schema mapping"

patterns-established:
  - "FetchPageFn injection: sync engine is API-agnostic, API clients implement FetchPageFn interface"
  - "Per-page cursor save: updateSyncProgress called after EVERY page, not just at end of run"
  - "Error recovery: error status resumes from cursor (backfill) or retries sync mode"
  - "Buyer slugification: auto-{slugified-name} as orgId fallback when buyerOrg is null"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 10 Plan 01: Data Sync Worker Infrastructure Summary

**Cloudflare Worker with native MongoDB driver, OCDS mapper (43 CPV sectors), sync engine with crash-safe cursor resume and FetchPageFn dependency injection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T18:55:01Z
- **Completed:** 2026-02-11T18:59:04Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Standalone Worker project under `workers/data-sync/` with hourly cron trigger and `nodejs_compat_v2` flag
- Full OCDS-to-contract mapper ported from Phase 2 with 43-entry CPV sector map and null-safe access
- Native MongoDB driver operations: contract upsert on compound key, buyer auto-extraction, SyncJob lifecycle
- Core sync engine with backfill detection, chunked processing, crash-safe cursor persistence, and API-agnostic design via FetchPageFn injection

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Worker project** - `bea14f2` (feat)
2. **Task 2: Port OCDS mapper and DB operations** - `3de9825` (feat)
3. **Task 3: Implement core sync engine** - `d10daf8` (feat)

## Files Created/Modified
- `workers/data-sync/package.json` - Worker dependencies (mongodb ^6.15.0, wrangler, TS)
- `workers/data-sync/wrangler.toml` - Cron trigger config with nodejs_compat_v2
- `workers/data-sync/tsconfig.json` - TypeScript config for CF Workers environment
- `workers/data-sync/.gitignore` - Ignore node_modules, dist, .wrangler, .dev.vars
- `workers/data-sync/src/types.ts` - OcdsRelease, MappedContract, MappedBuyer, SyncJob, Env interfaces
- `workers/data-sync/src/db/client.ts` - Native MongoDB driver connection (maxPoolSize:1)
- `workers/data-sync/src/db/contracts.ts` - bulkWrite upsert on {source, noticeId}
- `workers/data-sync/src/db/buyers.ts` - Buyer auto-extraction with $setOnInsert and $inc contractCount
- `workers/data-sync/src/db/sync-jobs.ts` - SyncJob CRUD: getOrCreate, updateProgress, markComplete, markError
- `workers/data-sync/src/mappers/ocds-mapper.ts` - OCDS release mapper with full CPV sector classification
- `workers/data-sync/src/sync-engine.ts` - Core sync loop with backfill detection and cursor resume
- `workers/data-sync/src/index.ts` - Placeholder scheduled handler (Plan 10-02 wires full handler)

## Decisions Made
- **MongoClientOptions type cast:** `@cloudflare/workers-types` declares a global TLSSocket that conflicts with Node.js tls types extended by MongoClientOptions. Cast to `MongoClientOptions` resolves the type mismatch while preserving runtime behavior.
- **@types/node added:** Required alongside `@cloudflare/workers-types` for mongodb driver type resolution.
- **valueMin uses minValue fallback:** Phase 2 used `value.amount` for both min/max. This plan uses `minValue.amount ?? value.amount` for valueMin, giving more accurate range when OCDS provides both fields.
- **buyerOrg from party.id:** Extracts buyer organization ID from OCDS party data and buyer object, mapping to the existing Buyer schema's orgId field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed MongoClientOptions type conflict with CF Workers types**
- **Found during:** Task 1 (Worker scaffolding)
- **Issue:** `@cloudflare/workers-types` provides a global TLSSocket that conflicts with Node.js tls types used by mongodb's MongoClientOptions, causing TS2345 error
- **Fix:** Cast options object as MongoClientOptions, added @types/node devDependency
- **Files modified:** workers/data-sync/src/db/client.ts, workers/data-sync/package.json
- **Verification:** `npx tsc --noEmit` compiles clean
- **Committed in:** bea14f2 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type conflict is a known issue when combining CF Workers types with Node.js library types. Fix is standard and does not affect runtime behavior.

## Issues Encountered
None beyond the type conflict documented above.

## User Setup Required
None - no external service configuration required for this plan. MONGODB_URI secret setup is required for deployment (Plan 10-02).

## Next Phase Readiness
- All infrastructure ready for Plan 10-02: API clients (FaT + CF), rate limiter, and scheduled handler wiring
- Sync engine accepts any `FetchPageFn` implementation -- Plan 10-02 creates FaT and CF specific implementations
- SyncJob collection will auto-create on first Worker invocation
- `wrangler secret put MONGODB_URI` needed before deployment

## Self-Check: PASSED

All 12 created files verified present. All 3 task commits verified in git log.

---
*Phase: 10-live-data-pipeline*
*Completed: 2026-02-11*
