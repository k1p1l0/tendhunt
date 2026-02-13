---
phase: 22-crm-pipeline-procurement-inbox
plan: 04
subsystem: ui, crm
tags: [sheet, notes, kanban, framer-motion, shadcn, nextjs]

requires:
  - phase: 22-01
    provides: "PipelineCard model, PipelineCardNote model, API endpoints for CRUD and notes"
  - phase: 22-02
    provides: "Kanban board UI, inbox store, card components"
provides:
  - CardDetailSheet with full card details, source link, priority, notes, archive/delete
  - CardNotes with fetch/add notes, auto-resize textarea, animations
  - Card click to sheet wiring through board, column, card components
affects: [22-05]

tech-stack:
  added: []
  patterns:
    - "Optimistic PATCH with callback-based rollback for priority and archive"
    - "Dialog confirmation before destructive delete action"
    - "onCardClick prop threaded through board -> column -> card for click separation from drag"

key-files:
  created:
    - apps/web/src/components/inbox/card-detail-sheet.tsx
    - apps/web/src/components/inbox/card-notes.tsx
  modified:
    - apps/web/src/components/inbox/kanban-card.tsx
    - apps/web/src/components/inbox/kanban-column.tsx
    - apps/web/src/components/inbox/kanban-board.tsx
    - apps/web/src/app/(dashboard)/inbox/page.tsx

key-decisions:
  - "Dialog component for delete confirmation (no alert-dialog component available)"
  - "onCardClick prop threaded board->column->card for click vs drag separation"
  - "Optimistic updates via onCardUpdate callback with rollback on error"

patterns-established:
  - "Sheet detail panel pattern: selectedCard state + isSheetOpen in parent page"
  - "Notes component: fetch on mount, prepend on add, AnimatePresence for entry animation"

duration: 1min
completed: 2026-02-13
---

# Phase 22 Plan 04: Card Detail Sheet & Notes Summary

**Side sheet with full card details, source entity link, priority selector, notes/comments, and archive/delete actions triggered by card click on Kanban board**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-13T02:34:11Z
- **Completed:** 2026-02-13T02:35:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- CardDetailSheet with header (entity badge, title, deadline), source entity link, buyer/value/sector details, priority 3-button selector, stage badge, notes section, and archive/delete footer
- CardNotes with notes list (AnimatePresence animations), add-note textarea (auto-resize, 2000 char limit with indicator), and Enter-to-submit
- Card click wiring from KanbanBoard through KanbanColumn to KanbanCard with selectedCard state and sheet open/close management in InboxPage
- Delete confirmation dialog, optimistic priority/archive updates with toast feedback and rollback on error

## Task Commits

Each task was committed atomically:

1. **Task 1: Build card detail sheet with notes and actions** - `d7b3c4d` (feat)
2. **Task 2: Wire card click to open detail sheet on board** - `5afce4b` (feat)

## Files Created/Modified
- `apps/web/src/components/inbox/card-detail-sheet.tsx` - Side sheet with full card info, priority selector, notes, archive/delete
- `apps/web/src/components/inbox/card-notes.tsx` - Notes list with add form, animations, auto-resize textarea
- `apps/web/src/components/inbox/kanban-card.tsx` - Added onCardClick prop with onClick handler
- `apps/web/src/components/inbox/kanban-column.tsx` - Thread onCardClick prop to KanbanCard
- `apps/web/src/components/inbox/kanban-board.tsx` - Accept and thread onCardClick prop
- `apps/web/src/app/(dashboard)/inbox/page.tsx` - Manage selectedCard state, render CardDetailSheet

## Decisions Made
- Used Dialog component for delete confirmation (no alert-dialog component exists in UI library)
- onCardClick prop threaded board -> column -> card, works because PointerSensor's 8px activation distance means clicks don't trigger drag
- Optimistic updates via onCardUpdate/onCardDelete callbacks with server-side rollback on error
- Source entity link: contracts -> /contracts/[id], buyers -> /buyers/[id], signals -> null (no standalone page)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Card detail sheet fully functional for viewing details, notes, priority, and archive/delete
- Ready for Plan 05: Automation rules for auto-adding cards to pipeline
- All CRM-06 (card details), CRM-07 (notes/comments), CRM-08 (source entity link) requirements delivered

## Self-Check: PASSED

- All 2 created files exist on disk
- All 4 modified files verified
- Both task commits verified (d7b3c4d, 5afce4b)
- TypeScript compilation passes with no errors
- Lint passes with no new errors

---
*Phase: 22-crm-pipeline-procurement-inbox*
*Completed: 2026-02-13*
