---
phase: 33-dps-framework-status-intelligence
plan: 01
subsystem: database
tags: [mongodb, ocds, data-model, classification, backfill]

requires:
  - phase: 10-live-data-pipeline
    provides: OCDS mapper and data-sync worker
  - phase: 15-buyer-dedup-linkedin-data-detail-page
    provides: Contract model with buyerId field
provides:
  - contractMechanism enum field on Contract schema (indexed)
  - classifyContractMechanism() function in OCDS mapper
  - Backfill script for existing contracts
affects: [33-02-PLAN, 33-03-PLAN, contract-dashboard, sculptor-ai, scanner-grid]

tech-stack:
  added: []
  patterns:
    - "Contract mechanism classification via procurementMethodDetails + title regex"
    - "Backfill script with dry-run/write modes and bulk batch operations"

key-files:
  created:
    - apps/web/scripts/backfill-contract-mechanism.ts
  modified:
    - apps/web/src/models/contract.ts
    - apps/workers/data-sync/src/types.ts
    - apps/workers/data-sync/src/mappers/ocds-mapper.ts

key-decisions:
  - "Two-signal classification: procurementMethodDetails (most reliable) then title regex"
  - "Word-boundary regex for DPS to avoid false positives (e.g. ADPS)"
  - "Inline classification logic in backfill script (duplicated from mapper) since packages differ"

patterns-established:
  - "contractMechanism enum: standard, dps, framework, call_off_dps, call_off_framework"
  - "procurementMethodDetails takes priority over title pattern matching"

duration: 2min
completed: 2026-02-14
---

# Phase 33 Plan 01: Contract Mechanism Classification Summary

**contractMechanism enum field on Contract schema with OCDS-based classification logic and backfill script for 59,876 existing contracts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-14T18:20:50Z
- **Completed:** 2026-02-14T18:23:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Contract schema has indexed `contractMechanism` enum field (standard/dps/framework/call_off_dps/call_off_framework)
- OCDS mapper classifies every newly ingested contract by procurement mechanism
- Backfill script dry-run classified 59,876 contracts: 50,558 standard, 1,100 DPS, 5,238 framework, 542 call_off_dps, 2,438 call_off_framework

## Task Commits

Each task was committed atomically:

1. **Task 1: Add contractMechanism field to Contract schema and MappedContract type** - `4af6bc5` (feat)
2. **Task 2: Add classification logic to OCDS mapper and build backfill script** - `90a6ac3` (feat)

## Files Created/Modified
- `apps/web/src/models/contract.ts` - Added contractMechanism enum field with index
- `apps/workers/data-sync/src/types.ts` - Added contractMechanism to MappedContract interface
- `apps/workers/data-sync/src/mappers/ocds-mapper.ts` - Added classifyContractMechanism() function and wired into mapper
- `apps/web/scripts/backfill-contract-mechanism.ts` - Backfill script with dry-run/write modes and batch bulk operations

## Decisions Made
- Two-signal priority classification: `procurementMethodDetails` field is checked first (exact text match, most reliable), then title regex patterns as fallback
- Word-boundary regex `/\bDPS\b/` for DPS title matching to avoid false positives on words containing "DPS"
- Classification logic duplicated in backfill script since mapper lives in worker package (different dependency tree)
- Backfill uses bulkWrite with batch size 1000 for efficient database updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- contractMechanism field is ready for UI consumption in 33-02 (status badges, filter chips)
- Backfill script should be run with `--write` flag before deploying UI changes
- New contracts will automatically get classified via the updated OCDS mapper

## Self-Check: PASSED

- All 4 source files verified on disk
- Commit `4af6bc5` verified in git log
- Commit `90a6ac3` verified in git log
- SUMMARY.md created at expected path

---
*Phase: 33-dps-framework-status-intelligence*
*Completed: 2026-02-14*
