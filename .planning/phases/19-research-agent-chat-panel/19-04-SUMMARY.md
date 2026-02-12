---
phase: 19-research-agent-chat-panel
plan: 04
subsystem: ui
tags: [motion, dompurify, marked, accessibility, animations, keyboard-shortcuts, markdown]

requires:
  - phase: 19-research-agent-chat-panel/19-03
    provides: SSE streaming hook, agent panel components, conversation persistence
provides:
  - Polished agent panel with Cmd+K keyboard shortcut
  - Safe markdown rendering with DOMPurify sanitization
  - Error handling with retry button
  - Typing indicator during streaming
  - All animations respecting prefers-reduced-motion
  - Full accessibility (aria-labels, tap targets, keyboard navigation)
affects: []

tech-stack:
  added: [dompurify, "@types/dompurify", "@tailwindcss/typography"]
  patterns: [useReducedMotion for all motion components, DOMPurify HTML sanitization, marked link renderer override]

key-files:
  created: []
  modified:
    - apps/web/src/components/agent/agent-panel.tsx
    - apps/web/src/components/agent/agent-message.tsx
    - apps/web/src/components/agent/agent-message-list.tsx
    - apps/web/src/components/agent/agent-input.tsx
    - apps/web/src/components/agent/suggested-actions.tsx
    - apps/web/src/components/agent/agent-panel-header.tsx
    - apps/web/src/components/agent/tool-call-indicator.tsx
    - apps/web/src/hooks/use-agent.ts
    - apps/web/src/stores/agent-store.ts
    - apps/web/src/app/globals.css

key-decisions:
  - "DOMPurify with explicit ALLOWED_TAGS whitelist for safe markdown rendering (no raw HTML injection)"
  - "marked link renderer override for target=_blank and rel=noopener noreferrer on all links"
  - "useReducedMotion from motion/react (not custom hook) for accessibility"
  - "isError flag on AgentMessage + removeMessage store method for retry flow"
  - "min-h-[44px] on all interactive buttons for mobile tap target compliance"

patterns-established:
  - "Reduced motion: use useReducedMotion() from motion/react, conditionally set initial/animate props to {}"
  - "Safe markdown: always sanitize with DOMPurify before dangerouslySetInnerHTML"
  - "Error retry: remove error message + last user message, re-send via sendMessage"

duration: 3min
completed: 2026-02-12
---

# Phase 19 Plan 04: Agent Panel Polish Summary

**Cmd+K keyboard shortcut, DOMPurify-sanitized markdown, error retry, typing indicator, and full accessibility with prefers-reduced-motion support**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T19:58:53Z
- **Completed:** 2026-02-12T20:02:31Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Global Cmd+K / Ctrl+K keyboard shortcut toggles agent panel from any page
- Safe markdown rendering with DOMPurify sanitization (whitelist of allowed tags/attrs, links open in new tab)
- Error handling with isError flag, visual error card, and retry button that re-sends the last user message
- Typing indicator (three bouncing dots) during streaming before first text arrives
- All animations (messages, suggested actions, tool calls, send button) respect prefers-reduced-motion
- Full accessibility: aria-labels on all interactive elements, role/aria-live on tool indicators, 44px minimum tap targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Keyboard shortcut, animations, typing indicator, and prefers-reduced-motion** - `413ed07` (feat)
2. **Task 2: Safe markdown rendering with DOMPurify and link security** - `e625d7d` (feat)

## Files Created/Modified
- `apps/web/src/components/agent/agent-panel.tsx` - Added Cmd+K shortcut, auto-focus on open, passes isStreaming/onRetry to children
- `apps/web/src/components/agent/agent-message.tsx` - DOMPurify sanitization, marked link renderer, useReducedMotion
- `apps/web/src/components/agent/agent-message-list.tsx` - Typing indicator, error card with retry button
- `apps/web/src/components/agent/agent-input.tsx` - Send button whileTap animation, disabled state styling, forwarded textareaRef, 44px tap targets
- `apps/web/src/components/agent/suggested-actions.tsx` - useReducedMotion, 44px min-height on buttons
- `apps/web/src/components/agent/agent-panel-header.tsx` - Updated aria-label to "Start new conversation"
- `apps/web/src/components/agent/tool-call-indicator.tsx` - Added role="status" and aria-live="polite"
- `apps/web/src/hooks/use-agent.ts` - isError flag on error responses, retryLastMessage function, filters out error messages from API calls
- `apps/web/src/stores/agent-store.ts` - Added isError field to AgentMessage, removeMessage method
- `apps/web/src/app/globals.css` - Added @tailwindcss/typography plugin for prose classes

## Decisions Made
- Used DOMPurify with explicit ALLOWED_TAGS whitelist instead of allowing all tags -- prevents XSS from any unexpected content
- Used marked's Renderer class to override link rendering (target="_blank", rel="noopener noreferrer") instead of DOMPurify hooks -- cleaner approach
- Used useReducedMotion() from motion/react instead of custom window.matchMedia hook -- handles SSR and lifecycle properly
- Added isError boolean flag to AgentMessage instead of parsing error patterns from content -- explicit and reliable
- Retry removes both the error message and last user message, then re-sends -- ensures clean state without duplicate messages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 19 (Research Agent Chat Panel) is now complete (4/4 plans)
- Agent panel is production-ready for investor demo with smooth animations, safe rendering, error handling, and full accessibility
- Remaining pending phases: 11 (Invoice & Spend Data), 15 (Contract-Buyer Linking)

## Self-Check: PASSED

All 11 files verified present. Both commits (413ed07, e625d7d) verified in git log.

---
*Phase: 19-research-agent-chat-panel*
*Completed: 2026-02-12*
