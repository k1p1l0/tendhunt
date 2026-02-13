---
phase: 22-crm-pipeline-procurement-inbox
plan: 02
subsystem: ui, state-management
tags: [dnd-kit, zustand, kanban, drag-and-drop, framer-motion, nextjs]

requires:
  - phase: 22-01
    provides: "PipelineCard model, stage constants, types, API endpoints"
provides:
  - Zustand inbox store with card CRUD and fetch
  - Kanban board UI with 6 procurement stage columns
  - @dnd-kit drag-and-drop with optimistic reorder and server persist
  - Sidebar Inbox nav item and breadcrumb
  - Inbox page at /inbox with loading skeletons
affects: [22-03, 22-04, 22-05]

tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns:
    - "DndContext with PointerSensor (8px activation distance) for click vs drag separation"
    - "closestCorners collision detection for accurate cross-column card drops"
    - "Optimistic reorder with server persist and rollback on fetch error"
    - "AnimatePresence + motion.div layout prop for smooth card enter/exit animations"

key-files:
  created:
    - apps/web/src/stores/inbox-store.ts
    - apps/web/src/components/inbox/kanban-board.tsx
    - apps/web/src/components/inbox/kanban-column.tsx
    - apps/web/src/components/inbox/kanban-card.tsx
    - apps/web/src/components/inbox/kanban-card-content.tsx
    - apps/web/src/components/inbox/kanban-card-preview.tsx
    - apps/web/src/components/inbox/column-header.tsx
    - apps/web/src/app/(dashboard)/inbox/page.tsx
    - apps/web/src/app/(dashboard)/inbox/breadcrumb.tsx
  modified:
    - apps/web/src/components/layout/app-sidebar.tsx
    - apps/web/src/components/agent/agent-provider.tsx
    - apps/web/package.json

key-decisions:
  - "PointerSensor with 8px activation distance for click vs drag separation"
  - "closestCorners collision detection for cross-column accuracy"
  - "Optimistic reorder with fetchCards rollback on server error"
  - "AnimatePresence for card enter/exit animations in columns"

patterns-established:
  - "Kanban column: useDroppable + SortableContext + verticalListSortingStrategy"
  - "DragOverlay with rotated/scaled preview card for visual drag feedback"
  - "groupByStage utility for converting flat card array to column-grouped record"

duration: 1min
completed: 2026-02-13
---

# Phase 22 Plan 02: Kanban Board UI Summary

**@dnd-kit Kanban board with 6 procurement columns, Zustand state, optimistic drag-and-drop reorder, and animated card transitions**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-13T02:31:00Z
- **Completed:** 2026-02-13T02:32:53Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Zustand inbox store with fetch/add/update/remove card actions for full board state management
- Kanban board with 6 columns (New, Qualified, Preparing Bid, Submitted, Won, Lost) rendering draggable cards
- @dnd-kit drag-and-drop with optimistic reorder, DragOverlay preview, and server persist via /api/inbox/reorder
- Card UI with title, buyer name, GBP value, deadline, priority dot, entity type badge, and source attribution
- Sidebar Inbox nav item and breadcrumb following existing patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zustand inbox store, sidebar nav, breadcrumb, and inbox page** - `201e8fa` (feat)
2. **Task 2: Build Kanban board components with @dnd-kit drag-and-drop** - `b77efa6` (feat)

## Files Created/Modified
- `apps/web/src/stores/inbox-store.ts` - Zustand store for inbox card state with fetch/CRUD actions
- `apps/web/src/components/inbox/kanban-board.tsx` - DndContext + DragOverlay + column layout with optimistic reorder
- `apps/web/src/components/inbox/kanban-column.tsx` - Droppable column with SortableContext and AnimatePresence
- `apps/web/src/components/inbox/kanban-card.tsx` - Sortable card wrapper with useSortable hook
- `apps/web/src/components/inbox/kanban-card-content.tsx` - Card display with title, buyer, value, deadline, badges
- `apps/web/src/components/inbox/kanban-card-preview.tsx` - Elevated drag overlay preview with rotation
- `apps/web/src/components/inbox/column-header.tsx` - Column header with colored accent, label, count badge
- `apps/web/src/app/(dashboard)/inbox/page.tsx` - Client page with loading skeletons and AgentContextSetter
- `apps/web/src/app/(dashboard)/inbox/breadcrumb.tsx` - Breadcrumb following contracts pattern
- `apps/web/src/components/layout/app-sidebar.tsx` - Added Inbox nav item with Inbox icon after Scanners
- `apps/web/src/components/agent/agent-provider.tsx` - Added "inbox" to AgentPageContext type union
- `apps/web/package.json` - Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

## Decisions Made
- Used PointerSensor with 8px activation distance to separate click from drag gestures (per research Pitfall 6)
- Used closestCorners collision detection for accurate cross-column card drops
- Optimistic reorder updates local state immediately; rollback via fetchCards on server error
- AnimatePresence + motion.div layout prop for smooth card enter/exit/reorder animations
- Added "inbox" to AgentPageContext union type for agent panel context awareness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added "inbox" to AgentPageContext type union**
- **Found during:** Task 1 (inbox page creation)
- **Issue:** TypeScript error: "inbox" not assignable to AgentPageContext.page union
- **Fix:** Added "inbox" to the page union type in agent-provider.tsx
- **Files modified:** apps/web/src/components/agent/agent-provider.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** 201e8fa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary type extension for correctness. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Kanban board ready for card data display and interaction
- Ready for Plan 03: "Send to Inbox" functionality from contracts/buyers/signals
- Ready for Plan 04: Card detail sheet with notes, stage history
- API endpoints from Plan 01 fully consumed by the board UI

## Self-Check: PASSED

- All 9 created files exist on disk
- Both task commits verified (201e8fa, b77efa6)
- TypeScript compilation passes with no errors
- Lint passes with no new errors

---
*Phase: 22-crm-pipeline-procurement-inbox*
*Completed: 2026-02-13*
