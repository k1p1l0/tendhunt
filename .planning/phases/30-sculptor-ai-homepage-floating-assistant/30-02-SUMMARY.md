---
phase: 30-sculptor-ai-homepage-floating-assistant
plan: 02
subsystem: ui, api
tags: [mongoose, react, motion, chat-input, server-query]

requires:
  - phase: 19-research-agent-chat-panel
    provides: ChatConversation model and schema
provides:
  - getRecentConversations server function for homepage
  - RecentConversation TypeScript interface
  - SculptorHeroInput client component for AI-first homepage entry
affects: [30-sculptor-ai-homepage-floating-assistant]

tech-stack:
  added: []
  patterns: [server-side conversation query with lean projection, hero input component pattern]

key-files:
  created:
    - apps/web/src/components/sculptor/sculptor-hero-input.tsx
  modified:
    - apps/web/src/lib/dashboard.ts

key-decisions:
  - "Typed inline map for lean() results to avoid complex Mongoose InferSchemaType generics"
  - "72px max textarea height (3 rows at text-base) matching plan spec for hero input"

patterns-established:
  - "Server-side conversation query: dbConnect + lean + map for serializable props"
  - "Hero input pattern: larger text-base, rounded-2xl, shadow-sm with focus-within:shadow-md"

duration: 2min
completed: 2026-02-13
---

# Phase 30 Plan 02: Building Blocks Summary

**Server-side getRecentConversations query function and SculptorHeroInput large chat input component for AI-first homepage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T20:55:29Z
- **Completed:** 2026-02-13T20:57:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added getRecentConversations function querying ChatConversation model sorted by lastMessageAt desc with configurable limit
- Created SculptorHeroInput client component with rounded-2xl styling, Enter-to-send, auto-resize, no auto-focus, and 44px tap targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getRecentConversations to dashboard.ts** - `150a497` (feat)
2. **Task 2: Create SculptorHeroInput component** - `5bf427e` (feat)

## Files Created/Modified
- `apps/web/src/lib/dashboard.ts` - Added ChatConversation import, RecentConversation interface, getRecentConversations async function
- `apps/web/src/components/sculptor/sculptor-hero-input.tsx` - New hero chat input component with motion animation on send button

## Decisions Made
- Typed inline map callback for lean() results rather than casting through Mongoose InferSchemaType -- avoids complex generic gymnastics while maintaining type safety
- 72px max textarea height (3 rows at text-base size) matching the plan specification for a visually prominent but bounded input

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- getRecentConversations and SculptorHeroInput are ready for Plan 03 (SculptorHomepage composition)
- Both exports match the interfaces Plan 03 will import
- No blockers

---
*Phase: 30-sculptor-ai-homepage-floating-assistant*
*Completed: 2026-02-13*
