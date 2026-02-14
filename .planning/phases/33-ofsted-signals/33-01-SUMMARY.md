---
phase: 33-ofsted-signals
plan: 01
subsystem: data-pipeline, ui
tags: [ofsted, csv-parse, education, mongoose, signals, regulatory]

requires:
  - phase: 02-data-pipeline
    provides: Signal model and buyer organization data
  - phase: 13-buyer-data-enrichment
    provides: Buyer enrichment pipeline and buyer detail page tabs
  - phase: 20-board-minutes-signals
    provides: SignalsTab with filter pills and signal card rendering
provides:
  - OfstedSchool Mongoose model with 24 fields (URN, ratings, demographics)
  - CSV ingest script for GOV.UK Ofsted inspection data (~22k schools)
  - Signal generation from Ofsted ratings (REGULATORY type, ~2200 below-Good)
  - Ofsted-specific signal card rendering with amber badges and rating breakdowns
  - Schools tab on buyer detail page (for MATs/LAs with linked schools)
  - Ofsted context card on education contract sidebar
  - ofstedWorstRating and schoolsBelowGood scanner entity fields for Buyers type
affects: [buyers, contracts, scanners, signals, enrichment]

tech-stack:
  added: [csv-parse]
  patterns: [batch-ofsted-aggregation, source-based-signal-detection]

key-files:
  created:
    - apps/web/src/models/ofsted-school.ts
    - apps/web/scripts/ingest-ofsted.ts
    - apps/web/scripts/generate-ofsted-signals.ts
    - apps/web/src/components/buyers/ofsted-tab.tsx
  modified:
    - apps/web/src/lib/buyers.ts
    - apps/web/src/components/buyers/signals-tab.tsx
    - apps/web/src/components/buyers/buyer-tabs.tsx
    - apps/web/src/components/buyers/buyer-detail-client.tsx
    - apps/web/src/app/(dashboard)/buyers/[id]/page.tsx
    - apps/web/src/components/contracts/contract-detail-view.tsx
    - apps/web/src/app/(dashboard)/contracts/[id]/page.tsx
    - apps/web/src/components/scanners/table-columns.ts

key-decisions:
  - "Ofsted signals use existing REGULATORY signalType (no schema migration) with source='Ofsted Inspection' for detection"
  - "Ofsted signal dedup via title containing URN (unique per school)"
  - "Batch OfstedSchool aggregation in fetchBuyers for scanner Ofsted columns (worst rating + below-good count)"
  - "Education contracts detected by sector or CPV code prefix 80"
  - "Schools tab sorted worst-first with per-judgement-area breakdown for below-good schools"

patterns-established:
  - "Source-based signal detection: use signal.source field to differentiate signal subtypes within same signalType enum"
  - "Batch aggregation pattern: compute derived stats per entity page via aggregation pipeline in fetchBuyers"

duration: 9min
completed: 2026-02-14
---

# Phase 33 Plan 01: Ofsted Inspection Signals Summary

**Ofsted school inspection data pipeline: CSV ingest of ~22k schools, REGULATORY signal generation for below-Good schools, Schools tab on buyer pages, Ofsted context card on education contracts, and Buyers scanner Ofsted columns**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-14T18:02:18Z
- **Completed:** 2026-02-14T18:11:23Z
- **Tasks:** 6
- **Files modified:** 12

## Accomplishments

- OfstedSchool Mongoose model with URN-based upsert and buyer linking via MAT/LA name matching
- Signal generation script creates REGULATORY signals for ~2200 schools rated below Good
- Signals tab enhanced with amber Ofsted badges, GraduationCap icon, and judgement area rating badges
- Schools tab on buyer detail shows summary stats (total, %Good+, below-Good) with sorted school cards
- Education contract sidebar shows Ofsted context card with school counts and improvement-needed schools
- Buyers scanner gains ofstedWorstRating and schoolsBelowGood entity fields

## Task Commits

