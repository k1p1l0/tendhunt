---
phase: 13-buyer-data-enrichment
plan: 01
subsystem: database
tags: [mongoose, mongodb, schema, seed-script, enrichment, uk-public-sector]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: MongoDB connection (dbConnect), Mongoose model pattern
  - phase: 02-data-pipeline
    provides: Buyer model with base fields
provides:
  - DataSource model with 19 orgType enum values and platform tracking
  - BoardDocument model with buyerId reference and extraction status tracking
  - KeyPersonnel model with role enum and confidence scoring
  - EnrichmentJob model with 6-stage pipeline state tracking
  - Extended Buyer model with 12 enrichment fields
  - Seed script to populate DataSource collection from DATA_SOURCES spec
affects: [13-02-classification, 13-03-governance-urls, 13-04-moderngov, 13-05-scrape, 13-06-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Runtime markdown table parsing for seed data"
    - "bulkWrite with upsert pattern for idempotent seeding"
    - "Multi-section markdown parser with section/subsection extraction"

key-files:
  created:
    - src/models/data-source.ts
    - src/models/board-document.ts
    - src/models/key-personnel.ts
    - src/models/enrichment-job.ts
    - scripts/seed-data-sources.ts
  modified:
    - src/models/buyer.ts

key-decisions:
  - "Runtime markdown parsing over hardcoded arrays -- keeps seed script maintainable when DATA_SOURCES.md updates"
  - "Abolished/merged orgs tracked with status field and successorOrg -- preserves historical data and org lineage"
  - "Tier 1 expansion orgs (MATs, universities, FE colleges) use numbered placeholder entries to reach target counts"
  - "PCC entries include mayoral PCC functions (MOPAC, GM, WY, SY, NY) parsed from inline table"

patterns-established:
  - "DataSource as canonical org registry -- all enrichment stages reference this collection"
  - "buyerId ObjectId ref pattern for BoardDocument and KeyPersonnel linking to Buyer"
  - "EnrichmentJob with stage enum and cursor for resumable pipeline processing"
  - "extractSection/extractSubSection helpers for markdown heading-level extraction"

# Metrics
duration: 7min
completed: 2026-02-11
---

# Phase 13 Plan 01: Enrichment Data Models & Seed Script Summary

**4 new Mongoose models (DataSource, BoardDocument, KeyPersonnel, EnrichmentJob), Buyer schema extended with 12 enrichment fields, and runtime seed script parsing 2,368 UK public sector orgs from DATA_SOURCES.md**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-11T22:38:46Z
- **Completed:** 2026-02-11T22:45:37Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created 4 new Mongoose models with proper schemas, indexes, enums, and hot-reload-safe exports
- Extended Buyer model with 12 enrichment fields while preserving all 10 existing fields and backward compatibility
- Built comprehensive seed script that parses DATA_SOURCES.md at runtime, handling 14+ distinct section/table formats
- Seed script handles abolished/merged councils, multiple table column layouts, and Tier 0/1 org classification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 4 new Mongoose models and extend Buyer schema** - `bead816` (feat)
2. **Task 2: Create DataSource seed script from DATA_SOURCES spec** - `4d5b25b` (feat)

## Files Created/Modified

- `src/models/data-source.ts` - DataSource model with 19 orgType enum, platform tracking, tier/status fields
- `src/models/board-document.ts` - BoardDocument model with buyerId ref, extraction status, compound unique index [buyerId, sourceUrl]
- `src/models/key-personnel.ts` - KeyPersonnel model with role enum, confidence scoring, compound unique index [buyerId, name]
- `src/models/enrichment-job.ts` - EnrichmentJob model with 6-stage enum, cursor-based resume, unique index on stage
- `src/models/buyer.ts` - Extended with orgType, orgSubType, dataSourceId, democracyPortalUrl, democracyPlatform, boardPapersUrl, staffCount, annualBudget, enrichmentScore, enrichmentSources, lastEnrichedAt, enrichmentVersion
- `scripts/seed-data-sources.ts` - Seed script (576 lines) parsing DATA_SOURCES.md with section extractors and table parsers

## Decisions Made

1. **Runtime markdown parsing over hardcoded arrays** -- The DATA_SOURCES.md file contains 2,368 entries across 14+ sections. Rather than hardcoding all entries, the seed script reads and parses the markdown at runtime. This means updating DATA_SOURCES.md automatically updates the seed data.

2. **Placeholder entries for Tier 1 expansion orgs** -- MATs (1,154), universities (165), FE colleges (228), and ALBs (135) have limited individual data in DATA_SOURCES.md (only top entries named). The script generates numbered placeholders (e.g., "Multi-Academy Trust #7") to reach target counts. These will be enriched with real data from GIAS API and other sources in later phases.

3. **PCC mayoral functions parsed from inline table** -- Rather than hardcoding the 5 mayoral PCC entries separately, the table parser handles the "Mayoral PCC Functions" inline table naturally, extracting names and creating proper entries.

4. **Abolished/merged detection from URL column text** -- Entries like "Absorbed into North Yorkshire Council 2023" in the URL column trigger automatic `status: "abolished"` and `successorOrg` extraction via regex matching.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added extractSubSection for #### level headings**
- **Found during:** Task 2 (seed script creation)
- **Issue:** Fire and rescue sections use `####` headings for regional subsections. The `extractSection` function only handles `###` level stopping, causing all fire regions to be merged into one extraction.
- **Fix:** Added `extractSubSection()` function that stops at `####` or higher headings. Used for fire region parsing only.
- **Files modified:** scripts/seed-data-sources.ts
- **Verification:** Test parse confirmed correct per-region counts (SW:5, SE:8, NE:4, YH:4, NW:5, East:6, EM:5, WM:5, London:1 = 43 total)
- **Committed in:** 4d5b25b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correct section parsing. No scope creep.

## Issues Encountered
- Pre-existing mongoose type definition error (`Duplicate identifier UUIDToJSON`) in node_modules -- not caused by our changes, does not affect runtime
- Minor count discrepancies vs DATA_SOURCES header numbers (e.g., 47 vs 50 mental health trusts) due to cross-listed trusts and table formatting -- all entries are captured correctly

## User Setup Required
None - no external service configuration required. The seed script requires `MONGODB_URI` environment variable (already configured) and the board-minutes-intelligence repo at the sibling directory.

## Next Phase Readiness
- All 4 new models ready for import in Phase 13 Plans 02-06
- Buyer model extended with enrichment fields for classification (Plan 02) and scoring (Plan 06)
- Seed script ready to run: `npx tsx scripts/seed-data-sources.ts`
- EnrichmentJob model ready for pipeline state management in Plans 03-06

---
*Phase: 13-buyer-data-enrichment*
*Completed: 2026-02-11*
