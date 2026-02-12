---
phase: 15-buyer-dedup-linkedin-data-detail-page
plan: 02
subsystem: ui, data-layer
tags: [contract-detail, buyer-card, nuts-regions, humanization, buyerId]

# Dependency graph
requires:
  - phase: 15-buyer-dedup-linkedin-data-detail-page
    plan: 01
    provides: "Contract schema with buyerId, NUTS mapping module, resolveRegionName()"
provides:
  - "Contract detail page buyer intelligence card with logo, linked name, org type, enrichment score, website, LinkedIn"
  - "Region humanization across buyer filters, buyer header, contract cards, contract detail"
  - "buyerId-based contract queries on buyer detail page"
  - "buyerId-based buyer profile links on contract cards"
affects: [contract-detail-page, buyer-detail-page, buyer-filters, contract-cards]

# Tech tracking
tech-stack:
  added: []
  patterns: ["resolveRegionName() for all NUTS code display points"]

key-files:
  created: []
  modified:
    - "src/lib/contracts.ts"
    - "src/lib/buyers.ts"
    - "src/app/(dashboard)/contracts/[id]/page.tsx"
    - "src/app/(dashboard)/contracts/page.tsx"
    - "src/components/contracts/contract-card.tsx"
    - "src/components/buyers/buyer-filters.tsx"
    - "src/components/buyers/buyer-header.tsx"

key-decisions:
  - "contract-filters.tsx already had human-readable REGIONS constant, so no change needed"
  - "Region display added to contract cards as metadata alongside published/deadline dates"
  - "resolveRegionName used consistently for all NUTS code display -- value stays as raw code for queries, only labels are humanized"

patterns-established:
  - "Always use resolveRegionName() when displaying NUTS codes to users"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 15 Plan 02: Contract-Buyer Entity Linking & Region Humanization UI Summary

**Contract detail buyer intelligence card, NUTS region humanization across all UI display points, buyerId-based contract queries and buyer profile links**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12
- **Completed:** 2026-02-12
- **Tasks:** 2 (data layer + UI humanization)
- **Files modified:** 7

## Accomplishments

### Task 1: Data Layer Enhancements (already completed in prior work)
- `fetchContractById` joins buyer data via buyerId with nameLower fallback for pre-backfill contracts
- `fetchBuyerById` queries contracts by `buyerId: buyer._id` instead of buyerName string match
- Contracts list page passes `buyerId` and `buyerRegion` to ContractCard

### Task 2: Region Humanization + Contract Detail Buyer Section
- Contract detail page has full buyer intelligence card: logo, linked name, org type badge, enrichment score, region, contract count, website link, LinkedIn link, and "View full profile" link
- Contract detail page region display uses `resolveRegionName()` for human-readable names
- Buyer name in contract info section links to buyer profile when buyer data exists
- **Buyer filters**: region dropdown now shows human-readable names (e.g., "North East England" instead of "UKC") via `resolveRegionName()`, keeping raw codes as values for query matching
- **Buyer header**: region display uses `resolveRegionName()` for human-readable names
- **Contract cards**: now display humanized region in metadata section alongside published/deadline dates
- Contract filters already had human-readable REGIONS constant -- no change needed

## Files Modified

| File | Change |
|------|--------|
| `src/lib/contracts.ts` | fetchContractById enhanced with buyer data join (buyerId + nameLower fallback) |
| `src/lib/buyers.ts` | fetchBuyerById queries contracts by buyerId instead of buyerName |
| `src/app/(dashboard)/contracts/[id]/page.tsx` | Buyer intelligence card, humanized region, buyer name links to profile |
| `src/app/(dashboard)/contracts/page.tsx` | Passes buyerId and buyerRegion to ContractCard |
| `src/components/contracts/contract-card.tsx` | Added resolveRegionName import + region display in card metadata |
| `src/components/buyers/buyer-filters.tsx` | Added resolveRegionName import + humanized region dropdown labels |
| `src/components/buyers/buyer-header.tsx` | Added resolveRegionName import + humanized region display |

## Decisions Made

- **contract-filters.tsx skipped**: The existing REGIONS constant already mapped NUTS Level 1 codes to human-readable names. No change was needed.
- **Region value vs label separation**: All dropdowns keep raw NUTS codes as `value` (for MongoDB query matching) but display human-readable labels via `resolveRegionName()`.
- **Region in contract cards**: Added as a third metadata line below published and deadline dates, consistent with the compact card layout.

## Deviations from Plan

- Most data layer work (Task 1) and the contract detail buyer intelligence card were already implemented in prior work. This execution focused on the remaining region humanization across buyer-filters, buyer-header, and contract-card.

## Issues Encountered

- Pre-existing TypeScript errors in scanner files (`scanner-data-grid.tsx`, `threshold-controls.tsx`) from another teammate's concurrent work. None of these affect files in this plan's scope.

## Self-Check: PASSED

All 7 files verified. TypeScript compiles clean for all modified files.

---
*Phase: 15-buyer-dedup-linkedin-data-detail-page*
*Completed: 2026-02-12*
