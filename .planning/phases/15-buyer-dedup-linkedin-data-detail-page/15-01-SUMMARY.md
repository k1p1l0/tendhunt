---
phase: 15-buyer-dedup-linkedin-data-detail-page
plan: 01
subsystem: database, api
tags: [mongodb, objectid, nuts-codes, data-sync, cloudflare-worker, backfill]

# Dependency graph
requires:
  - phase: 10-live-data-pipeline
    provides: "data-sync worker with autoExtractBuyers and upsertContracts"
  - phase: 13-buyer-data-enrichment
    provides: "Buyer model with nameLower unique index"
provides:
  - "Contract schema with indexed buyerId ObjectId reference to Buyer"
  - "Static NUTS code mapping module (258 entries, levels 0-3, 2016+2021)"
  - "resolveRegionName() hierarchical fallback resolver"
  - "Data-sync worker forward-writes buyerId on all new contracts"
  - "Backfill script for existing 59K contracts"
affects: [15-02, contract-detail-page, buyer-detail-page, contract-filters]

# Tech tracking
tech-stack:
  added: []
  patterns: ["forward-write + backfill for adding reference fields", "static code mapping with hierarchical fallback"]

key-files:
  created:
    - "src/lib/nuts-regions.ts"
    - "scripts/backfill-buyer-ids.ts"
  modified:
    - "src/models/contract.ts"
    - "workers/data-sync/src/types.ts"
    - "workers/data-sync/src/db/buyers.ts"
    - "workers/data-sync/src/db/contracts.ts"
    - "workers/data-sync/src/sync-engine.ts"

key-decisions:
  - "autoExtractBuyers returns buyerIdMap via follow-up find() after bulkWrite (bulkWrite only returns upsertedIds for new docs, not matched/existing)"
  - "Sync engine order reversed: extract buyers FIRST (get IDs), THEN upsert contracts (with IDs)"
  - "Static NUTS mapping includes both 2016 and 2021 codes for Scotland (UKM2/M3 and UKM5-M9) and London (UKI1/I2 and UKI3-I7)"
  - "buyerId stored as ObjectId with ref and index on Contract schema for O(1) buyer detail page queries"

patterns-established:
  - "Forward-write + backfill: when adding a reference field, write it on new docs immediately and backfill existing docs with a one-time script"
  - "Static code mapping: for stable classification systems (NUTS, CPV), use a TypeScript Record<string, string> with a resolver function"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 15 Plan 01: Contract-Buyer Entity Linking Summary

**Contract buyerId ObjectId reference with forward-write in data-sync worker, 258-entry NUTS code mapping module with hierarchical fallback, and backfill script for 59K existing contracts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T15:17:22Z
- **Completed:** 2026-02-12T15:20:51Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created comprehensive NUTS region code mapping (258 entries) covering UK levels 0-3 with both 2016 and 2021 Scotland/London codes
- Added indexed buyerId ObjectId field to Contract schema for O(1) buyer-contract joins
- Modified data-sync worker to forward-write buyerId on every newly synced contract (extract buyers first, get IDs, then upsert contracts with IDs)
- Created backfill script for existing 59K contracts (batch processing with progress logging)

## Task Commits

Each task was committed atomically:

1. **Task 1: NUTS region mapping module + Contract schema buyerId field** - `fd01beb` (feat)
2. **Task 2: Data-sync worker buyerId forward-write + backfill script** - `260a843` (feat)

## Files Created/Modified
- `src/lib/nuts-regions.ts` - Static NUTS code to human name mapping (258 entries) with resolveRegionName() hierarchical fallback
- `src/models/contract.ts` - Added buyerId ObjectId field with ref: 'Buyer' and index: true
- `workers/data-sync/src/types.ts` - Added optional buyerId to MappedContract interface
- `workers/data-sync/src/db/buyers.ts` - autoExtractBuyers now returns { created, buyerIdMap } with follow-up find() for all buyer IDs
- `workers/data-sync/src/db/contracts.ts` - upsertContracts accepts optional buyerIdMap, resolves buyerId per contract
- `workers/data-sync/src/sync-engine.ts` - Reversed order: autoExtractBuyers before upsertContracts, passes buyerIdMap
- `scripts/backfill-buyer-ids.ts` - One-time backfill script for existing contracts (batch 1000, progress logging)

## Decisions Made
- **autoExtractBuyers follow-up find():** bulkWrite only returns upsertedIds for NEW docs. For existing buyers (the majority), a follow-up `find({ nameLower: { $in: [...] } })` with projection `{ _id: 1, nameLower: 1 }` is needed to get the full name-to-ID map. This is one indexed query returning minimal data, so it is fast.
- **Sync engine order reversal:** Previously upsertContracts ran before autoExtractBuyers. Reversed to: extract buyers first (get IDs), then upsert contracts (with IDs). This ensures every new contract gets its buyerId on first write.
- **Both NUTS 2016 and 2021 codes:** Find a Tender uses 2021 codes but older data may have 2016 codes. Including both ensures no Scottish or London region codes fall through to parent-level names.
- **buyerId ref + index:** The `ref: 'Buyer'` enables future `.populate()` if needed (though manual findById is preferred). The index is critical for `Contract.find({ buyerId })` queries on the buyer detail page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**Backfill script must be run manually** to set buyerId on existing 59K contracts:
```bash
DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-buyer-ids.ts
```

## Next Phase Readiness
- Contract schema ready with buyerId for buyer detail page contract queries
- NUTS mapping module ready for import by any display component
- Data-sync worker will forward-write buyerId on all new contracts from next cron run
- Plan 15-02 can proceed with contract detail page enhancement and buyer intelligence display

## Self-Check: PASSED

All 7 files verified present. Both task commits (fd01beb, 260a843) verified in git log.

---
*Phase: 15-buyer-dedup-linkedin-data-detail-page*
*Completed: 2026-02-12*
