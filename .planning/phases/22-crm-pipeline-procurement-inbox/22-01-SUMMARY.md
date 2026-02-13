---
phase: 22-crm-pipeline-procurement-inbox
plan: 01
subsystem: api, database
tags: [mongoose, nextjs-api-routes, clerk-auth, kanban, pipeline, crud]

requires: []
provides:
  - PipelineCard Mongoose model with polymorphic entity refs and stage enum
  - PipelineCardNote Mongoose model for card comments
  - Shared pipeline stage constants (labels, colors, icons)
  - TypeScript types for inbox data structures
  - 8 API endpoints for full CRUD, reorder, and notes lifecycle
affects: [22-02, 22-03, 22-04]

tech-stack:
  added: []
  patterns:
    - "findOneAndUpdate with upsert for idempotent card creation"
    - "bulkWrite for atomic batch position updates on drag-drop"
    - "Compound unique index for entity deduplication per user"

key-files:
  created:
    - apps/web/src/models/pipeline-card.ts
    - apps/web/src/models/pipeline-card-note.ts
    - apps/web/src/lib/constants/pipeline-stages.ts
    - apps/web/src/types/inbox.ts
    - apps/web/src/app/api/inbox/route.ts
    - apps/web/src/app/api/inbox/[id]/route.ts
    - apps/web/src/app/api/inbox/reorder/route.ts
    - apps/web/src/app/api/inbox/[id]/notes/route.ts
  modified: []

key-decisions:
  - "deleteModel pattern for HMR safety on both models"
  - "Stage constants use Tailwind bg/text classes for direct UI consumption"
  - "ReorderPayload supports cross-column moves via sourceColumn field"

patterns-established:
  - "Pipeline card upsert: findOneAndUpdate with compound unique index"
  - "Reorder: bulkWrite with position index per stage column"

duration: 1min
completed: 2026-02-13
---

# Phase 22 Plan 01: CRM Pipeline Data Layer Summary

**Mongoose models, stage constants, TypeScript types, and 8 API endpoints for pipeline card CRUD, drag-drop reorder, and notes**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-13T02:28:21Z
- **Completed:** 2026-02-13T02:29:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- PipelineCard model with 6-stage enum, position tracking, polymorphic entity references, and compound unique index for deduplication
- PipelineCardNote model with cardId ref, content maxlength, and timestamp-sorted queries
- Shared pipeline stage constants with labels, Tailwind colors, and lucide icon names
- 8 API endpoints: GET/POST /inbox, GET/PATCH/DELETE /inbox/[id], PATCH /inbox/reorder, GET/POST /inbox/[id]/notes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Mongoose models and shared constants** - `a1b64ce` (feat)
2. **Task 2: Create API routes for CRUD, reorder, and notes** - `34026c1` (feat)

## Files Created/Modified
- `apps/web/src/lib/constants/pipeline-stages.ts` - Stage enum, labels, colors, icons shared between FE/BE
- `apps/web/src/types/inbox.ts` - TypeScript interfaces for PipelineCardData, PipelineNoteData, ReorderPayload
- `apps/web/src/models/pipeline-card.ts` - PipelineCard Mongoose model with compound indexes
- `apps/web/src/models/pipeline-card-note.ts` - PipelineCardNote Mongoose model for card comments
- `apps/web/src/app/api/inbox/route.ts` - GET list + POST create with upsert
- `apps/web/src/app/api/inbox/[id]/route.ts` - GET/PATCH/DELETE single card
- `apps/web/src/app/api/inbox/reorder/route.ts` - PATCH bulkWrite for drag-drop reorder
- `apps/web/src/app/api/inbox/[id]/notes/route.ts` - GET/POST notes for a card

## Decisions Made
- Used deleteModel pattern for HMR safety (same as Scanner model)
- Stage constants export Tailwind bg/text classes for direct UI consumption without mapping
- ReorderPayload supports cross-column moves via optional sourceColumn field
- Card creation uses findOneAndUpdate with upsert for idempotent "send to inbox"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API endpoints ready for Kanban board UI consumption (Plan 02)
- Stage constants ready for column headers and card styling
- Reorder endpoint ready for @dnd-kit drag-drop integration
- Notes endpoint ready for card detail panel

## Self-Check: PASSED

- All 8 files exist on disk
- Both task commits verified (a1b64ce, 34026c1)
- TypeScript compilation passes with no errors

---
*Phase: 22-crm-pipeline-procurement-inbox*
*Completed: 2026-02-13*
