---
phase: 05-vibe-scanner
plan: 01
subsystem: api, database, ui
tags: [mongoose, vibe-scanner, scoring-prompt, claude-haiku, prompt-caching, cpv-codes]

# Dependency graph
requires:
  - phase: 03-onboarding-company-profile
    provides: CompanyProfile model and data for scoring prompt generation
  - phase: 01-foundation
    provides: Clerk auth, MongoDB connection, dashboard layout
provides:
  - VibeScanner Mongoose model with userId, scoringPrompt, contractScores, buyerScores, threshold
  - generateScoringPrompt() from CompanyProfile (>4096 tokens for prompt caching)
  - getOrCreateScanner(), updateScoringPrompt(), resetScoringPrompt() library functions
  - POST /api/vibe-scanner/create, GET /api/vibe-scanner, PATCH /api/vibe-scanner, PUT /api/vibe-scanner
  - Vibe Scanner page at /vibe-scanner with create flow and prompt editor
  - PromptEditor component with textarea, reset, and apply buttons
affects: [05-vibe-scanner plan-02 batch-scoring, 05-vibe-scanner plan-03 threshold-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VibeScanner model with embedded subdocuments for contractScores/buyerScores"
    - "Pure function generateScoringPrompt with >4096 token output for Anthropic prompt caching"
    - "PUT endpoint for reset-to-default pattern"

key-files:
  created:
    - src/models/vibe-scanner.ts
    - src/lib/vibe-scanner.ts
    - src/app/api/vibe-scanner/create/route.ts
    - src/app/api/vibe-scanner/route.ts
    - src/app/(dashboard)/vibe-scanner/page.tsx
    - src/components/vibe-scanner/prompt-editor.tsx
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Scoring prompt padded with full CPV division reference, UK regions, and procurement terminology to exceed 4096 tokens for Haiku prompt caching"
  - "PUT /api/vibe-scanner for reset-to-default (regenerates from CompanyProfile) vs PATCH for user edits"
  - "Embedded subdocuments for contractScores/buyerScores with _id:false for performance"
  - "toObject() cast on Mongoose documents to access _id in API responses with InferSchemaType"

patterns-established:
  - "VibeScanner model: embedded score arrays instead of separate collection for fast single-document queries"
  - "Prompt reset pattern: PUT regenerates from source data, PATCH saves user edits"

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 5 Plan 01: Vibe Scanner Model, Prompt Generation, and Page Summary

**VibeScanner Mongoose model with scoring prompt generation from CompanyProfile (>4096 tokens for Haiku caching), CRUD APIs, and editable prompt editor page**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-11T10:36:00Z
- **Completed:** 2026-02-11T10:41:24Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- VibeScanner Mongoose model with embedded contractScores/buyerScores arrays and compound indexes
- Scoring prompt generation from CompanyProfile with full UK procurement reference material (CPV codes, regions, terminology) exceeding 4096 tokens for Anthropic prompt caching
- Complete CRUD API: create scanner, get scanner, update prompt, reset to default
- Vibe Scanner page with create-from-profile flow and PromptEditor component
- Sidebar navigation updated with Vibe Scanner entry

## Task Commits

Each task was committed atomically:

1. **Task 1: VibeScanner model and scoring prompt generation library** - `62efb57` (feat)
2. **Task 2: Scanner API endpoints and Vibe Scanner page with prompt editor** - `b895b1c` (feat)

## Files Created/Modified
- `src/models/vibe-scanner.ts` - VibeScanner Mongoose model with embedded subdocuments, compound indexes, IVibeScanner type
- `src/lib/vibe-scanner.ts` - generateScoringPrompt(), getOrCreateScanner(), updateScoringPrompt(), resetScoringPrompt()
- `src/app/api/vibe-scanner/create/route.ts` - POST endpoint creating scanner from CompanyProfile
- `src/app/api/vibe-scanner/route.ts` - GET/PATCH/PUT endpoints for retrieve, update, and reset
- `src/app/(dashboard)/vibe-scanner/page.tsx` - Client page with create flow and prompt editor
- `src/components/vibe-scanner/prompt-editor.tsx` - Textarea editor with reset and apply buttons
- `src/components/layout/app-sidebar.tsx` - Added Vibe Scanner nav item with Sparkles icon

## Decisions Made
- **Scoring prompt >4096 tokens**: Padded with CPV divisions, UK regions, and procurement terminology to hit Anthropic's prompt caching minimum for Haiku 4.5, reducing per-request cost for batch scoring
- **PUT for reset, PATCH for edit**: Separate HTTP methods for distinct operations -- PUT regenerates from CompanyProfile, PATCH saves user's custom edits
- **Embedded score arrays**: contractScores and buyerScores as embedded subdocuments rather than separate collections, enabling single-document queries for a user's full scoring state
- **toObject() for API serialization**: Mongoose InferSchemaType doesn't include _id, so toObject() converts documents for JSON responses

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added resetScoringPrompt function and PUT endpoint**
- **Found during:** Task 2 (API endpoints)
- **Issue:** Plan specified "Reset to Default" button but getOrCreateScanner() returns existing scanner, so re-calling create wouldn't regenerate the prompt
- **Fix:** Added resetScoringPrompt() library function and PUT /api/vibe-scanner endpoint to regenerate prompt from current CompanyProfile
- **Files modified:** src/lib/vibe-scanner.ts, src/app/api/vibe-scanner/route.ts
- **Verification:** Build passes, reset logic regenerates from CompanyProfile
- **Committed in:** b895b1c (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added Vibe Scanner to sidebar navigation**
- **Found during:** Task 2 (Page creation)
- **Issue:** Plan didn't mention adding nav item, but page would be undiscoverable without sidebar link
- **Fix:** Added Sparkles icon import and Vibe Scanner nav item to app-sidebar.tsx
- **Files modified:** src/components/layout/app-sidebar.tsx
- **Verification:** Build passes, route visible in sidebar
- **Committed in:** b895b1c (Task 2 commit)

**3. [Rule 1 - Bug] Fixed InferSchemaType _id access in API response**
- **Found during:** Task 2 (Build verification)
- **Issue:** TypeScript error -- InferSchemaType doesn't include _id field, but Mongoose documents have it at runtime
- **Fix:** Used toObject() cast on Mongoose document to access _id for JSON serialization
- **Files modified:** src/app/api/vibe-scanner/create/route.ts
- **Verification:** npx next build passes
- **Committed in:** b895b1c (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug)
**Impact on plan:** All auto-fixes necessary for correctness and usability. No scope creep.

## Issues Encountered
- TypeScript InferSchemaType from Mongoose doesn't include MongoDB _id field -- resolved with toObject() pattern, documented for future model usage

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VibeScanner model and prompt generation ready for Plan 02 batch scoring
- Scoring prompt exceeds 4096 tokens enabling Anthropic prompt caching
- Apply & Score button wired up with placeholder for scoring trigger (Plan 02)
- Scored contract feed placeholder in UI ready for Plan 02 implementation

## Self-Check: PASSED

All 6 created files verified present. Both task commits (62efb57, b895b1c) verified in git log. Build passes with no errors. All API routes registered (/api/vibe-scanner, /api/vibe-scanner/create, /vibe-scanner page).

---
*Phase: 05-vibe-scanner*
*Completed: 2026-02-11*
