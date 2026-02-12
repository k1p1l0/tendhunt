---
phase: 16-scanner-ux-polish
plan: 02
status: done
completed: 2026-02-12
---

## Summary

Added smart double-click navigation to scanner rows with context-aware routing.

### What Changed

**scanner-data-grid.tsx:**
- Updated `onRowDoubleClick` prop signature to include column metadata: `(row, { type, aiColumnId }) => void`
- Modified `onCellActivated` to pass column type and aiColumnId so parent can distinguish AI vs data columns

**page.tsx:**
- Added `useRouter` from `next/navigation`
- Created `handleRowDoubleClick` function with type-based routing:
  - AI column double-click → opens AI drawer (same as single-click)
  - RFP scanner data cell → navigates to `/contracts/[id]`
  - Buyer scanner data cell → navigates to `/buyers/[id]`
  - Meetings scanner data cell → opens EntityDetailSheet (no dedicated page)
  - Default fallback → opens EntityDetailSheet
- EntityDetailSheet kept in place for meetings scanner type

### Files Modified
- `src/components/scanners/grid/scanner-data-grid.tsx` — updated prop type + onCellActivated
- `src/app/(dashboard)/scanners/[id]/page.tsx` — added router + handleRowDoubleClick

### Verification
- `npx tsc --noEmit` passes with zero errors
