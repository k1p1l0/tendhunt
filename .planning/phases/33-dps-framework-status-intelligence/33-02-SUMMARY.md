---
phase: 33-dps-framework-status-intelligence
plan: 02
subsystem: ui
tags: [react, badges, filters, contracts, dps, framework, tailwind]

requires:
  - phase: 33-dps-framework-status-intelligence
    provides: contractMechanism enum field on Contract schema (plan 01)
provides:
  - Mechanism filter chip on contracts toolbar (Type dropdown)
  - DPS/Framework mechanism badges (purple/indigo) in contract list
  - Amber "Window Closed" status for CLOSED DPS/Framework with future contractEndDate
affects: [33-03-PLAN, sculptor-ai, contract-dashboard]

tech-stack:
  added: []
  patterns:
    - "Mechanism badge config as Record lookup for extensible badge rendering"
    - "isDpsFrameworkActive helper for DPS-aware status coloring"
    - "Column span rebalancing: Status col-span-2, Sector col-span-1 to fit mechanism badges"

key-files:
  created: []
  modified:
    - apps/web/src/lib/contracts.ts
    - apps/web/src/components/contracts/contracts-toolbar.tsx
    - apps/web/src/components/contracts/contracts-table.tsx
    - apps/web/src/app/(dashboard)/contracts/page.tsx

key-decisions:
  - "Mechanism filter uses 'Type' label in UI (not 'Mechanism') for user-friendly language"
  - "Purple for DPS variants, indigo for Framework variants to create visual grouping"
  - "Amber 'Window Closed' only when contractEndDate is in the future -- past end dates keep default CLOSED styling"
  - "Status column expanded from col-span-1 to col-span-2, Sector reduced from col-span-2 to col-span-1"

patterns-established:
  - "MECHANISM_BADGE_CONFIG Record pattern for badge color/label lookup"
  - "statusLabel() + statusClassName() accept mechanism+endDate for DPS-aware rendering"

duration: 3min
completed: 2026-02-14
---

# Phase 33 Plan 02: Contract List DPS/Framework UI Summary

**Mechanism badges (purple DPS, indigo Framework), amber "Window Closed" status for active DPS/Framework, and Type filter chip on contracts toolbar**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-14T18:25:57Z
- **Completed:** 2026-02-14T18:28:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Contracts list shows purple/indigo mechanism badges for DPS and Framework contracts
- CLOSED DPS/Framework contracts with future contractEndDate show amber "Window Closed" instead of plain "CLOSED"
- Users can filter by mechanism type via "Type" filter chip in the toolbar
- Standard contracts are visually unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mechanism filter to data layer and toolbar** - `a893a91` (feat)
2. **Task 2: Add mechanism badge and DPS-aware status colors to contracts table** - `2e6795f` (feat)

## Files Created/Modified
- `apps/web/src/lib/contracts.ts` - Added mechanism field to ContractFilters and MongoDB query condition
- `apps/web/src/components/contracts/contracts-toolbar.tsx` - Added MECHANISMS constant and Type filter chip
- `apps/web/src/components/contracts/contracts-table.tsx` - Added mechanism badges, DPS-aware status colors, and "Window Closed" label
- `apps/web/src/app/(dashboard)/contracts/page.tsx` - Wired mechanism param through to ContractFeed and table

## Decisions Made
- "Type" label chosen for the filter chip (instead of "Mechanism") for user-friendly language
- Purple hues for DPS variants (dps, call_off_dps), indigo for Framework variants (framework, call_off_framework) -- creates visual grouping
- Amber "Window Closed" status only activates when contractEndDate is in the future -- past end dates keep default CLOSED styling
- Status column expanded from col-span-1 to col-span-2, Sector reduced from col-span-2 to col-span-1 to accommodate mechanism badge

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contract list fully DPS/Framework-aware visually
- Mechanism filter enables quick discovery of DPS and Framework opportunities
- Ready for 33-03: Sculptor AI awareness of DPS/Framework contracts

## Self-Check: PASSED

- All 4 source files verified on disk
- Commit `a893a91` verified in git log
- Commit `2e6795f` verified in git log
- SUMMARY.md created at expected path

---
*Phase: 33-dps-framework-status-intelligence*
*Completed: 2026-02-14*
