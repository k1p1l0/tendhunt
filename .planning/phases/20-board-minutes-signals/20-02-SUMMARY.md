---
phase: 20-board-minutes-signals
plan: 02
subsystem: database, api
tags: [mongoose, mongodb, signal, board-document, enrichment, worker-chaining]

requires:
  - phase: 13-buyer-data-enrichment
    provides: BoardDocument model, enrichment worker pipeline, Signal model
  - phase: 10-live-data-pipeline
    provides: Data-sync worker with buyer extraction
provides:
  - Signal model with boardDocumentId, quote, entities fields for board-minutes extraction
  - BoardDocument signalExtractionStatus for tracking signal extraction state
  - Enrichment worker chaining to board-minutes worker (batch + single-buyer)
  - Signal query by buyerId for reliable buyer-scoped signal lookups
affects: [20-board-minutes-signals plan 03, 20-board-minutes-signals plan 04]

tech-stack:
  added: []
  patterns:
    - "$or query for backward-compatible signal lookup (buyerId + organizationName)"
    - "signalExtractionStatus separate from extractionStatus for independent tracking"

key-files:
  created: []
  modified:
    - apps/web/src/models/signal.ts
    - apps/web/src/models/board-document.ts
    - apps/workers/enrichment/src/index.ts
    - apps/workers/enrichment/src/types.ts
    - apps/workers/enrichment/wrangler.toml
    - apps/web/src/lib/buyers.ts

key-decisions:
  - "entities subdoc uses _id:false to avoid unnecessary ObjectId generation"
  - "$or query for signals combines buyerId (new) + organizationName (legacy) for backward compat"
  - "signalExtractionStatus is independent from extractionStatus (text vs signal extraction)"

patterns-established:
  - "Worker chaining: enrichment -> board-minutes after all_complete and single-buyer"
  - "Dual-field $or query pattern for migration-safe lookups"

duration: 2min
completed: 2026-02-12
---

# Phase 20 Plan 02: Schema Extensions & Worker Chaining Summary

**Signal/BoardDocument model extensions with enrichment-to-board-minutes worker chaining and buyerId-based signal queries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T23:25:10Z
- **Completed:** 2026-02-12T23:26:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended Signal model with boardDocumentId (indexed ObjectId ref), quote, and entities subdocument (companies/amounts/dates/people arrays)
- Added signalExtractionStatus to BoardDocument for independent signal extraction tracking
- Wired enrichment worker to chain to board-minutes worker in both batch (all_complete) and single-buyer flows
- Fixed signal query in fetchBuyerById to use $or with buyerId + organizationName for backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Signal and BoardDocument Mongoose models** - `abbbdeb` (feat)
2. **Task 2: Add enrichment worker chaining and fix signal buyerId query** - `9c4a75b` (feat)

## Files Created/Modified
- `apps/web/src/models/signal.ts` - Added boardDocumentId, quote, entities fields; indexed buyerId
- `apps/web/src/models/board-document.ts` - Added signalExtractionStatus enum field
- `apps/workers/enrichment/src/index.ts` - Board-minutes chaining in batch + single-buyer flows
- `apps/workers/enrichment/src/types.ts` - Added BOARD_MINUTES_WORKER_URL to Env interface
- `apps/workers/enrichment/wrangler.toml` - Added BOARD_MINUTES_WORKER_URL env var
- `apps/web/src/lib/buyers.ts` - Signal query uses $or with buyerId + organizationName

## Decisions Made
- entities subdoc uses `_id: false` to avoid unnecessary ObjectId generation per plan spec
- $or query combines buyerId (new reliable path) with organizationName (legacy seeded signals) for backward compatibility during migration
- signalExtractionStatus is intentionally separate from extractionStatus since they track different processes (text content extraction vs signal extraction by board-minutes worker)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Signal and BoardDocument schemas ready for board-minutes extraction worker (Plan 03)
- Enrichment worker will auto-chain to board-minutes worker once deployed
- Frontend signal display (Plan 04) can use boardDocumentId and entities fields

## Self-Check: PASSED

All 7 modified files verified on disk. Both task commits (abbbdeb, 9c4a75b) confirmed in git log.

---
*Phase: 20-board-minutes-signals*
*Completed: 2026-02-12*
