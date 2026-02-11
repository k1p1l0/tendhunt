---
phase: 02-data-pipeline
plan: 01
subsystem: database, api
tags: [ocds, find-a-tender, mongodb, mongoose, tsx, data-pipeline, cpv]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "MongoDB connection, Contract Mongoose model with source/noticeId compound index"
provides:
  - "Shared scripts library (DB connection, rate-limited API client, OCDS-to-Contract mapper)"
  - "Find a Tender ingestion script fetching 500+ real UK procurement contracts"
  - "CPV-to-sector classification for all 35+ CPV divisions"
  - "npm scripts for all data pipeline commands (ingest:fat, ingest:cf, seed:signals, seed:buyers)"
affects: [02-data-pipeline, 04-dashboard, 05-vibe-scanner]

# Tech tracking
tech-stack:
  added: [tsx]
  patterns: [ocds-mapper, rate-limited-fetch, bulkWrite-upsert, cursor-pagination-via-links-next]

key-files:
  created:
    - scripts/lib/db.ts
    - scripts/lib/api-client.ts
    - scripts/lib/ocds-mapper.ts
    - scripts/ingest-fat.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "FaT API uses links.next full URLs for pagination (not bare cursor tokens)"
  - "Fetch tender + award stages separately (API rejects comma-separated stages)"
  - "60-day window with dual-stage fetch to ensure 200+ contracts"
  - "Relative imports in scripts (not @/ aliases) since tsx runs outside Next.js"

patterns-established:
  - "OCDS mapper: Pure function mapping OCDS releases to Contract schema with null-safe access"
  - "Rate-limited fetch: Retry on 429/403/503 with Retry-After header parsing"
  - "Idempotent upsert: bulkWrite with updateOne + upsert on {source, noticeId} compound index"
  - "Pagination: Follow links.next full URLs for FaT, fallback to bare cursor tokens for other APIs"

# Metrics
duration: 7min
completed: 2026-02-11
---

# Phase 2 Plan 1: Find a Tender Ingestion Summary

**Shared scripts library (DB, rate-limited API client, OCDS mapper with CPV classification) plus Find a Tender OCDS ingestion fetching 509 real UK procurement contracts into MongoDB**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-11T00:23:53Z
- **Completed:** 2026-02-11T00:30:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- 509 real UK procurement contract notices ingested from Find a Tender OCDS API (309 tender + 200 award stage)
- Shared OCDS-to-Contract mapper with full CPV-to-sector classification (35+ sectors)
- Rate-limited API client handling 429/403/503 with Retry-After header parsing and cursor pagination
- Idempotent upsert via bulkWrite: re-running script updates existing records without creating duplicates
- npm scripts defined for all 4 data pipeline commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared scripts library** - `339be4f` (feat)
2. **Task 2: Create FaT ingestion script and npm scripts** - `f9e987f` (feat)

## Files Created/Modified
- `scripts/lib/db.ts` - MongoDB connection wrapper (connectDB/disconnectDB) for scripts
- `scripts/lib/api-client.ts` - Rate-limited fetch with retry and links.next pagination
- `scripts/lib/ocds-mapper.ts` - OCDS release to Contract mapper with CPV-to-sector classification
- `scripts/ingest-fat.ts` - Find a Tender OCDS API ingestion script (509 contracts)
- `package.json` - Added tsx devDep + ingest:fat, ingest:cf, seed:signals, seed:buyers scripts
- `package-lock.json` - Updated lockfile with tsx dependency

## Decisions Made
- **FaT pagination uses links.next**: The API returns a full `links.next` URL (not a bare cursor token). The api-client was adapted to follow full URLs while also supporting bare cursor fallback for Contracts Finder compatibility.
- **Separate stage fetches**: The Find a Tender API does not support comma-separated stages. Tender and award stages are fetched independently and deduplicated by release ID.
- **60-day window**: Extended from 30 to 60 days to ensure 200+ contracts are available (30 days only yielded 183 tender-stage releases).
- **Relative imports in scripts**: Using `../../src/models/contract` instead of `@/models/contract` since tsx runs outside Next.js and does not resolve tsconfig path aliases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed API pagination to use links.next full URLs**
- **Found during:** Task 2 (ingestion script first run)
- **Issue:** The api-client built pagination URLs by appending a `cursor` query param, but the Find a Tender API returns `links.next` as a full URL. Passing `cursor` as a separate param caused HTTP 400 "cursor must match returned nextCursor."
- **Fix:** Rewrote fetchAllReleases to check for `data.links.next` first (full URL) with fallback to bare `data.nextCursor`/`data.cursor` tokens.
- **Files modified:** scripts/lib/api-client.ts
- **Verification:** Script completed successfully on second run, fetching all pages without errors.
- **Committed in:** f9e987f (part of Task 2 commit)

**2. [Rule 1 - Bug] Fixed comma-separated stages parameter**
- **Found during:** Task 2 (widening date range for 200+ contracts)
- **Issue:** Passing `stages=tender,award` returned 0 results. The API requires separate requests per stage.
- **Fix:** Updated ingest-fat.ts to fetch tender and award stages separately, then deduplicate by release ID before mapping.
- **Files modified:** scripts/ingest-fat.ts
- **Verification:** 509 unique contracts fetched (309 tender + 200 award, no duplicates).
- **Committed in:** f9e987f (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct API interaction. No scope creep -- the same functionality was delivered, just with correct API usage patterns.

## Issues Encountered
- Rate limiting (HTTP 429) triggered on third consecutive run of the script. The retry logic handled it automatically (waited 120s per Retry-After header, then continued). This is expected behavior for rapid sequential API calls.

## User Setup Required
None - no external service configuration required. The script uses the existing MONGODB_URI from .env.local and the Find a Tender OCDS API is public (no auth needed).

## Next Phase Readiness
- Shared library (db, api-client, ocds-mapper) is ready for Plan 02-02 (Contracts Finder ingestion)
- The api-client supports both links.next URLs (FaT style) and bare cursor tokens (CF style)
- The OCDS mapper already accepts "CONTRACTS_FINDER" as a source parameter
- npm scripts for ingest:cf, seed:signals, seed:buyers are defined as placeholders

## Self-Check: PASSED

- [x] scripts/lib/db.ts exists
- [x] scripts/lib/api-client.ts exists
- [x] scripts/lib/ocds-mapper.ts exists
- [x] scripts/ingest-fat.ts exists
- [x] Commit 339be4f found (Task 1)
- [x] Commit f9e987f found (Task 2)
- [x] 509 contracts in MongoDB with source=FIND_A_TENDER
- [x] Idempotent re-run verified (0 upserted, 509 modified)

---
*Phase: 02-data-pipeline*
*Completed: 2026-02-11*
