---
phase: 33-dps-framework-status-intelligence
plan: 03
subsystem: ui
tags: [contract-detail, dps, framework, sculptor-ai, procurement-mechanism, system-prompt]

requires:
  - phase: 33-dps-framework-status-intelligence-01
    provides: contractMechanism enum field on Contract schema
  - phase: 19-research-agent-chat-panel
    provides: Sculptor AI system prompt and AgentPageContext
provides:
  - ProcurementMechanismSection component with DPS/Framework/Call-off explanations
  - Adaptive CTA with mechanism-aware labels (apply, monitor, framework-only)
  - Sculptor AI UK Procurement Mechanisms knowledge section
  - contractMechanism passed to Sculptor context on contract detail pages
affects: [33-02-PLAN, sculptor-ai, contract-detail-page]

tech-stack:
  added: []
  patterns:
    - "Standalone ProcurementMechanismSection component (outside render body per CI lint)"
    - "getActionCTA pure function for mechanism-aware CTA labels"
    - "Amber callout box for DPS closed-but-active window status"

key-files:
  created: []
  modified:
    - apps/web/src/components/contracts/contract-detail-view.tsx
    - apps/web/src/lib/agent/system-prompt.ts
    - apps/web/src/components/agent/agent-provider.tsx
    - apps/web/src/app/(dashboard)/contracts/[id]/page.tsx

key-decisions:
  - "Amber callout for DPS CLOSED + future end date to highlight reopening potential"
  - "Purple badge for DPS, indigo badge for Framework matching planned color scheme"
  - "contractMechanism added to both AgentPageContext definitions (provider + system-prompt)"

patterns-established:
  - "Mechanism badges: purple for DPS, indigo for Framework"
  - "Window Closed amber badge when DPS/Framework is between application windows"
  - "getActionCTA returns variant+label+disabled for adaptive CTA rendering"

duration: 3min
completed: 2026-02-14
---

# Phase 33 Plan 03: Contract Detail DPS/Framework Intelligence & Sculptor AI Awareness Summary

**Procurement mechanism section with DPS/Framework explanations, adaptive CTA buttons, and Sculptor AI knowledge of reopening windows and framework membership**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-14T18:25:48Z
- **Completed:** 2026-02-14T18:29:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Contract detail page shows contextual Procurement Mechanism section for DPS/Framework/Call-off contracts
- DPS contracts with CLOSED status and future end dates display amber callout about reopening windows
- Adaptive CTA labels guide suppliers: "Apply to join this DPS", "Monitor for next reopening", "Framework members only"
- Sculptor AI system prompt includes comprehensive UK Procurement Mechanisms knowledge section
- Contract mechanism passed to Sculptor context for contract-specific AI advice

## Task Commits

Each task was committed atomically:

1. **Task 1: Add procurement mechanism section and adaptive CTA to contract detail page** - `7d62681` (feat)
2. **Task 2: Update Sculptor AI system prompt with DPS/Framework awareness** - `ad699e6` (feat)

## Files Created/Modified
- `apps/web/src/components/contracts/contract-detail-view.tsx` - ProcurementMechanismSection component, getActionCTA function, mechanism badges, adaptive CTA
- `apps/web/src/lib/agent/system-prompt.ts` - UK Procurement Mechanisms section, contractMechanism in contract_detail context
- `apps/web/src/components/agent/agent-provider.tsx` - contractMechanism field added to AgentPageContext interface
- `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` - Passes contractMechanism to both ContractDetailView and AgentContextSetter

## Decisions Made
- Amber callout box specifically for DPS CLOSED + future contractEndDate to highlight the "window closed but DPS active" state
- Purple badge color for DPS/DPS call-offs, indigo for Framework/Framework call-offs (consistent scheme)
- contractMechanism added to the duplicate AgentPageContext in agent-provider.tsx (Rule 3 - blocking: both interfaces must match)
- Callout text colors adapt to dark mode via Tailwind color opacity utilities

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added contractMechanism to AgentPageContext in agent-provider.tsx**
- **Found during:** Task 2 (Sculptor AI system prompt update)
- **Issue:** AgentPageContext is duplicated in both `system-prompt.ts` and `agent-provider.tsx` -- adding the field to only one caused TypeScript error
- **Fix:** Added `contractMechanism?: string` to the AgentPageContext interface in `agent-provider.tsx`
- **Files modified:** apps/web/src/components/agent/agent-provider.tsx
- **Verification:** `pnpm typecheck` passes after adding to both files
- **Committed in:** ad699e6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for TypeScript compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DPS/Framework intelligence is fully visible on contract detail pages
- Sculptor AI can accurately explain DPS reopening windows when users ask
- 33-02 (contracts table badges and filters) can build on the same contractMechanism field
- Backfill script from 33-01 should be run with `--write` flag for production data

## Self-Check: PASSED

- All 4 source files verified on disk
- Commit `7d62681` verified in git log
- Commit `ad699e6` verified in git log
- SUMMARY.md created at expected path

---
*Phase: 33-dps-framework-status-intelligence*
*Completed: 2026-02-14*
