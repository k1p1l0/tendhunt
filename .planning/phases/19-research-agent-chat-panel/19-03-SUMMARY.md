---
phase: 19-research-agent-chat-panel
plan: 03
subsystem: ui, api
tags: [react, sse, hooks, zustand, mongodb, streaming, context-awareness, conversation-persistence]

requires:
  - phase: 19-research-agent-chat-panel
    provides: "Plan 01: SSE API route with tool-use loop, ChatConversation model. Plan 02: Agent panel UI shell, Zustand store, context provider"
provides:
  - useAgent hook with SSE streaming, abort controller, and message lifecycle
  - Page-level agent context setters for scanner, buyer, contract, dashboard pages
  - Conversation persistence to MongoDB ChatConversation collection
  - conversation_id SSE event for linking client-side conversations to server-side documents
  - AgentContextSetter reusable client component for server component pages
affects: [19-04-context-awareness-refinement]

tech-stack:
  added: []
  patterns: [sse-client-hook-with-abort, agent-context-setter-for-server-pages, conversation-persistence-via-sse-event]

key-files:
  created:
    - apps/web/src/hooks/use-agent.ts
    - apps/web/src/components/agent/agent-context-setter.tsx
  modified:
    - apps/web/src/components/agent/agent-panel.tsx
    - apps/web/src/components/agent/agent-message-list.tsx
    - apps/web/src/components/agent/agent-input.tsx
    - apps/web/src/components/agent/agent-panel-header.tsx
    - apps/web/src/components/agent/agent-provider.tsx
    - apps/web/src/app/(dashboard)/scanners/[id]/page.tsx
    - apps/web/src/app/(dashboard)/buyers/[id]/page.tsx
    - apps/web/src/app/(dashboard)/contracts/[id]/page.tsx
    - apps/web/src/app/(dashboard)/dashboard/page.tsx
    - apps/web/src/app/api/agent/chat/route.ts

key-decisions:
  - "useAgent hook manages full lifecycle: send, stream, abort, new conversation -- panel components become props-driven"
  - "AgentContextSetter component pattern for server component pages that cannot use hooks"
  - "Conversation persistence happens server-side after stream completion, not fire-and-forget from client"
  - "conversation_id SSE event sent back to client so subsequent messages can update the same MongoDB document"
  - "AgentInput gets isStreaming as prop (not from store) for explicit prop-driven control"

patterns-established:
  - "useAgent hook pattern: combines Zustand store, SSE reader, AbortController ref for full chat lifecycle"
  - "AgentContextSetter pattern: minimal 'use client' component with useEffect for setting context from server pages"
  - "Conversation persistence pattern: accumulate assistantText + toolCallSummaries during stream, persist after loop"

duration: 3min
completed: 2026-02-12
---

# Phase 19 Plan 03: SSE API Wiring Summary

**useAgent hook with SSE streaming, page context setters for scanner/buyer/contract/dashboard, and MongoDB conversation persistence**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T19:55:01Z
- **Completed:** 2026-02-12T19:57:40Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Full end-to-end chat lifecycle: user sends message, SSE stream starts, text deltas and tool calls stream into the UI, stop button cancels, new conversation resets state
- Agent knows current page context on scanner, buyer detail, contract detail, and dashboard pages
- Conversations persist to MongoDB after each exchange with tool call summaries
- New conversations receive server-side MongoDB ID for subsequent message appends

## Task Commits

Each task was committed atomically:

1. **Task 1: useAgent hook with SSE streaming, abort, and component wiring** - `5bc6f93` (feat)
2. **Task 2: Page context setters, conversation persistence, and API save** - `5e173ed` (feat)

## Files Created/Modified
- `apps/web/src/hooks/use-agent.ts` - Custom hook managing SSE streaming, abort controller, message lifecycle
- `apps/web/src/components/agent/agent-context-setter.tsx` - Minimal client component for setting agent context from server pages
- `apps/web/src/components/agent/agent-panel.tsx` - Wired to useAgent hook, passes props to children
- `apps/web/src/components/agent/agent-message-list.tsx` - Now accepts messages as prop instead of reading from store
- `apps/web/src/components/agent/agent-input.tsx` - Accepts isStreaming prop, disabled state during streaming
- `apps/web/src/components/agent/agent-panel-header.tsx` - Accepts onNewChat callback prop
- `apps/web/src/components/agent/agent-provider.tsx` - Added buyerOrgType, contractSector, contractValue fields
- `apps/web/src/app/(dashboard)/scanners/[id]/page.tsx` - Sets scanner context for agent
- `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` - Sets buyer detail context via AgentContextSetter
- `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` - Sets contract detail context via AgentContextSetter
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Sets dashboard context via AgentContextSetter
- `apps/web/src/app/api/agent/chat/route.ts` - Conversation persistence, assistantText accumulation, conversation_id event

## Decisions Made
- useAgent hook manages full lifecycle (send, stream, abort, new conversation) so panel components become purely props-driven
- AgentContextSetter component pattern created for server component pages that cannot use hooks directly
- Conversation persistence happens server-side after stream completion, not as a fire-and-forget from client
- conversation_id SSE event sent back to client so subsequent messages can update the same MongoDB document
- AgentInput gets isStreaming as prop (not from store) for explicit prop-driven control

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added buyerOrgType, contractSector, contractValue to AgentPageContext**
- **Found during:** Task 2
- **Issue:** Client-side AgentPageContext in agent-provider.tsx was missing fields that server-side system-prompt.ts already had
- **Fix:** Added buyerOrgType, contractSector, contractValue to the client-side interface
- **Files modified:** apps/web/src/components/agent/agent-provider.tsx
- **Committed in:** 5e173ed (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for context parity between client and server. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full agent chat is now functional end-to-end: send message, stream response, see tool calls, stop streaming, persist conversation
- All pages set agent context correctly for context-aware responses
- Ready for Plan 04 (any refinements, conversation history UI, or additional polish)

## Self-Check: PASSED

All created files verified on disk. Both task commits (5bc6f93, 5e173ed) verified in git log.

---
*Phase: 19-research-agent-chat-panel*
*Completed: 2026-02-12*
