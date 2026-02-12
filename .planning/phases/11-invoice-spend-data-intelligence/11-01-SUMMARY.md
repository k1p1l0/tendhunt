---
phase: 11-invoice-spend-data-intelligence
plan: 01
subsystem: database, infra
tags: [mongoose, mongodb, cloudflare-workers, spend-data, pipeline, papaparse]

# Dependency graph
requires:
  - phase: 13-buyer-data-enrichment
    provides: "Enrichment Worker pattern (engine, stages, db ops, rate limiter) used as template"
provides:
  - "SpendTransaction Mongoose model with compound indexes for spend record storage"
  - "SpendSummary Mongoose model for pre-computed per-buyer spend aggregates"
  - "spend-ingest Cloudflare Worker project with 4-stage pipeline engine"
  - "DB operations: spend-jobs, spend-data, buyers CRUD"
  - "Per-domain rate limiter (copied from enrichment)"
affects: [11-02, 11-03, 11-04, 11-05]

# Tech tracking
tech-stack:
  added: [papaparse, "@types/papaparse"]
  patterns: [spend-ingest-pipeline, spend-transaction-model, spend-summary-model]

key-files:
  created:
    - src/models/spend-transaction.ts
    - src/models/spend-summary.ts
    - workers/spend-ingest/package.json
    - workers/spend-ingest/tsconfig.json
    - workers/spend-ingest/wrangler.toml
    - workers/spend-ingest/src/types.ts
    - workers/spend-ingest/src/index.ts
    - workers/spend-ingest/src/spend-engine.ts
    - workers/spend-ingest/src/db/client.ts
    - workers/spend-ingest/src/db/spend-jobs.ts
    - workers/spend-ingest/src/db/spend-data.ts
    - workers/spend-ingest/src/db/buyers.ts
    - workers/spend-ingest/src/api-clients/rate-limiter.ts
    - workers/spend-ingest/src/stages/01-discover.ts
    - workers/spend-ingest/src/stages/02-extract-links.ts
    - workers/spend-ingest/src/stages/03-download-parse.ts
    - workers/spend-ingest/src/stages/04-aggregate.ts
  modified: []

key-decisions:
  - "Exact enrichment Worker pattern for spend-ingest Worker (same engine, stage, job tracking architecture)"
  - "SpendTransaction compound dedup key: buyerId + date + vendor + amount + reference"
  - "Weekly cron (Monday 3AM UTC) vs hourly for enrichment -- spend data changes less frequently"
  - "Default maxItemsPerRun 200 (vs 500 for enrichment) -- spend parsing is heavier per item"

patterns-established:
  - "Spend pipeline: 4-stage sequential processing (discover, extract_links, download_parse, aggregate)"
  - "SpendTransaction dedup via bulkWrite upsert on compound key"
  - "SpendSummary per-buyer aggregates with breakdown arrays (category, vendor, monthly)"

# Metrics
duration: 4min
completed: 2026-02-12
---

# Phase 11 Plan 01: Spend Models & Worker Scaffold Summary

**SpendTransaction/SpendSummary Mongoose models plus spend-ingest Cloudflare Worker with 4-stage pipeline engine following enrichment Worker architecture**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-12T15:16:29Z
- **Completed:** 2026-02-12T15:21:02Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- SpendTransaction model with buyerId, date, amount, vendor, vendorNormalized, category fields and 3 compound indexes
- SpendSummary model with per-buyer unique constraint and categoryBreakdown, vendorBreakdown, monthlyTotals arrays
- Complete spend-ingest Worker project with 4-stage pipeline engine, DB operations, rate limiter, and /run /health /debug endpoints
- All stage stubs ready for Plans 02-05 to implement without modifying spend-engine.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SpendTransaction and SpendSummary Mongoose models** - `7dadef7` (feat)
2. **Task 2: Scaffold spend-ingest Cloudflare Worker with pipeline engine** - `3156fd5` (feat)

## Files Created/Modified
- `src/models/spend-transaction.ts` - Mongoose model for individual spend records with 3 compound indexes
- `src/models/spend-summary.ts` - Mongoose model for pre-computed per-buyer spend aggregates
- `workers/spend-ingest/package.json` - Worker dependencies (mongodb, papaparse, anthropic, p-limit, fuse.js)
- `workers/spend-ingest/tsconfig.json` - TypeScript config (ES2022, bundler resolution, CF workers types)
- `workers/spend-ingest/wrangler.toml` - Worker config with weekly Monday 3AM cron trigger
- `workers/spend-ingest/src/types.ts` - SpendIngestStage, SpendJobDoc, SpendTransactionDoc, StageFn types
- `workers/spend-ingest/src/index.ts` - Worker entry point with /run, /health, /debug, scheduled handler
- `workers/spend-ingest/src/spend-engine.ts` - Pipeline orchestrator with STAGE_FUNCTIONS record and findCurrentStage
- `workers/spend-ingest/src/db/client.ts` - MongoClient singleton (copied from enrichment)
- `workers/spend-ingest/src/db/spend-jobs.ts` - Job tracking: getOrCreateJob, updateJobProgress, markJobComplete, markJobError
- `workers/spend-ingest/src/db/spend-data.ts` - bulkUpsertTransactions, upsertSpendSummary, getSpendSummary, getTransactions
- `workers/spend-ingest/src/db/buyers.ts` - getBuyerBatch (website filter), updateBuyerSpendFields
- `workers/spend-ingest/src/api-clients/rate-limiter.ts` - Per-domain rate limiter with exponential backoff
- `workers/spend-ingest/src/stages/01-discover.ts` - Stub for transparency page discovery
- `workers/spend-ingest/src/stages/02-extract-links.ts` - Stub for CSV link extraction
- `workers/spend-ingest/src/stages/03-download-parse.ts` - Stub for CSV download and parsing
- `workers/spend-ingest/src/stages/04-aggregate.ts` - Stub for spend data aggregation

## Decisions Made
- Exact enrichment Worker pattern replicated for consistency (same engine, stage registry, job tracking)
- SpendTransaction dedup uses compound key { buyerId, date, vendor, amount, reference } via bulkWrite upsert
- Weekly cron (Monday 3AM UTC) instead of hourly -- spend data updates less frequently than enrichment data
- Default maxItemsPerRun set to 200 (vs 500 for enrichment) since spend CSV parsing is heavier per item

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript filter type for optional reference field**
- **Found during:** Task 2 (spend-data.ts compilation)
- **Issue:** `tx.reference ?? null` produced `string | null` which doesn't match MongoDB Filter type for `string | undefined` field
- **Fix:** Changed to `tx.reference` (passes undefined directly, which MongoDB treats as "field not present" in filter)
- **Files modified:** workers/spend-ingest/src/db/spend-data.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 3156fd5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Secrets (MONGODB_URI, ANTHROPIC_API_KEY) will need to be set via `wrangler secret put` before deployment in a future plan.

## Next Phase Readiness
- Models and Worker scaffold ready for Plans 02-05 to implement stage logic
- Stage stubs auto-complete so pipeline can progress even with unimplemented stages
- No blockers for next plan

## Self-Check: PASSED

All 17 created files verified present. Both task commits (7dadef7, 3156fd5) verified in git log. TypeScript compilation passes for both root project and Worker project.

---
*Phase: 11-invoice-spend-data-intelligence*
*Completed: 2026-02-12*
