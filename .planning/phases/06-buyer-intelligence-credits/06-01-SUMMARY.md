---
phase: 06-buyer-intelligence-credits
plan: 01
subsystem: api, database, ui
tags: [mongoose, zustand, shadcn, popover, credits, buyer-intelligence, contact-reveal]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Clerk auth, MongoDB connection, Mongoose models pattern"
  - phase: 02-data-pipeline
    provides: "Contract, Buyer, Signal models with seeded data"
  - phase: 03-onboarding
    provides: "CreditAccount and CreditTransaction models, signup bonus flow"
provides:
  - "ContactReveal model for per-user buyer unlock tracking"
  - "fetchBuyers and fetchBuyerById data access functions with unlock status"
  - "Enhanced buyers list API with sort/pagination/unlock status"
  - "Buyer detail API with contracts, signals, and unlock status"
  - "Credit balance and transaction history API endpoints"
  - "Zustand credit store with reactive balance and animation state"
  - "Sidebar credit balance component with animated counter and transaction popover"
affects: [06-02, 06-03, buyer-profile-ui, contact-reveal-flow]

# Tech tracking
tech-stack:
  added: [radix-ui/popover, radix-ui/tabs]
  patterns: [per-user-unlock-status, credit-store-pattern, sidebar-widget]

key-files:
  created:
    - src/models/contact-reveal.ts
    - src/lib/buyers.ts
    - src/app/api/buyers/[id]/route.ts
    - src/app/api/credits/route.ts
    - src/app/api/credits/history/route.ts
    - src/stores/credit-store.ts
    - src/components/credits/credit-balance.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/popover.tsx
  modified:
    - src/models/buyer.ts
    - src/app/api/buyers/route.ts
    - src/components/layout/app-sidebar.tsx
    - tsconfig.json

key-decisions:
  - "ContactReveal model tracks unlocks per-user instead of using Buyer.isRevealed field"
  - "estimatedDocumentCount for total buyers (fast approximate) matching contracts.ts pattern"
  - ".npmrc with legacy-peer-deps to resolve marked peer conflict with glide-data-grid"
  - "Excluded workers/ from tsconfig.json to fix pre-existing build error"

patterns-established:
  - "Per-user unlock status: ContactReveal.find({userId}) -> Set for O(1) lookup in fetchBuyers"
  - "Credit store pattern: Zustand store with deductCredit + isAnimating for cross-component balance display"
  - "Sidebar widget pattern: Popover-based component in SidebarFooter with fetch-on-open for lazy data loading"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 6 Plan 01: Buyer Intelligence Backend & Credit Balance Summary

**ContactReveal model, enhanced buyer APIs with per-user unlock status, credit balance/history endpoints, Zustand credit store, and sidebar credit balance with animated counter and transaction popover**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T21:31:20Z
- **Completed:** 2026-02-11T21:35:17Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- ContactReveal model with compound unique index {userId, buyerId} for per-user buyer unlock tracking
- Enhanced buyers list API with sort, pagination, contactCount, and per-user isUnlocked status
- Buyer detail API returning buyer with associated contracts, signals, and unlock status
- Credit balance and transaction history API endpoints with auth protection
- Zustand credit store providing reactive balance updates with animated deduction counter
- Sidebar credit balance component with popover showing recent 5 transactions

## Task Commits

Each task was committed atomically:

1. **Task 1: ContactReveal model, buyer schema update, data access layer, and all API routes** - `db9f997` (feat)
2. **Task 2: Install shadcn components, Zustand credit store, and sidebar credit balance with popover** - `b8e9c32` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/models/contact-reveal.ts` - Per-user buyer unlock tracking with compound unique index
- `src/models/buyer.ts` - Added phone field to contact subdocument
- `src/lib/buyers.ts` - Data access layer: fetchBuyers (paginated, sorted, unlock status) and fetchBuyerById (with contracts, signals)
- `src/app/api/buyers/route.ts` - Enhanced with sort/order/page/pageSize query params, calls fetchBuyers
- `src/app/api/buyers/[id]/route.ts` - Buyer detail endpoint with contracts, signals, isUnlocked
- `src/app/api/credits/route.ts` - Credit balance endpoint returning current balance
- `src/app/api/credits/history/route.ts` - Paginated transaction history endpoint
- `src/stores/credit-store.ts` - Zustand store with balance, deductCredit, animated counter state
- `src/components/credits/credit-balance.tsx` - Sidebar widget with fetch-on-mount, animated counter, transaction popover
- `src/components/ui/tabs.tsx` - shadcn Tabs component
- `src/components/ui/popover.tsx` - shadcn Popover component
- `src/components/layout/app-sidebar.tsx` - Integrated CreditBalance in SidebarFooter
- `tsconfig.json` - Excluded workers/ directory from compilation
- `.npmrc` - Added legacy-peer-deps for npm dependency resolution

## Decisions Made
- ContactReveal model tracks unlocks per-user (compound unique index) instead of relying on Buyer.isRevealed field -- enables multi-user unlock tracking
- estimatedDocumentCount for total buyers count (fast approximate) matching the established contracts.ts pattern
- .npmrc with legacy-peer-deps to resolve marked@17 peer conflict with @glideapps/glide-data-grid requiring marked@^4
- CSS transitions only for animation (no framer-motion) per project decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded workers/ from tsconfig.json**
- **Found during:** Task 2 (build verification)
- **Issue:** `npm run build` failed due to pre-existing ScheduledController type errors in workers/data-sync/src/index.ts -- workers/ was not in tsconfig exclude list
- **Fix:** Added "workers" to tsconfig.json exclude array
- **Files modified:** tsconfig.json
- **Verification:** `npm run build` completes successfully
- **Committed in:** b8e9c32 (Task 2 commit)

**2. [Rule 3 - Blocking] Created .npmrc with legacy-peer-deps**
- **Found during:** Task 2 (shadcn component installation)
- **Issue:** `npx shadcn add tabs popover` failed due to npm ERESOLVE peer dependency conflict between marked@17 and @glideapps/glide-data-grid requiring marked@^4
- **Fix:** Created .npmrc with `legacy-peer-deps=true`
- **Files modified:** .npmrc
- **Verification:** shadcn components installed successfully, build passes
- **Committed in:** b8e9c32 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for build and dependency resolution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All buyer APIs and credit APIs ready for buyer profile UI (Plan 02)
- Credit store ready for contact reveal flow (Plan 03)
- CreditBalance component visible in sidebar on all authenticated pages
- ContactReveal model ready for buyer unlock/reveal operations

## Self-Check: PASSED

All 9 created files verified present. Both task commits (db9f997, b8e9c32) verified in git log.

---
*Phase: 06-buyer-intelligence-credits*
*Completed: 2026-02-11*
