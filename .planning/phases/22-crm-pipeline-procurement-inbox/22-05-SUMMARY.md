---
phase: 22-crm-pipeline-procurement-inbox
plan: 05
subsystem: api, ui
tags: [mongoose, auto-send, scoring, pipeline, inbox, shadcn]

requires:
  - phase: 22-01
    provides: PipelineCard model, pipeline stages constants
  - phase: 22-02
    provides: Kanban board UI, inbox API routes

provides:
  - AutoSendRule Mongoose model with compound unique index
  - CRUD API for auto-send rules (list, create/upsert, update, delete)
  - AutoRulesDialog configuration UI (threshold, stage, toggle)
  - Scanner header menu "Auto-send to Inbox" item for AI columns
  - Scoring endpoint auto-creates inbox cards for qualifying scores

affects: [scanners, inbox, scoring]

tech-stack:
  added: []
  patterns: [auto-send threshold rules, non-blocking upsert during SSE streams]

key-files:
  created:
    - apps/web/src/models/auto-send-rule.ts
    - apps/web/src/app/api/inbox/auto-rules/route.ts
    - apps/web/src/app/api/inbox/auto-rules/[id]/route.ts
    - apps/web/src/components/inbox/auto-rules-dialog.tsx
  modified:
    - apps/web/src/components/scanners/grid/header-menu.tsx
    - apps/web/src/components/scanners/grid/scanner-data-grid.tsx
    - apps/web/src/app/(dashboard)/scanners/[id]/page.tsx
    - apps/web/src/app/api/scanners/[id]/score-column/route.ts

key-decisions:
  - "Auto-send rules cached once at start of scoring run, not per-entity query"
  - "Non-blocking void PipelineCard upsert to avoid blocking SSE stream"
  - "onAutoRule callback pattern through ScannerDataGrid to scanner page for dialog rendering"
  - "Entity display fields extracted via getEntityDisplayFields helper per scanner type"

patterns-established:
  - "Auto-send rule pattern: cached rules + non-blocking upsert during scoring"
  - "Header menu callback pattern for dialog-triggering menu items"

duration: 2min
completed: 2026-02-13
---

# Phase 22 Plan 05: Scanner Auto-Send Rules Summary

**Auto-send rules with configurable score thresholds per AI column, integrated into scanner header menu and scoring endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T02:33:56Z
- **Completed:** 2026-02-13T02:36:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- AutoSendRule model with per-user/scanner/column compound unique index
- Full CRUD API: list (filterable by scanner), create/upsert, update (threshold/stage/toggle), delete
- AutoRulesDialog with threshold input, stage select, active toggle, and delete confirmation
- "Auto-send to Inbox" menu item in scanner AI column header menu
- Scoring endpoint auto-creates inbox cards when score >= threshold with addedBy="auto_rule"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AutoSendRule model and API routes** - `fc31fbc` (feat)
2. **Task 2: Build auto-rules dialog and integrate with scoring endpoint** - `afbaf7b` (feat)

## Files Created/Modified
- `apps/web/src/models/auto-send-rule.ts` - AutoSendRule Mongoose model with compound unique index
- `apps/web/src/app/api/inbox/auto-rules/route.ts` - GET list + POST create/upsert endpoints
- `apps/web/src/app/api/inbox/auto-rules/[id]/route.ts` - PATCH update + DELETE endpoints
- `apps/web/src/components/inbox/auto-rules-dialog.tsx` - Configuration dialog with threshold/stage/toggle
- `apps/web/src/components/scanners/grid/header-menu.tsx` - Added "Auto-send to Inbox" menu item for AI columns
- `apps/web/src/components/scanners/grid/scanner-data-grid.tsx` - Added onAutoRule prop passthrough
- `apps/web/src/app/(dashboard)/scanners/[id]/page.tsx` - AutoRulesDialog integration with scanner page
- `apps/web/src/app/api/scanners/[id]/score-column/route.ts` - Auto-send check after each entity scored

## Decisions Made
- Auto-send rules cached once at start of scoring run (not queried per entity) for efficiency
- Non-blocking PipelineCard upsert via void + catch to avoid blocking SSE stream
- onAutoRule callback propagated through ScannerDataGrid to page level for dialog rendering
- getEntityDisplayFields helper maps scanner type to appropriate entity fields for card creation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 CRM Pipeline complete (all 5 plans)
- Auto-send rules enable proactive CRM automation
- Ready for Phase 11 (spend intelligence) or Phase 15 (entity linking)

---
*Phase: 22-crm-pipeline-procurement-inbox*
*Completed: 2026-02-13*
