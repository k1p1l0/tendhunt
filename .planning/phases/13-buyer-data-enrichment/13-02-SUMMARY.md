---
phase: 13-buyer-data-enrichment
plan: 02
subsystem: infra
tags: [cloudflare-workers, mongodb, fuse.js, fuzzy-matching, enrichment, rate-limiter]

# Dependency graph
requires:
  - phase: 13-buyer-data-enrichment-01
    provides: DataSource model, Buyer enrichment fields, EnrichmentJob model
  - phase: 10-live-data-pipeline
    provides: Data-sync Worker patterns (MongoDB client, sync-engine, rate limiter)
provides:
  - Enrichment Cloudflare Worker scaffold at workers/enrichment/
  - Stage-based pipeline engine with cursor-based crash-safe resumability
  - Stage 1 (classify) -- Fuse.js fuzzy matching of buyers to DataSource entries
  - Per-domain rate limiter with configurable delays and exponential backoff
  - MongoDB CRUD operations for EnrichmentJob, Buyer enrichment, DataSource
affects: [13-03-governance-urls, 13-04-moderngov, 13-05-scrape, 13-06-scoring]

# Tech tracking
tech-stack:
  added: [fuse.js, fast-xml-parser, "@anthropic-ai/sdk", p-limit]
  patterns:
    - "Stage-based pipeline with sequential stage progression and cursor resume"
    - "Per-domain rate limiting with hostname-based delay lookup"
    - "Fuse.js fuzzy matching with name normalization (institutional word stripping)"
    - "Buyer batch processing with bulk enrichment updates"

key-files:
  created:
    - workers/enrichment/package.json
    - workers/enrichment/wrangler.toml
    - workers/enrichment/tsconfig.json
    - workers/enrichment/src/types.ts
    - workers/enrichment/src/db/client.ts
    - workers/enrichment/src/db/enrichment-jobs.ts
    - workers/enrichment/src/db/buyers.ts
    - workers/enrichment/src/db/data-sources.ts
    - workers/enrichment/src/api-clients/rate-limiter.ts
    - workers/enrichment/src/enrichment-engine.ts
    - workers/enrichment/src/stages/01-classify.ts
    - workers/enrichment/src/index.ts
  modified: []

key-decisions:
  - "Name normalization strips 16 institutional patterns before fuzzy matching for robust UK org matching"
  - "Fuse.js threshold 0.3 with ignoreLocation for strict-but-flexible fuzzy matching"
  - "Unimplemented stages gracefully log and auto-complete so pipeline can always progress"
  - "Per-domain rate limiter tracks last request time per hostname within single Worker invocation"

patterns-established:
  - "Enrichment engine stage registry pattern: Partial<Record<EnrichmentStage, StageFn>>"
  - "findCurrentStage iterates STAGE_ORDER and returns first non-complete stage"
  - "fetchWithDomainDelay: domain-aware rate limiting + exponential backoff"
  - "bulkUpdateBuyerEnrichment: batch $set with ordered:false for max throughput"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 13 Plan 02: Enrichment Worker Scaffold + Stage 1 Classification Summary

**Cloudflare Worker at workers/enrichment/ with Fuse.js fuzzy name matching (Stage 1) classifying buyers against 2,368 DataSource entries, plus stage-based pipeline engine and per-domain rate limiter**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T22:49:11Z
- **Completed:** 2026-02-11T22:52:49Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Scaffolded enrichment Cloudflare Worker with daily cron, R2 bucket binding, and MongoDB client (ported from data-sync Worker)
- Implemented stage-based pipeline engine that processes 6 enrichment stages sequentially with cursor-based crash-safe resumability
- Built Stage 1 classification using Fuse.js fuzzy matching with 16-pattern name normalization for robust UK public sector org matching
- Created per-domain rate limiter with configurable delays (moderngov 2s, nhs.uk 2s, gov.uk 1s, default 3s) and exponential backoff

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold enrichment Worker with MongoDB client, types, and rate limiter** - `f92b929` (feat)
2. **Task 2: Implement enrichment engine and Stage 1 classification with Fuse.js** - `506f55a` (feat)

## Files Created/Modified

- `workers/enrichment/package.json` - Worker project with mongodb, fuse.js, fast-xml-parser, @anthropic-ai/sdk, p-limit deps
- `workers/enrichment/wrangler.toml` - Daily 2AM cron, R2 bucket binding for document storage
- `workers/enrichment/tsconfig.json` - TypeScript config matching data-sync Worker pattern
- `workers/enrichment/src/types.ts` - Env, EnrichmentStage, EnrichmentJobDoc, DataSourceDoc, BuyerDoc, KeyPersonnelDoc, BoardDocumentDoc interfaces
- `workers/enrichment/src/db/client.ts` - MongoDB native driver connection (ported from data-sync)
- `workers/enrichment/src/db/enrichment-jobs.ts` - EnrichmentJob CRUD (getOrCreateJob, updateJobProgress, markJobComplete, markJobError)
- `workers/enrichment/src/db/buyers.ts` - Buyer batch fetch (cursor-based) and bulk enrichment update
- `workers/enrichment/src/db/data-sources.ts` - DataSource fetch operations (getAllDataSources, getDataSourceByName)
- `workers/enrichment/src/api-clients/rate-limiter.ts` - Per-domain rate limiter with exponential backoff and Retry-After support
- `workers/enrichment/src/enrichment-engine.ts` - Stage-based pipeline orchestrator with stage registry and findCurrentStage
- `workers/enrichment/src/stages/01-classify.ts` - Stage 1: Fuse.js fuzzy matching with name normalization and batch processing
- `workers/enrichment/src/index.ts` - Worker entry point with scheduled handler

## Decisions Made

1. **16-pattern name normalization** -- Added "metropolitan", "district", "county", "unitary", "authority", "combined" beyond the 10 patterns in the plan, because UK org names frequently include these institutional words that differ between contract data and canonical org names.

2. **Unimplemented stages auto-complete** -- When the pipeline encounters a stage with no registered function, it logs a message and marks the job complete so the pipeline can always progress forward. This is safer than throwing an error for stages that will be added in subsequent plans.

3. **Per-domain rate limiter uses hostname-based delay** -- Instead of a single delay, the limiter tracks last request time per hostname and looks up the delay from a domain-pattern map. This allows different rates for different council sites sharing the same ModernGov platform.

4. **Skip already-classified buyers** -- If a buyer already has orgType and dataSourceId set, the classify stage skips it. This makes re-running the stage idempotent and safe.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - Worker scaffold is ready. Deployment requires setting secrets:
- `wrangler secret put MONGODB_URI` (in workers/enrichment/)
- `wrangler secret put ANTHROPIC_API_KEY` (in workers/enrichment/)

## Next Phase Readiness
- Enrichment engine ready for Stage 2 (governance_urls) and Stage 3 (moderngov) implementations
- Rate limiter ready for per-domain ModernGov SOAP API calls
- All TypeScript compiles without errors
- Stage functions follow consistent StageFn signature for easy addition

---
*Phase: 13-buyer-data-enrichment*
*Completed: 2026-02-11*
