---
phase: 22-crm-pipeline-procurement-inbox
plan: 03
subsystem: ui, api
tags: [react, motion, sonner, kanban, crm, send-to-inbox]

requires:
  - phase: 22-01
    provides: "POST /api/inbox endpoint with upsert for idempotent card creation"
provides:
  - Reusable SendToInboxButton client component with loading/success/duplicate states
  - Contract detail page Send to Inbox integration
  - Buyer detail page Send to Inbox integration
  - Scanner entity detail sheet Send to Inbox integration
affects: [22-04, 22-05]

tech-stack:
  added: []
  patterns:
    - "AnimatePresence icon swap for button state transitions"
    - "Scanner type to entity type mapping constant for polymorphic CRM cards"

key-files:
  created:
    - apps/web/src/components/inbox/send-to-inbox-button.tsx
  modified:
    - apps/web/src/app/(dashboard)/contracts/[id]/page.tsx
    - apps/web/src/app/(dashboard)/buyers/[id]/page.tsx
    - apps/web/src/components/scanners/entity-detail-sheet.tsx

key-decisions:
  - "Replace Track Opportunity button on contract page (not add alongside)"
  - "Replace Export Report button on buyer page (not add alongside)"
  - "Scanner type maps to entity type via constant: rfps->contract, meetings->signal, buyers->buyer"

patterns-established:
  - "SendToInboxButton as reusable component for any entity type"

duration: 2min
completed: 2026-02-13
---

# Phase 22 Plan 03: Send to Inbox Button Summary

**Reusable SendToInboxButton with motion icon transitions integrated into contract detail, buyer detail, and scanner entity sheet**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T02:30:55Z
- **Completed:** 2026-02-13T02:32:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SendToInboxButton client component with POST to /api/inbox, toast notifications, loading spinner, and "In Inbox" disabled state
- AnimatePresence icon swap animation (Inbox -> Loader2 -> Check) respecting prefers-reduced-motion
- Integrated into 3 entity pages: contract detail, buyer detail, scanner entity detail sheet
- Scanner type to entity type mapping for polymorphic card creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SendToInboxButton component** - `1bcd474` (feat)
2. **Task 2: Integrate SendToInboxButton into entity pages** - `8b25676` (feat)

## Files Created/Modified
- `apps/web/src/components/inbox/send-to-inbox-button.tsx` - Reusable client component with loading/success/duplicate states and motion icon transitions
- `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` - Replaced Track Opportunity button with SendToInboxButton
- `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` - Replaced Export Report button with SendToInboxButton
- `apps/web/src/components/scanners/entity-detail-sheet.tsx` - Added SendToInboxButton in sheet header with scanner-to-entity type mapping

## Decisions Made
- Replaced existing placeholder buttons (Track Opportunity, Export Report) rather than adding alongside -- cleaner UX, one CTA per entity
- Scanner type to entity type mapping uses a const Record (rfps->contract, meetings->signal, buyers->buyer) for exhaustive type coverage
- Uses `useReducedMotion` from motion/react for accessibility compliance on icon transitions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SendToInboxButton ready for use in any future entity page
- All entity types (contract, buyer, signal) can be added to CRM pipeline
- Card detail panel (Plan 04) and automation rules (Plan 05) can build on this

## Self-Check: PASSED

- All 4 files exist on disk
- Both task commits verified (1bcd474, 8b25676)
- TypeScript compilation passes with no errors
- ESLint passes with 0 errors (18 pre-existing warnings)

---
*Phase: 22-crm-pipeline-procurement-inbox*
*Completed: 2026-02-13*
