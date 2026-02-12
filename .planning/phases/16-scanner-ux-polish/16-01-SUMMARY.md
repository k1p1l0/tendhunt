---
phase: 16-scanner-ux-polish
plan: 01
status: done
completed: 2026-02-12
---

## Summary

Removed threshold/dim controls and replaced with a Notion-style filter chip toolbar.

### What Changed

**Removed:**
- `threshold` and `hideBelow` state from `scanner-store.ts`
- `setThreshold` and `setHideBelow` actions from store
- Threshold slider + hide/dim toggle UI (`threshold-controls.tsx` deleted)
- Row dimming logic (`getRowThemeOverride`) from `scanner-data-grid.tsx`
- Threshold-based row splitting in `displayRows` computation
- `primaryColumnId` useMemo from `page.tsx` (only used for threshold)
- `isTextUseCase` import from `page.tsx` (no longer needed)

**Added:**
- `scanner-filter-toolbar.tsx` — Notion-style filter chip toolbar component
  - Reads `columnFilters` from scanner store
  - Renders applied filters as pill chips with column name, value, and X-to-remove
  - "Clear filters" button removes all active filters
  - Auto-hides when no filters are active
- Wired `<ScannerFilterToolbar>` into scanner page in toolbar area

### Files Modified
- `src/stores/scanner-store.ts` — removed threshold/hideBelow state and actions
- `src/components/scanners/grid/scanner-data-grid.tsx` — simplified displayRows, removed row dimming
- `src/app/(dashboard)/scanners/[id]/page.tsx` — replaced ThresholdControls with ScannerFilterToolbar
- `src/components/scanners/scanner-filter-toolbar.tsx` — new filter chip toolbar component
- `src/components/scanners/threshold-controls.tsx` — deleted

### Verification
- `npx tsc --noEmit` passes with zero errors
- No references to ThresholdControls, threshold, or hideBelow remain in scanner code