1. **Task 1: OfstedSchool Model + Ingest Script** - `ebf085c` (feat)
2. **Task 2: Ofsted Signal Generation** - `4afda19` (feat)
3. **Task 3: Ofsted Signals Display on Buyer Page** - `f7947e0` (feat)
4. **Task 4: Ofsted Schools Tab on Buyer Page** - `34902be` (feat)
5. **Task 5: Contract Page Ofsted Context** - `4665653` (feat)
6. **Task 6: Scanner Integration -- Ofsted Columns** - `3bc5bf6` (feat)

## Files Created/Modified

- `apps/web/src/models/ofsted-school.ts` - Mongoose model with 24 fields (URN, ratings, MAT, LA, demographics)
- `apps/web/scripts/ingest-ofsted.ts` - Downloads GOV.UK CSV, parses, bulk upserts by URN, matches to buyers
- `apps/web/scripts/generate-ofsted-signals.ts` - Generates REGULATORY signals for schools below Good
- `apps/web/src/components/buyers/ofsted-tab.tsx` - Schools tab with summary stats and sorted school cards
- `apps/web/src/lib/buyers.ts` - Added OfstedSchool fetch to fetchBuyerById + batch aggregation to fetchBuyers
- `apps/web/src/components/buyers/signals-tab.tsx` - Ofsted signal detection and amber badge rendering
- `apps/web/src/components/buyers/buyer-tabs.tsx` - Schools tab trigger and content
- `apps/web/src/components/buyers/buyer-detail-client.tsx` - ofstedSchools prop passthrough
- `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` - Ofsted schools data mapping
- `apps/web/src/components/contracts/contract-detail-view.tsx` - Ofsted context card in sidebar
- `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` - Education detection and Ofsted data fetch
- `apps/web/src/components/scanners/table-columns.ts` - ofstedWorstRating and schoolsBelowGood entity fields

## Decisions Made

- **Reuse REGULATORY signalType**: Rather than adding a new "OFSTED_INSPECTION" enum value (requiring schema migration), Ofsted signals use the existing REGULATORY type with `source: "Ofsted Inspection"` for client-side detection. This avoids breaking existing signal queries.
- **Title-based dedup**: Signal dedup uses the title field which includes URN (e.g., "Ofsted: School Name (URN 123456)") to prevent duplicates on re-run.
- **Batch aggregation for scanner**: Rather than storing Ofsted stats on the Buyer document (which would require a migration/backfill), the fetchBuyers function computes ofstedWorstRating and schoolsBelowGood per page via an aggregation pipeline. This keeps the Buyer model clean and data always fresh.
- **Education contract detection**: Contracts are considered education-sector if `sector` contains "education" (case-insensitive) or any CPV code starts with "80" (education division).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] csv-parse not installed**
- **Found during:** Task 1 (OfstedSchool model + ingest script)
- **Issue:** csv-parse package needed for CSV parsing was not in any package.json
- **Fix:** Ran `bun add csv-parse --cwd apps/web`
- **Files modified:** apps/web/package.json
- **Committed in:** ebf085c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required dependency installation. No scope creep.

## Issues Encountered

None -- all tasks executed cleanly with 0 TypeScript errors and 0 ESLint errors.

## User Setup Required

To populate the Ofsted data, run these scripts:

```bash
# 1. Ingest Ofsted CSV (downloads ~16MB, upserts ~22k schools)
DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted.ts

# 2. Generate signals from schools rated below Good
DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/generate-ofsted-signals.ts
```

## Next Phase Readiness

- OfstedSchool collection ready for data population via ingest script
- Schools tab and Ofsted context card will activate once schools are linked to buyers
- Scanner Ofsted columns available for Buyers-type scanners
- Signal generation can be re-run monthly after CSV update

## Self-Check: PASSED

All 12 files verified present. All 6 task commits verified in git log.

---
*Phase: 33-ofsted-signals*
*Completed: 2026-02-14*
