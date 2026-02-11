---
phase: 05-vibe-scanner
plan: 04
subsystem: api, ai
tags: [claude-haiku, prompt-caching, sse, batch-scoring, p-limit, async-generator, scoring-engine]

# Dependency graph
requires:
  - phase: 05-vibe-scanner plan-01
    provides: VibeScanner model with generateScoringPrompt (>4096 tokens for prompt caching)
  - phase: 05-vibe-scanner plan-02
    provides: Scanner model with aiColumns, scores array, type enum, searchQuery
  - phase: 03-onboarding-company-profile
    provides: CompanyProfile model for scoring prompt generation
  - phase: 02-data-pipeline
    provides: Contract, Signal, Buyer models with entity data
provides:
  - Scoring engine library (scoreEntities, scoreOneEntity, buildScoringSystemPrompt, buildEntityUserPrompt)
  - POST /api/scanners/[id]/score SSE endpoint for batch scoring
  - ScoringEvent type for structured SSE streaming events
  - Prompt caching via cache_control on system prompt (>4096 tokens)
  - Per-entity error resilience with p-limit(5) concurrency
affects: [05-vibe-scanner plan-05 custom-ai-columns, 05-vibe-scanner plan-03 scanner-table-view, 05-vibe-scanner plan-06 re-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async generator pattern for SSE event streaming from batch AI operations"
    - "Prompt caching: base scoring prompt (>4096 tokens) + column-specific prompt combined in system message"
    - "p-limit(5) concurrency for Claude Haiku API calls within batch scoring"
    - "ScoringEvent union type for structured SSE protocol (column_start, progress, column_complete, complete, error)"

key-files:
  created:
    - src/lib/scoring-engine.ts
    - src/app/api/scanners/[id]/score/route.ts
  modified: []

key-decisions:
  - "Scoring engine loads CompanyProfile and uses generateScoringPrompt() for base prompt since Scanner model lacks scoringPrompt field"
  - "Signals model skipped for vibeScore source document updates -- model lacks vibeScore/vibeReasoning fields"
  - "Score field uses type union ['number', 'null'] in JSON schema for text-only columns (e.g., Key Contact for buyers)"
  - "Promise.all collects all concurrent results then yields in batch -- ensures consistent event ordering per column"

patterns-established:
  - "Scoring engine as reusable library: scoreEntities async generator decoupled from HTTP layer"
  - "Column-by-column batch processing: each AI column scored sequentially, entities within column concurrent"
  - "Dual persistence: scores saved to Scanner.scores array AND source documents' vibeScore field"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 5 Plan 04: Batch Scoring SSE Engine Summary

**Claude Haiku 4.5 batch scoring engine with prompt caching, async generator SSE streaming, and per-column/per-entity concurrent scoring via p-limit(5)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T11:41:19Z
- **Completed:** 2026-02-11T11:43:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Scoring engine library with four exported functions: buildScoringSystemPrompt, buildEntityUserPrompt, scoreOneEntity, scoreEntities
- SSE streaming endpoint at POST /api/scanners/[id]/score that batch-scores all entities across all AI columns
- Prompt caching enabled via cache_control ephemeral on system prompt (>4096 tokens from CompanyProfile)
- Per-entity error handling ensures individual scoring failures don't block the batch
- Dual persistence: scores saved to Scanner.scores array and source documents updated with vibeScore/vibeReasoning

## Task Commits

Each task was committed atomically:

1. **Task 1: Scoring engine library with prompt caching and batch processing** - `6866859` (feat)
2. **Task 2: Batch scoring SSE API endpoint for scanners** - `2983905` (feat)

## Files Created/Modified
- `src/lib/scoring-engine.ts` - Scoring engine with buildScoringSystemPrompt, buildEntityUserPrompt, scoreOneEntity, scoreEntities async generator
- `src/app/api/scanners/[id]/score/route.ts` - POST SSE endpoint: auth, load scanner/profile/entities, stream scoring, persist scores

## Decisions Made
- **CompanyProfile for base prompt**: Since the new Scanner model (Plan 02) doesn't have a scoringPrompt field, the scoring engine loads CompanyProfile and uses generateScoringPrompt() from the old vibe-scanner lib to build the base prompt exceeding 4096 tokens for Haiku prompt caching
- **Signals skip vibeScore update**: Signal model lacks vibeScore/vibeReasoning fields (unlike Contract and Buyer), so source document updates are skipped for meetings-type scanners
- **Nullable score via type union**: JSON schema uses `["number", "null"]` type for the score field to support text-only AI columns (e.g., "Key Contact" for buyers)
- **Promise.all + sequential yield**: Concurrent scoring via p-limit(5), but results collected via Promise.all and yielded sequentially for consistent event ordering per column

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted scoring engine to work without Scanner.scoringPrompt field**
- **Found during:** Task 1 (Pre-execution analysis)
- **Issue:** Plan referenced `scanner.scoringPrompt` in buildScoringSystemPrompt, but the new Scanner model (Plan 02) doesn't have this field. The old VibeScanner model has it.
- **Fix:** buildScoringSystemPrompt takes `baseScoringPrompt` string parameter; the SSE endpoint loads CompanyProfile and calls generateScoringPrompt() to produce it
- **Files modified:** src/lib/scoring-engine.ts, src/app/api/scanners/[id]/score/route.ts
- **Verification:** Build passes, scoring prompt exceeds 4096 tokens for caching
- **Committed in:** 6866859 (Task 1) + 2983905 (Task 2)

**2. [Rule 1 - Bug] Skipped vibeScore update for signals scanner type**
- **Found during:** Task 2 (Source document update logic)
- **Issue:** Plan specified updating source documents' vibeScore/vibeReasoning for all types, but Signal model lacks these fields (only Contract and Buyer have them)
- **Fix:** Added `scanner.type !== "meetings"` guard before source document bulkWrite
- **Files modified:** src/app/api/scanners/[id]/score/route.ts
- **Verification:** Build passes, no Mongoose validation errors for signals
- **Committed in:** 2983905 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added CompanyProfile requirement check in SSE endpoint**
- **Found during:** Task 2 (Endpoint implementation)
- **Issue:** Without CompanyProfile, scoring prompt generation would fail with an unclear error
- **Fix:** Added explicit check for CompanyProfile before scoring, returning 400 with clear message
- **Files modified:** src/app/api/scanners/[id]/score/route.ts
- **Verification:** Build passes, proper error response for missing profile
- **Committed in:** 2983905 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness given the Scanner model evolution from Plan 01 to Plan 02. No scope creep.

## Issues Encountered
- Scanner model architecture divergence: Plan 04 was written assuming Scanner.scoringPrompt exists (from Plan 01's VibeScanner), but Plan 02 created a new Scanner model without this field. Resolved by loading CompanyProfile directly in the endpoint.

## User Setup Required
None - uses existing ANTHROPIC_API_KEY already configured.

## Next Phase Readiness
- Scoring engine ready for Plan 05 (custom AI columns) -- adding a column and re-scoring uses the same scoreEntities function
- SSE endpoint ready for Plan 03/06 (scanner table view) -- table UI consumes SSE events for progressive loading
- ScoringEvent type provides stable contract for any UI that needs real-time scoring feedback

## Self-Check: PASSED
