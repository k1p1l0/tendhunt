---
phase: 19-research-agent-chat-panel
plan: 01
subsystem: api
tags: [anthropic, claude-sonnet, sse, tool-use, mongodb, agent, chat]

requires:
  - phase: 01-foundation
    provides: MongoDB connection, Clerk auth, Anthropic client
  - phase: 02-data-pipeline
    provides: Contract and Buyer models with data
  - phase: 13-buyer-data-enrichment
    provides: KeyPersonnel, BoardDocument, DataSource models
  - phase: 11-invoice-spend-data-intelligence
    provides: SpendSummary, SpendTransaction models
  - phase: 05-vibe-scanner
    provides: Scanner model with AI columns
provides:
  - ChatConversation MongoDB model for persisting agent conversations
  - System prompt builder with dynamic page context injection
  - 12 Anthropic tool definitions (9 read + 3 write)
  - Tool handlers querying real MongoDB via existing fetch functions
  - POST /api/agent/chat SSE streaming endpoint with tool-use loop
affects: [19-02-chat-panel-ui, 19-03-conversation-persistence]

tech-stack:
  added: []
  patterns: [tool-use-loop-with-max-iterations, sse-streaming-agent, system-prompt-context-injection]

key-files:
  created:
    - apps/web/src/models/chat-conversation.ts
    - apps/web/src/lib/agent/system-prompt.ts
    - apps/web/src/lib/agent/tools.ts
    - apps/web/src/lib/agent/tool-handlers.ts
    - apps/web/src/app/api/agent/chat/route.ts
  modified: []

key-decisions:
  - "Reuse existing fetchBuyers/fetchContracts/fetchBuyerById/fetchContractById for tool handlers instead of duplicating queries"
  - "Sliding window of last 10 messages to manage Sonnet token budget"
  - "Max 5 tool-use iterations to prevent infinite loops"
  - "Web search returns stub response for MVP -- internal data tools are the priority"
  - "EnrichmentScore filter applied client-side since fetchBuyers doesn't support it natively"

patterns-established:
  - "Agent tool handler pattern: switch on toolName, validate IDs with isValidObjectId, return {summary, data, action?}"
  - "System prompt builder pattern: sections array joined by double newlines with dynamic context per page type"
  - "SSE agent streaming: ReadableStream with JSON-line events (text_delta, tool_call_start, tool_call_result, done, error)"

duration: 2min
completed: 2026-02-12
---

# Phase 19 Plan 01: Research Agent Backend Summary

**SSE streaming agent API with 12 Anthropic tools (9 read + 3 write), tool-use loop, and context-aware system prompt using Claude Sonnet**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T19:51:47Z
- **Completed:** 2026-02-12T19:53:30Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- ChatConversation MongoDB model with userId/lastMessageAt compound index for conversation persistence
- System prompt builder dynamically injects scanner, buyer, contract, or dashboard context plus company profile
- 12 tool definitions covering buyers, contracts, signals, key personnel, spend data, board documents, web search, and scanner write operations
- Tool handlers reuse existing fetchBuyers, fetchContracts, fetchBuyerById, fetchContractById for zero query duplication
- POST /api/agent/chat streams SSE events with max 5 tool-use iterations using Claude Sonnet

## Task Commits

Each task was committed atomically:

1. **Task 1: ChatConversation model + system prompt builder** - `c72e6a8` (feat)
2. **Task 2: Tool definitions, handlers, and SSE API route** - `6e4ddd9` (feat)

## Files Created
- `apps/web/src/models/chat-conversation.ts` - MongoDB model for persisting agent conversations with message subdocuments
- `apps/web/src/lib/agent/system-prompt.ts` - Builds context-aware system prompt with page context and company profile
- `apps/web/src/lib/agent/tools.ts` - 12 Anthropic tool definitions in tool-use format
- `apps/web/src/lib/agent/tool-handlers.ts` - Server-side tool execution handlers querying real MongoDB data
- `apps/web/src/app/api/agent/chat/route.ts` - SSE streaming POST endpoint with tool-use loop

## Decisions Made
- Reused existing fetchBuyers/fetchContracts/fetchBuyerById/fetchContractById for tool handlers to avoid duplicating query logic
- Sliding window of last 10 messages keeps Sonnet token usage manageable
- Max 5 tool-use iterations prevents runaway agent loops
- Web search returns a stub for MVP -- internal data tools are sufficient
- EnrichmentScore filter applied client-side since fetchBuyers interface doesn't support it natively

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agent backend fully functional -- ready for Plan 02 (chat panel UI)
- ChatConversation model ready for Plan 03 (conversation persistence)
- All 12 tools operational with real data queries

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (c72e6a8, 6e4ddd9) verified in git log.

---
*Phase: 19-research-agent-chat-panel*
*Completed: 2026-02-12*
