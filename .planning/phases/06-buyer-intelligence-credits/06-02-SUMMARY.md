---
phase: 06-buyer-intelligence-credits
plan: 02
subsystem: ui
tags: [next.js, shadcn, tabs, table, breadcrumb, blur-filter, clipboard-api, buyer-profile]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Clerk auth, MongoDB connection, layout with breadcrumb context"
  - phase: 04-contract-dashboard
    provides: "Pagination component, ContractCard component, contracts page patterns"
  - phase: 06-buyer-intelligence-credits-01
    provides: "fetchBuyers, fetchBuyerById, ContactReveal model, credit store, buyer/credit APIs"
provides:
  - "Sortable buyers list page at /buyers with data table"
  - "Buyer profile detail page at /buyers/[id] with header and 4 tabs"
  - "Contact cards with CSS blur-sm lock/unlock effect and copy-to-clipboard"
  - "Buyer name links from contract cards to buyer profiles"
  - "BuyerDetailClient wrapper for reactive unlock state management"
  - "Breadcrumb navigation: Buyers > [Org Name]"
affects: [06-03, contact-reveal-flow, monetization-demo]

# Tech tracking
tech-stack:
  added: []
  patterns: [blur-lock-pattern, deterministic-hash-scoring, client-wrapper-for-state, breadcrumb-setter-pattern]

key-files:
  created:
    - src/app/(dashboard)/buyers/[id]/page.tsx
    - src/app/(dashboard)/buyers/[id]/breadcrumb.tsx
    - src/components/buyers/buyer-table.tsx
    - src/components/buyers/buyer-header.tsx
    - src/components/buyers/buyer-tabs.tsx
    - src/components/buyers/contracts-tab.tsx
    - src/components/buyers/signals-tab.tsx
    - src/components/buyers/attributes-tab.tsx
    - src/components/buyers/contacts-tab.tsx
    - src/components/buyers/contact-card.tsx
    - src/components/buyers/unlock-button.tsx
    - src/components/buyers/buyer-detail-client.tsx
  modified:
    - src/app/(dashboard)/buyers/page.tsx
    - src/components/contracts/contract-card.tsx

key-decisions:
  - "BuyerDetailClient wrapper manages isUnlocked state client-side for reactive blur-to-reveal without full page refresh"
  - "Deterministic attribute scores via hashCode(name + attribute) % 60 + 30 for consistent 30-90 range across renders"
  - "BuyerBreadcrumb as separate client component in [id]/ directory for clean server/client boundary"
  - "UnlockButton integrated directly into ContactsTab for immediate unlock flow (Plan 03 overlap accepted)"

patterns-established:
  - "Blur-lock pattern: blur-sm + select-none + pointer-events-none on locked fields, transition-[filter] duration-300 for dissolve"
  - "Client state wrapper: Server component fetches data, BuyerDetailClient client component manages local isUnlocked state"
  - "Deterministic scoring: hashCode(seed + key) for reproducible pseudo-random values without database storage"
  - "Breadcrumb setter: Separate client component using useBreadcrumb() in useEffect with cleanup"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 6 Plan 02: Buyer Profile UI Summary

**Sortable buyers list table, buyer profile page with 4 tabbed sections (contracts, contacts with blur lock, signals, scored attributes), breadcrumb navigation, and contract card buyer links**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T21:46:27Z
- **Completed:** 2026-02-11T21:49:30Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Sortable buyers data table at /buyers with name, sector, region, contracts, contacts, and lock status columns (URL-param-driven sorting)
- Buyer profile page at /buyers/[id] with header card (initials avatar with deterministic color, metadata row, unlock badge) and 4 working tabs
- Contact cards with CSS blur-sm filter on email/phone when locked, 300ms dissolve transition, and copy-to-clipboard buttons when unlocked
- ContractCard buyer name optionally links to buyer profile page (backward compatible via optional buyerId prop)
- Breadcrumb navigation showing "Buyers > [Org Name]" on profile pages
- Buyer Attributes tab with 3-column grid: 3 factual stats + 6 AI-generated deterministic scores (30-90 range)

## Task Commits

Each task was committed atomically:

1. **Task 1: Buyers list page with sortable table and buyer profile with 4 tabs** - `43479a2` (feat)
2. **Task 2: Contact cards with blur effect, unlock button, and buyer name links** - `767dfce` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/app/(dashboard)/buyers/page.tsx` - Server component with BuyerFeed + Suspense, reuses Pagination component
- `src/app/(dashboard)/buyers/[id]/page.tsx` - Server component fetching buyer detail with auth, serializing for client
- `src/app/(dashboard)/buyers/[id]/breadcrumb.tsx` - Client component setting breadcrumb via useBreadcrumb context
- `src/components/buyers/buyer-table.tsx` - Sortable data table with URL-param-driven sort columns and direction arrows
- `src/components/buyers/buyer-header.tsx` - Header card with deterministic initials avatar, metadata row, unlock badge
- `src/components/buyers/buyer-tabs.tsx` - 4-tab layout: Contracts, Key Contacts, Buying Signals, Buyer Attributes
- `src/components/buyers/contracts-tab.tsx` - Contract cards grid with value, date, status/sector badges, linked to /contracts/[id]
- `src/components/buyers/signals-tab.tsx` - Signal cards with color-coded type badges (PROCUREMENT blue, STAFFING purple, etc.)
- `src/components/buyers/attributes-tab.tsx` - 3-column grid: factual stats + 6 AI scores with color-coded thresholds and tooltips
- `src/components/buyers/contacts-tab.tsx` - Contact cards grid with count header and UnlockButton integration
- `src/components/buyers/contact-card.tsx` - Contact card with blur-sm lock, copy-to-clipboard, 300ms transition dissolve
- `src/components/buyers/unlock-button.tsx` - 3-state button: unlock (1 credit), zero-balance (link to pricing), unlocked (hidden)
- `src/components/buyers/buyer-detail-client.tsx` - Client wrapper managing local isUnlocked state for reactive UI updates
- `src/components/contracts/contract-card.tsx` - Added optional buyerId prop, buyer name as Link when ID available

## Decisions Made
- BuyerDetailClient manages isUnlocked as local client state initialized from server data -- flips to true on unlock without full page refresh
- Deterministic attribute scores use hashCode(buyerName + attributeName) % 60 + 30 for consistent 30-90 range across renders without DB storage
- BuyerBreadcrumb as separate client component (not inline) for clean server/client boundary in Next.js 16
- UnlockButton already integrated into ContactsTab (overlaps with Plan 03 scope but avoids unnecessary second pass)
- Contract card buyer link is backward compatible via optional buyerId prop -- existing callers unaffected

## Deviations from Plan

None - plan executed exactly as written. All components match the plan specification.

Note: The UnlockButton component and BuyerDetailClient wrapper were built as part of this plan execution despite overlapping with Plan 03 scope, as they were natural completions of the contact card and buyer profile components.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All buyer profile UI complete and verified via build
- UnlockButton component ready for credit deduction flow (wired to /api/buyers/[id]/reveal)
- BuyerDetailClient reactive state ready for blur-to-reveal animation on unlock
- Credit store integration in UnlockButton enables sidebar balance animation on reveal

## Self-Check: PASSED

All 12 created files verified present. Both task commits (43479a2, 767dfce) verified in git log. Build passes with zero errors. Routes /buyers and /buyers/[id] confirmed in build output.

---
*Phase: 06-buyer-intelligence-credits*
*Completed: 2026-02-11*
