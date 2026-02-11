---
status: resolved
trigger: "AI columns (AI Score, Bid Recommendation) cannot be triggered in scanner page. Clicking column icon or Run Column from action menu does nothing."
created: 2026-02-11T00:00:00Z
updated: 2026-02-11T00:03:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED - Two root causes found and addressed
test: TypeScript compilation passed. All scenarios verified through code flow tracing.
expecting: Play button clicks trigger scoring; Run Column submenu is visible
next_action: Done - user should verify visually in browser

## Symptoms

expected: Clicking AI column icon or "Run Column" from action menu should trigger AI scoring for that column, showing progress and results
actual: Nothing happens when clicking - no scoring runs, no visual feedback, no network requests
errors: Unknown - need to check browser console and code
reproduction: Go to /scanners/698c6b478166dc0b8925c331, try clicking AI column header icon or right-click column -> "Run Column"
started: Likely since recent Phase 5 implementation

## Eliminated

- hypothesis: API routes are broken or unreachable
  evidence: Routes exist, are compiled, and return proper responses (tested with curl, 307 auth redirect expected without cookies)
  timestamp: 2026-02-11T00:00:30Z

- hypothesis: MongoDB data is missing (scanner, company profile, or contracts)
  evidence: Scanner doc exists with 2 aiColumns, CompanyProfile exists for user, 809 contracts in DB
  timestamp: 2026-02-11T00:00:35Z

- hypothesis: Column metadata/aiColumnId not properly threaded through props
  evidence: table-columns.ts correctly sets aiColumnId, glide-columns.ts passes it to ColumnMeta, scanner-data-grid.tsx passes it to HeaderMenu
  timestamp: 2026-02-11T00:00:40Z

- hypothesis: scoreSingleColumn function itself is broken
  evidence: Code analysis shows function logic is correct - it sets loading states, calls API, reads SSE stream
  timestamp: 2026-02-11T00:00:45Z

## Evidence

- timestamp: 2026-02-11T00:00:20Z
  checked: Glide Data Grid v6.0.3 internal event handling (data-grid.tsx mouseup handler)
  found: When click is in header menu zone (30px from right edge), the mouseup handler RETURNS EARLY (line 1103) without calling onMouseUp(args, isOutside). This means onHeaderClicked NEVER fires for these clicks. Only onHeaderMenuClick fires via the separate click handler.
  implication: Play button zone (24px + 8px margin from right) overlaps with Glide's menu zone (30px from right). Play button clicks are intercepted by Glide, routed to onHeaderMenuClick instead of onHeaderClicked.

- timestamp: 2026-02-11T00:00:25Z
  checked: HeaderMenu CSS (header-menu.tsx line 145)
  found: Main menu container has className "overflow-hidden". The "Run Column" submenu is positioned "absolute left-full top-0 ml-1" (outside parent bounds). overflow-hidden clips the submenu, making it invisible.
  implication: Even if user opens the header menu and clicks "Run column", the submenu that contains the actual scoring options is hidden by CSS overflow.

- timestamp: 2026-02-11T00:00:28Z
  checked: getHeaderMenuBounds in data-grid-render.header.ts
  found: menuButtonSize = 30px. Menu zone is x + width - 30 to x + width. Play button zone is width - 32 to width - 8. Overlap is width - 30 to width - 8 (22px overlap).
  implication: Nearly the entire play button falls within Glide's menu intercept zone.

- timestamp: 2026-02-11T00:01:30Z
  checked: Fix code tracing - all scenarios verified through code analysis
  found: 1) Play button click now triggers scoring via onHeaderMenuClick. 2) Right-click correctly opens context menu (not routed through onHeaderMenuClick). 3) During active scoring, play button click opens menu (fallback). 4) Non-AI column menus unaffected. 5) Run Column submenu now visible with overflow-visible.
  implication: All user interaction paths for AI column scoring are now correctly handled.

## Resolution

root_cause: TWO issues prevent AI column scoring:
  1. PLAY BUTTON INTERCEPTED: The play button drawn on AI column headers (24px, 8px from right edge) overlaps with Glide Data Grid's internal header menu clickable zone (30px from right edge). Glide's mouseup handler returns early for clicks in this zone, preventing onHeaderClicked from firing. Only onHeaderMenuClick fires, which opens the context menu instead of triggering scoring.
  2. RUN COLUMN SUBMENU HIDDEN: The HeaderMenu container has overflow-hidden CSS class, which clips the "Run Column" submenu that's positioned outside the container bounds (absolute left-full). The submenu renders in the DOM but is visually invisible.

fix: Applied two changes:
  1. scanner-data-grid.tsx: Modified onHeaderMenuClick to detect AI column clicks and trigger scoring (onScoreColumn) instead of opening the menu. Also updated onHeaderContextMenu to directly open the menu (bypassing the modified onHeaderMenuClick) so right-click still shows the context menu for AI columns.
  2. header-menu.tsx: Changed overflow-hidden to overflow-visible on the menu container, allowing the "Run Column" submenu to render outside the container bounds and be visible to users.

verification: TypeScript compilation passes. Code flow traced through all scenarios: play button click, right-click menu, scoring-in-progress state, non-AI columns.

files_changed:
  - src/components/scanners/grid/scanner-data-grid.tsx
  - src/components/scanners/grid/header-menu.tsx
