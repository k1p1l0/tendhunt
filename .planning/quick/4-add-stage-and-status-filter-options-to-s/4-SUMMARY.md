---
phase: quick
plan: 4
subsystem: ui, api
tags: [scanner, filters, mongodb, select-dropdown]

requires:
  - phase: 05-vibe-scanner
    provides: Scanner model and edit scanner dialog
  - phase: 02-data-pipeline
    provides: Contract model with stage/status fields

provides:
  - Stage and Status filter dropdowns in RFP scanner edit dialog
  - End-to-end pipeline for stage/status filtering (model -> UI -> API -> MongoDB query)

affects: [scanner, contracts]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/src/models/scanner.ts
    - apps/web/src/lib/contracts.ts
    - apps/web/src/app/api/contracts/route.ts
    - apps/web/src/components/scanners/edit-scanner-dialog.tsx
    - apps/web/src/app/(dashboard)/scanners/[id]/page.tsx

key-decisions:
  - "Stage/Status dropdowns placed before Sector/Region row in RfpFilters for logical procurement lifecycle ordering"

duration: 2min
completed: 2026-02-12
---

# Quick Task 4: Add Stage and Status Filter Options to Scanner Grid Summary

**Stage (TENDER/AWARD/PLANNING) and Status (OPEN/CLOSED/CANCELLED) dropdowns in RFP scanner edit dialog with full end-to-end query pipeline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T23:51:32Z
- **Completed:** 2026-02-12T23:53:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added stage and status fields to Scanner model filters subdocument for persistence
- Extended ContractFilters interface and fetchContracts with stage/status MongoDB query conditions
- Added Stage and Status Select dropdowns to RfpFilters in edit scanner dialog with proper option constants
- Wired scanner detail page to pass stage/status from saved filters as query params to contracts API

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stage/status to Scanner model and contracts query pipeline** - `7306603` (feat)
2. **Task 2: Add stage/status dropdowns to edit scanner dialog and wire scanner page** - `e281a7c` (feat)

## Files Created/Modified

- `apps/web/src/models/scanner.ts` - Added stage and status fields to filters subdocument
- `apps/web/src/lib/contracts.ts` - Added stage/status to ContractFilters interface and fetchContracts query conditions
- `apps/web/src/app/api/contracts/route.ts` - Read stage/status from searchParams
- `apps/web/src/components/scanners/edit-scanner-dialog.tsx` - Added STAGES/STATUSES constants, Stage/Status Select dropdowns in RfpFilters, sync and save logic
- `apps/web/src/app/(dashboard)/scanners/[id]/page.tsx` - Pass stage/status from scanner filters to contracts API query params

## Decisions Made

- Stage/Status dropdowns placed before Sector/Region row in RfpFilters for logical procurement lifecycle ordering (stage/status are primary contract classification, sector/region are secondary)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Stage and status filters fully functional end-to-end
- No blockers

---
*Quick Task: 4*
*Completed: 2026-02-12*
