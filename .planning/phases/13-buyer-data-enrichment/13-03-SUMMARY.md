---
phase: 13-buyer-data-enrichment
plan: 03
subsystem: api, database
tags: [soap, xml, moderngov, fast-xml-parser, enrichment, mongodb]

# Dependency graph
requires:
  - phase: 13-02
    provides: "Enrichment Worker scaffold, Stage 1 classify, rate limiter, DB operations"
provides:
  - "Stage 2: governance URL propagation from DataSource to Buyer"
  - "Stage 3: ModernGov SOAP API meeting discovery"
  - "ModernGov SOAP client (getMeetings, getCommittees, testConnection)"
  - "BoardDocument DB operations (upsert, count, fetch)"
  - "getDataSourceById DB helper"
affects: [13-04, 13-05, 13-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Double XML parse for SOAP XML-in-XML responses"
    - "Compound key upsert pattern for BoardDocument dedup"
    - "$addToSet for enrichmentSources tracking"
    - "Per-domain rate limiting via fetchWithDomainDelay for SOAP calls"

key-files:
  created:
    - "workers/enrichment/src/stages/02-governance-urls.ts"
    - "workers/enrichment/src/stages/03-moderngov.ts"
    - "workers/enrichment/src/api-clients/moderngov-client.ts"
    - "workers/enrichment/src/db/board-documents.ts"
  modified:
    - "workers/enrichment/src/enrichment-engine.ts"
    - "workers/enrichment/src/db/data-sources.ts"

key-decisions:
  - "Double-parse pattern for ModernGov SOAP: outer envelope parse, then inner GetMeetingsResult XML string re-parse"
  - "Batch size 20 for Stage 3 (vs 100 for Stage 2) because each buyer requires HTTP calls"
  - "testConnection uses raw fetch with 5s AbortController timeout (not fetchWithDomainDelay) for quick health checks"
  - "$nin filter for democracyPortalUrl to exclude both null and empty string in single MongoDB operator"

patterns-established:
  - "SOAP client pattern: buildSoapEnvelope + SOAPAction header + double XML parse"
  - "BoardDocument compound key upsert: { buyerId, sourceUrl } prevents duplicates across runs"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 13 Plan 03: Governance URLs + ModernGov SOAP Client Summary

**Stage 2 governance URL propagation from DataSource to Buyer, Stage 3 ModernGov SOAP meeting discovery with BoardDocument creation, and SOAP client with double XML parse**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T22:56:28Z
- **Completed:** 2026-02-11T22:59:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Stage 2 propagates democracyPortalUrl, democracyPlatform, boardPapersUrl, and website from DataSource to matched Buyer documents
- Stage 3 calls ModernGov SOAP API for meetings in the last 12 months and creates BoardDocument records for each
- ModernGov SOAP client handles the critical double XML parse edge case (SOAP envelope wraps XML-as-string)
- BoardDocument DB operations support deduplication via compound key { buyerId, sourceUrl }
- Both stages registered in the enrichment engine pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Stage 2 + BoardDocument DB + wire** - `a580625` (feat)
2. **Task 2: ModernGov SOAP client + Stage 3 + wire** - `bcb9fe8` (feat)

## Files Created/Modified
- `workers/enrichment/src/stages/02-governance-urls.ts` - Stage 2: copies governance URLs from DataSource to Buyer
- `workers/enrichment/src/stages/03-moderngov.ts` - Stage 3: ModernGov SOAP API meeting discovery
- `workers/enrichment/src/api-clients/moderngov-client.ts` - SOAP client: getMeetings, getCommittees, testConnection
- `workers/enrichment/src/db/board-documents.ts` - BoardDocument upsert, count, fetch operations
- `workers/enrichment/src/db/data-sources.ts` - Added getDataSourceById for Stage 2 lookups
- `workers/enrichment/src/enrichment-engine.ts` - Registered governance_urls + moderngov stages

## Decisions Made
- Double-parse pattern for ModernGov SOAP: outer envelope parse, then inner GetMeetingsResult XML string re-parse with fast-xml-parser
- Batch size 20 for Stage 3 vs 100 for Stage 2 because each buyer requires HTTP calls to the ModernGov API
- testConnection uses raw fetch with 5s AbortController timeout (not fetchWithDomainDelay) for quick health checks
- $nin filter for democracyPortalUrl to exclude both null and empty string in single MongoDB operator (avoids TS duplicate key error)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added getDataSourceById to data-sources.ts**
- **Found during:** Task 1
- **Issue:** Stage 2 needs to look up DataSource by _id but only getDataSourceByName existed
- **Fix:** Added getDataSourceById function with ObjectId import
- **Files modified:** workers/enrichment/src/db/data-sources.ts
- **Committed in:** a580625 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed duplicate $ne key in MongoDB filter**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `{ $ne: null, $ne: "" }` has duplicate property name — TypeScript strict mode error
- **Fix:** Changed to `{ $exists: true, $nin: [null, ""] }` which is valid BSON and valid TS
- **Files modified:** workers/enrichment/src/stages/03-moderngov.ts
- **Committed in:** bcb9fe8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes essential for functionality. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stages 2 and 3 are ready for pipeline execution
- BoardDocument collection will be populated when pipeline runs against real data
- Stage 4 (web scraping) and Stage 5 (personnel extraction) can build on the BoardDocument records created here
- ModernGov SOAP client is reusable for any future ModernGov integrations

---
*Phase: 13-buyer-data-enrichment*
*Completed: 2026-02-11*
