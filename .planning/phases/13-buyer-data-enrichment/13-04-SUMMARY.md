---
phase: 13-buyer-data-enrichment
plan: 04
subsystem: data-pipeline
tags: [cloudflare-workers, mongodb, web-scraping, claude-haiku, anthropic-sdk, personnel-extraction]

# Dependency graph
requires:
  - phase: 13-03
    provides: "ModernGov SOAP meeting discovery, enrichmentSources tracking, fetchWithDomainDelay rate limiter"
provides:
  - "Stage 4: governance page scraping for NHS trusts, ICBs, non-ModernGov councils"
  - "Stage 5: Claude Haiku key personnel extraction from governance text"
  - "KeyPersonnel DB operations (upsert, count, get with role-priority sorting)"
  - "BoardDocument records from HTML scraping with extracted text content"
affects: [13-buyer-data-enrichment, 13-06]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk (Claude Haiku)", "p-limit (concurrency control)"]
  patterns: ["HTML text extraction via regex stripping", "Claude Haiku structured JSON extraction", "p-limit(2) for concurrent API calls", "$and with nested $or for complex MongoDB filters"]

key-files:
  created:
    - "workers/enrichment/src/stages/04-scrape.ts"
    - "workers/enrichment/src/stages/05-personnel.ts"
    - "workers/enrichment/src/db/key-personnel.ts"
  modified:
    - "workers/enrichment/src/enrichment-engine.ts"

key-decisions:
  - "HTML extraction uses regex strip (scripts/styles/tags) -- no DOM parser needed for text-only extraction"
  - "Stage 4 tries URLs in priority order: boardPapersUrl > democracyPortalUrl > website/about/board > website/about/governance"
  - "Stage 5 uses p-limit(2) for concurrent Claude API calls to balance throughput vs rate limits"
  - "Combined text from up to 3 board documents, max 8000 chars, for Claude Haiku context window"
  - "10-second AbortController timeout per fetch to avoid blocking on unresponsive sites"
  - "Cost-aware logging: ~$0.01/org, ~$7 per full pipeline run"

patterns-established:
  - "HTML text extraction: strip script/style, remove tags, collapse whitespace"
  - "Claude Haiku JSON extraction: regex /[\\s\\S]*/ then JSON.parse with validation"
  - "Typed Collection<T> parameters for helper functions (avoids MongoDB generic type conflicts)"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 13 Plan 04: Website Scraping + Claude Haiku Personnel Extraction Summary

**Stage 4 HTML scraping for NHS trusts/ICBs/non-ModernGov councils and Stage 5 Claude Haiku extraction of procurement-relevant key personnel**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T23:02:30Z
- **Completed:** 2026-02-11T23:06:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Stage 4 scrapes governance pages for 9 org types (NHS trusts, ICBs, fire/police/combined authorities, national parks) plus non-ModernGov local councils (CMIS, Custom, Jadu, None platforms)
- Stage 5 extracts key personnel using Claude Haiku with structured JSON output targeting procurement-relevant roles (chief executives, directors, procurement leads, CFOs, chairs)
- KeyPersonnel DB operations with compound key {buyerId, name} dedup and role-priority sorting
- Both stages wired into enrichment engine pipeline registry

## Task Commits

Each task was committed atomically:

1. **Task 1: Stage 4 + KeyPersonnel DB** - `51d770f` (feat)
2. **Task 2: Stage 5 Claude Haiku extraction** - `f7ba3e0` (feat)

## Files Created/Modified
- `workers/enrichment/src/stages/04-scrape.ts` - Stage 4: HTML scraping for governance pages with AbortController timeout, URL priority ordering, extractTextFromHtml helper
- `workers/enrichment/src/stages/05-personnel.ts` - Stage 5: Claude Haiku personnel extraction with p-limit(2) concurrency, JSON parsing, cost logging
- `workers/enrichment/src/db/key-personnel.ts` - KeyPersonnel CRUD: upsertKeyPersonnel (compound key), getKeyPersonnelCount, getKeyPersonnel (role-priority sort)
- `workers/enrichment/src/enrichment-engine.ts` - Wired scrape + personnel stages into stage registry

## Decisions Made
- HTML extraction uses regex strip (scripts/styles/tags) instead of DOM parser -- sufficient for text-only extraction and avoids heavy dependencies
- Stage 4 tries URLs in priority order: boardPapersUrl, democracyPortalUrl, website+"/about/board", website+"/about/governance" -- stops on first successful scrape
- Stage 5 uses p-limit(2) for concurrent Claude API calls to balance throughput vs rate limits
- Combined text from up to 3 board documents, max 8000 chars, for Claude Haiku context window
- 10-second AbortController timeout per fetch to avoid blocking on unresponsive sites
- Cost-aware logging: ~$0.01/org, ~$7 estimated per full pipeline run across ~676 Tier 0 orgs
- Used typed Collection<BuyerDoc> / Collection<BoardDocumentDoc> parameters for helper functions to avoid MongoDB generic type inference conflicts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MongoDB $or duplication in filter object**
- **Found during:** Task 1 (Stage 4 implementation)
- **Issue:** Initial filter construction had duplicate `$or` property in object literal -- TypeScript error TS1117
- **Fix:** Restructured to use `$and` array wrapping both `$or` conditions from the start
- **Files modified:** workers/enrichment/src/stages/04-scrape.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 51d770f (Task 1 commit)

**2. [Rule 1 - Bug] Fixed ReturnType<Db["collection"]> generic type conflicts**
- **Found during:** Task 1 and Task 2
- **Issue:** Using `ReturnType<Db["collection"]>` as parameter type for helper functions causes type incompatibility with typed `Collection<BuyerDoc>` instances
- **Fix:** Changed helper function parameters to use properly typed `Collection<BuyerDoc>` and `Collection<BoardDocumentDoc>` instead of generic `ReturnType<Db["collection"]>`
- **Files modified:** workers/enrichment/src/stages/04-scrape.ts, workers/enrichment/src/stages/05-personnel.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 51d770f, f7ba3e0

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed type issues.

## User Setup Required
None - no external service configuration required. ANTHROPIC_API_KEY already defined in Env interface and expected in Worker secrets.

## Next Phase Readiness
- Stages 1-5 of the 6-stage enrichment pipeline are now implemented
- Stage 6 (enrichment scoring) is the final remaining stage
- KeyPersonnel collection ready for buyer detail UI (already connected in 13-06)
- BoardDocument records with extracted text available for any future analysis

---
*Phase: 13-buyer-data-enrichment*
*Completed: 2026-02-11*
