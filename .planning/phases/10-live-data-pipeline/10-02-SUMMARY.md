---
phase: 10-live-data-pipeline
plan: 02
subsystem: infra
tags: [cloudflare-workers, api-clients, rate-limiting, ocds, find-a-tender, contracts-finder, cron]

# Dependency graph
requires:
  - phase: 10-live-data-pipeline
    plan: 01
    provides: "Sync engine with FetchPageFn interface, MongoDB operations, OCDS mapper, Worker scaffolding"
  - phase: 02-data-pipeline
    provides: "API behaviour research: FaT dual-stage, CF comma-separated stages, pagination patterns"
provides:
  - "Rate limiter with exponential backoff on 429/403/503 and 10s inter-request delay"
  - "Find a Tender API client with dual-stage fetching and links.next URL pagination"
  - "Contracts Finder API client with comma-separated stages and bare cursor pagination"
  - "Complete Worker scheduled handler wiring both sources to sync engine with item budgets"
  - "Deployable Worker ready for wrangler deploy after MONGODB_URI secret is set"
affects: [10-live-data-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: ["FetchPageFn factory pattern: createFatFetchPage/createCfFetchPage return closures with internal state", "Synthetic cursor STAGE:award for cross-stage transition in single FetchPageFn", "60/40 budget split (5400/3600 items) for prioritized dual-source processing"]

key-files:
  created:
    - workers/data-sync/src/api-clients/rate-limiter.ts
    - workers/data-sync/src/api-clients/fat-client.ts
    - workers/data-sync/src/api-clients/cf-client.ts
  modified:
    - workers/data-sync/src/index.ts

key-decisions:
  - "FaT dual-stage via closure variable and synthetic STAGE:award cursor -- clean FetchPageFn interface without exposing stage complexity"
  - "60/40 budget split: FaT gets 5400 items (higher value above-threshold tenders) vs CF 3600 items"
  - "Sequential processing (not parallel) to respect combined rate limits across both APIs"
  - "BACKFILL_START_DATE env var overrides both default start dates for storage-constrained M0 deployments"

patterns-established:
  - "FetchPageFn factory: closure-based state (currentStage) hidden behind clean interface"
  - "Rate limiting: fetchWithDelay wraps fetchWithBackoff -- composable utilities"
  - "Worker entry: try/finally with closeDb() for reliable connection cleanup"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 10 Plan 02: API Clients and Worker Handler Summary

**Rate-limited FaT and CF API clients with dual-stage/cursor pagination wired to Worker cron handler processing 9000 items/hour across both UK procurement sources**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T19:01:26Z
- **Completed:** 2026-02-11T19:03:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rate limiter with exponential backoff (429/403/503) and 10s inter-request delay (~6 req/min)
- FaT API client handles dual-stage fetching (tender then award separately) with full URL pagination and synthetic STAGE:award cursor
- CF API client handles single-request comma-separated stages with bare cursor token pagination
- Complete Worker scheduled handler wiring both sources sequentially with 60/40 item budget split
- Full project compiles with both TypeScript and wrangler bundler -- ready for deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement rate limiter and FaT + CF API clients** - `9cec3ba` (feat)
2. **Task 2: Wire Worker scheduled handler with full sync pipeline** - `338aebf` (feat)

## Files Created/Modified
- `workers/data-sync/src/api-clients/rate-limiter.ts` - fetchWithBackoff (exponential backoff) and fetchWithDelay (10s inter-request delay)
- `workers/data-sync/src/api-clients/fat-client.ts` - createFatFetchPage factory with dual-stage closure and links.next pagination
- `workers/data-sync/src/api-clients/cf-client.ts` - createCfFetchPage factory with comma-separated stages and bare cursor pagination
- `workers/data-sync/src/index.ts` - Worker scheduled handler wiring both API clients to sync engine with item budgets

## Decisions Made
- **FaT dual-stage via closure:** Internal `currentStage` variable tracks tender/award progression. Synthetic `STAGE:award` cursor triggers transition without exposing multi-stage complexity to the sync engine's FetchPageFn interface.
- **60/40 budget split:** FaT (5400 items) gets priority over CF (3600 items) because above-threshold tenders are higher value. Total ~9000 items per hourly invocation.
- **Sequential processing:** Both sources processed one after another (not parallel) to avoid exceeding combined rate limits.
- **BACKFILL_START_DATE override:** Single env var controls backfill depth for both sources -- useful for M0 storage constraints.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
**External services require manual configuration before deployment:**
- Run `cd workers/data-sync && wrangler secret put MONGODB_URI` to set the database connection string
- Ensure MongoDB Atlas Network Access allows Cloudflare Worker IPs (or use 0.0.0.0/0)
- Deploy with `cd workers/data-sync && wrangler deploy`

## Next Phase Readiness
- Complete data pipeline is now code-complete: Worker scaffolding + sync engine (Plan 01) + API clients + handler (Plan 02)
- Deployment requires only `wrangler secret put MONGODB_URI` + `wrangler deploy`
- Hourly cron will process ~9000 items per invocation across both FaT and CF sources
- Backfill will take multiple hourly runs to complete historical data; delta sync activates automatically once backfill finishes

## Self-Check: PASSED

All 4 files verified present. All 2 task commits verified in git log.

---
*Phase: 10-live-data-pipeline*
*Completed: 2026-02-11*
