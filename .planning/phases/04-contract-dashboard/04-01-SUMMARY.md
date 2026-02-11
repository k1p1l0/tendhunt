---
phase: 04-contract-dashboard
plan: 01
subsystem: ui
tags: [nextjs, mongodb, mongoose, shadcn, tailwind, use-debounce, server-components, url-params]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Clerk auth, dashboard layout, MongoDB connection, Mongoose models"
  - phase: 02-data-pipeline
    provides: "809 real contracts in MongoDB (Contract model with text index)"
provides:
  - "Contract feed page at /contracts with card-based display"
  - "Data access layer fetchContracts() with text search, filters, sort, pagination"
  - "ContractCard component with title, buyer, value, dates, source badge, sector badge, conditional vibeScore"
  - "ContractSearch with 300ms debounce"
  - "ContractFilters with sector (20), region (14), value range (6), sort order (2) dropdowns"
  - "Pagination with Previous/Next navigation"
  - "ContractCount showing total and filtered counts"
affects: [04-contract-dashboard, 05-vibe-scanner]

# Tech tracking
tech-stack:
  added: [use-debounce]
  patterns: [URL-param-driven filters, server component data fetching, Suspense with keyed fallback]

key-files:
  created:
    - src/lib/contracts.ts
    - src/components/contracts/contract-card.tsx
    - src/components/contracts/contract-count.tsx
    - src/components/contracts/contract-search.tsx
    - src/components/contracts/contract-filters.tsx
    - src/components/contracts/pagination.tsx
  modified:
    - src/app/(dashboard)/contracts/page.tsx
    - package.json
    - package-lock.json
    - tsconfig.json

key-decisions:
  - "URL-param-driven filters for shareability and browser back/forward navigation"
  - "Record<string, 1 | -1> type annotation for Mongoose sort to avoid TypeScript union narrowing issue"
  - "Excluded landing/ directory from tsconfig.json to fix pre-existing build error"

patterns-established:
  - "URL search params pattern: client components read useSearchParams, update via router.replace"
  - "Server component data fetching: page.tsx awaits searchParams, calls data layer, renders results"
  - "Suspense key pattern: JSON.stringify all params as Suspense key for re-render on filter changes"
  - "Contract card data mapping: lean() results mapped to typed ContractCardData interface"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 4 Plan 01: Contract Feed Summary

**Searchable, filterable contract feed at /contracts with 20-per-page pagination, 4 filter dropdowns, debounced search, and card-based display of 809 UK procurement contracts from MongoDB**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T05:18:19Z
- **Completed:** 2026-02-11T05:22:28Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Data access layer `fetchContracts()` with $text search, sector/region/value filters, date/score sort, and parallel query execution
- 6 new components: ContractCard, ContractCount, ContractSearch, ContractFilters, Pagination, plus skeleton loading states
- Full /contracts page replacing Phase 1 placeholder with real contract data from MongoDB
- URL-param-driven architecture enabling shareable links and browser back/forward navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Data access layer and contract card component** - `e4ac03d` (feat)
2. **Task 2: Search, filters, pagination, and contracts page assembly** - `e945b26` (feat)

## Files Created/Modified

- `src/lib/contracts.ts` - Data access layer: fetchContracts() with ContractFilters interface, MongoDB query builder, parallel execution
- `src/components/contracts/contract-card.tsx` - Card component: title (line-clamp-2), buyer, GBP value, dates, source badge (FaT/CF), sector badge, conditional vibeScore badge (green/yellow/red)
- `src/components/contracts/contract-count.tsx` - Count display: "Showing X of Y contracts" or "Y contracts" when unfiltered
- `src/components/contracts/contract-search.tsx` - Search input with 300ms debounce, Search icon, resets pagination on change
- `src/components/contracts/contract-filters.tsx` - 4 Select dropdowns: sector (20 options), region (14 NUTS1 codes), value range (6 brackets), sort (date/score)
- `src/components/contracts/pagination.tsx` - Previous/Next buttons with page counter, hidden when totalPages <= 1
- `src/app/(dashboard)/contracts/page.tsx` - Server component: awaits searchParams (Next.js 16), calls fetchContracts, renders full feed with Suspense
- `package.json` / `package-lock.json` - Added use-debounce dependency
- `tsconfig.json` - Excluded landing/ directory from TypeScript compilation

## Decisions Made

- **URL-param-driven filters:** All filter state lives in URL searchParams rather than React state. Enables shareable links, browser back/forward, and server-side rendering of filtered results.
- **Record<string, 1 | -1> for sort order:** TypeScript couldn't narrow the conditional sort object union. Explicit Record type annotation resolved the Mongoose .sort() type mismatch.
- **Excluded landing/ from tsconfig:** The landing/ directory contains an unrelated Astro template with broken imports. Adding it to tsconfig exclude fixed a pre-existing build error blocking this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded landing/ directory from tsconfig.json**
- **Found during:** Task 1 (build verification)
- **Issue:** `npx next build` failed on `landing/manuarora700-notus-agent-marketing-template-66f9877e9217be5ed526087142dfd3c88fa2a5bb/app/about/page.tsx` -- unrelated Astro template with broken imports was included in TypeScript compilation
- **Fix:** Added `"landing"` to tsconfig.json `exclude` array
- **Files modified:** tsconfig.json
- **Verification:** Build passes after change
- **Committed in:** e4ac03d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed sort order type for Mongoose compatibility**
- **Found during:** Task 1 (build verification)
- **Issue:** TypeScript conditional expression `filters.sort === 'score' ? { vibeScore: -1, publishedDate: -1 } : { publishedDate: -1 }` produced a union type that Mongoose .sort() rejected
- **Fix:** Annotated sortOrder as `Record<string, 1 | -1>` to satisfy Mongoose's sort parameter type
- **Files modified:** src/lib/contracts.ts
- **Verification:** Build passes after change
- **Committed in:** e4ac03d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for build to pass. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contract feed fully functional at /contracts with real data
- Cards link to /contracts/{id} -- Plan 02 will build the detail view page
- vibeScore badge ready but all scores currently null -- Phase 5 (Vibe Scanner) will populate them
- Sort by "AI Score" returns same order as "Newest First" until vibeScores are populated

## Self-Check: PASSED

All 8 files verified present. Both task commits (e4ac03d, e945b26) confirmed in git log.

---
*Phase: 04-contract-dashboard*
*Completed: 2026-02-11*
