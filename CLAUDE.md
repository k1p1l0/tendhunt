# TendHunt — Project Instructions

## Active Worktrees

| Branch | Path | Phase |
|--------|------|-------|
| `main` | `/Users/kirillkozak/Projects/tendhunt.com` | Main development |
| `feat/phase-32-contract-enrichment` | `/Users/kirillkozak/Projects/tendhunt-contract-enrichment` | Phase 32: Contract Enrichment |

When working on Phase 32, use the worktree path. Merge back to main via PR when complete.

## Source of Truth

This project uses **three synchronized sources of truth**:

| Source | What | Where |
|--------|------|-------|
| `.planning/` files | Requirements, Roadmap, State | Local — `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md` |
| Linear (Hackaton MVP) | Issues, Projects, Status | Linear MCP — team `6a876c70-f9d6-4d38-a6a1-631385c2e3e3` |
| Git commits | Code progress | Local repo |

All three MUST stay synchronized. When you complete work, update ALL three.

## Linear Sync Protocol

### CRITICAL RULE: Always update Linear issue status in real-time

**BEFORE writing any code for a requirement, you MUST first move its Linear issue to "In Progress".**
This is non-negotiable. The user tracks progress via Linear and needs to see what is actively being worked on at all times.

The workflow for EVERY requirement is:

```
1. BEFORE coding  → Linear issue → "In Progress"   (so user sees what you're working on)
2. Write the code → commit
3. AFTER verified → Linear issue → "Done"           (so user sees it's complete)
```

If you are working on multiple requirements within a plan, move ALL of them to "In Progress" at the start of that plan, then move each to "Done" as you finish them individually.

### When starting work on a requirement:
1. **FIRST**: Move the Linear issue to **"In Progress"** via `claude_ai_Linear/update_issue` — do this BEFORE writing any code
2. Look up the issue identifier in `.planning/config.json` → `integrations.linear.issue_map`
3. Update `.planning/STATE.md` to reflect current phase/plan progress

### When completing a requirement:
1. Update the Linear issue status to **"Done"** via `claude_ai_Linear/update_issue`
2. Update `.planning/REQUIREMENTS.md` traceability table — change Status from `Pending` to `Done`
3. Update `.planning/ROADMAP.md` — check off the completed plan
4. Update `.planning/STATE.md` with completion

### Phase ↔ Linear Project Mapping

| Phase | Linear Project | Project ID |
|-------|---------------|------------|
| Phase 1: Foundation | Authentication & Onboarding | `ff473edb-ec9b-4bed-9f0e-7843f545e276` |
| Phase 2: Data Pipeline | Data Pipeline | `b19535f7-5053-494d-84d6-6cce0af67ab6` |
| Phase 3: Onboarding | Authentication & Onboarding | `ff473edb-ec9b-4bed-9f0e-7843f545e276` |
| Phase 4: Dashboard | Contract Dashboard | `df9b71b9-2d42-424a-912e-759838dee319` |
| Phase 5: Vibe Scanner | Vibe Scanner | `5314baca-f886-4516-8851-e99ac9be3419` |
| Phase 6: Buyer+Credits | Buyer Intelligence + Credit System | `6ae37199-...` + `fc24c693-...` |
| Phase 7: Signals | Buying Signals | `0e1029ef-48ce-4598-a6bb-d793e9753f46` |
| Phase 8: Pricing | Monetization & Pricing | `3a533fd4-09db-4f76-a85b-037733b616b9` |

### Requirement → Linear Issue Mapping

Full mapping is in `.planning/config.json` → `integrations.linear.issue_map`.
Pattern: requirement ID (e.g. `AUTH-01`) → Linear identifier (e.g. `HAC-1`).

### Linear Statuses
- **Backlog** — Not yet planned
- **Todo** — Planned, ready to start
- **In Progress** — Actively being worked on
- **Done** — Completed and verified
- **Canceled** — Dropped from scope

### When starting a phase:
1. Move ALL phase requirement issues from **Backlog** → **Todo** in Linear (batch update)
2. Update the Linear project status to **In Progress** via `claude_ai_Linear/update_project`
3. As you begin each individual requirement, move it from **Todo** → **In Progress**

### When completing a phase:
1. Verify ALL phase issues are **Done** in Linear — if any are not, update them
2. Update the Linear project status to reflect completion
3. Update the Linear project **description** with a completion summary: what was built, key files, any deviations
4. Update ROADMAP.md phase checkbox to `[x]`

## Tech Stack

- **Framework**: Next.js 16.1 (TypeScript)
- **Database**: MongoDB Atlas (free tier)
- **Auth**: Clerk
- **UI**: shadcn/ui + Tailwind CSS 4.1
- **AI**: Claude API (Haiku) for Vibe Scanner scoring + enrichment personnel extraction
- **Scrapers**: Python (Scrapy + Playwright) — run on Cloudflare Workers or standalone
- **Hosting**: Cloudflare (Pages for app, Workers for scrapers/cron, R2 for storage)
- **Domains**: `tendhunt.com` = landing/marketing page, `app.tendhunt.com` = authenticated app

## Cloudflare Workers

See **`apps/workers/CLAUDE.md`** for full worker architecture documentation including:
- 3-worker pipeline (data-sync → enrichment → spend-ingest) with data flow diagram
- Per-worker details: data-sync, enrichment (9-stage, including parent_link), spend-ingest (4-stage)
- Single-buyer endpoints, secrets/env vars, deploy commands, debugging
- DataSource seeding, rate limiting, MongoDB collections, error recovery

## Git Rules

**These project-level git rules OVERRIDE any global `~/.claude/CLAUDE.md` git rules.**

- ALWAYS commit changes after finishing a task — do not wait for explicit command to commit
- NEVER push without explicit user command
- NEVER force push
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`

## Code Style Rules

- **Minimal code comments** — only for workarounds, important design decisions, tricks, and corner cases
- **Separate type imports from value imports** — don't combine types and values in the same import statement:

```typescript
// ✅ CORRECT - separate imports
import { SomeComponent } from "@/components/some-component";
import type { SomeType } from "@/components/some-component";

// ❌ WRONG - combined import
import { SomeComponent, type SomeType } from "@/components/some-component";
```

### TypeScript Class Member Ordering

Order class members by access modifier (most visible to least visible):

1. **public** members (methods and properties)
2. **protected** members (methods and properties)
3. **private** members (methods and properties)

### PR Title Convention

```text
# ❌ WRONG - Subject starts with uppercase
feat(scope): Add new feature

# ✅ CORRECT - Subject starts with lowercase
feat(scope): add new feature
```

## UI/UX & Animation Guidelines

**Every UI/UX implementation MUST include animations and follow design engineering principles.**

1. **All state transitions must be animated** — opening/closing modals, expanding/collapsing sections, entering/exiting elements, tab switches, page transitions, loading states, hover/focus effects.
2. **Use Motion (Framer Motion)** for component-level animations (`motion.div`, `AnimatePresence`, layout animations). Use CSS transitions only for simple property changes (color, opacity, border).
3. **Animation defaults:**
   - Enter/exit: `ease-out`, 150–250ms
   - Page transitions: 300–400ms max
   - Hover/focus: `ease`, 100–150ms
   - Springs for draggable/interactive elements
4. **Never ship static UI** — if an element appears, disappears, or changes state, it must transition smoothly. No abrupt show/hide, no jumpy layout shifts.
5. **Accessibility is mandatory:** every animation must respect `prefers-reduced-motion`, every icon button needs `aria-label`, minimum 44px tap targets on mobile, `@media (hover: hover)` for hover effects.
6. **Avoid these common mistakes:** `transition: all` (specify exact properties), animating `height`/`width` (use `transform`/`opacity`), hover effects on touch devices, font weight changes on hover, `z-index: 9999` (use a fixed scale).

## Pre-Commit Checks

**ALWAYS run typecheck before pushing to GitHub.** This is mandatory to catch errors before CI fails.

```bash
# ALWAYS run before git push:
pnpm typecheck
cd apps/web && bun run lint
```

## Testing

- **Framework:** Vitest (shared across `apps/web` and `apps/workers/*`)
- **Run:** `cd apps/web && bun run test` or `bun run --cwd apps/web test`
- **Config:** `apps/web/vitest.config.mts` with `@` path alias pointing to `./src`
- **Convention:** Co-locate tests next to source files as `*.test.ts` (e.g. `scanner-store.test.ts` beside `scanner-store.ts`)
- **What to test:** Pure functions, Zustand store logic, system prompt builders — anything that doesn't need a DOM or real DB
- **What NOT to test:** React components (no testing-library set up), API routes (need real MongoDB)
- **Existing pattern:** See `contract-mechanism.test.ts` for fake timers usage
- **Rule:** Every bug fix MUST include a regression test

## CI Lint Rules (React Compiler + ESLint)

CI runs `bun run lint` which includes the React compiler plugin. These rules are stricter than local dev and MUST pass before merge.

### No components defined inside render (`react-hooks/static-components`)

Never define a component function inside another component's render body. It creates a new component identity on every render, resetting state.

```typescript
// ❌ WRONG — component defined inside render
function MyList() {
  function SortableHead({ field }: { field: string }) { return <th>...</th>; }
  return <table><SortableHead field="name" /></table>;
}

// ✅ CORRECT — use a render function (not a component)
function MyList() {
  const renderSortableHead = (field: string) => <th>...</th>;
  return <table>{renderSortableHead("name")}</table>;
}
```

### No ref mutations during render (`react-hooks/refs`)

Never assign to `ref.current` in the component body. Wrap in `useEffect`.

```typescript
// ❌ WRONG
const myRef = useRef(someValue);
myRef.current = someValue; // assigned during render

// ✅ CORRECT
const myRef = useRef(someValue);
useEffect(() => { myRef.current = someValue; }, [someValue]);
```

### No impure functions during render (`react-hooks/purity`)

`Math.random()` and similar impure functions cannot be called during render, even inside `useMemo`. Use `useState` initializer instead (runs once).

```typescript
// ❌ WRONG
const width = useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);

// ✅ CORRECT
const [width] = useState(() => `${Math.floor(Math.random() * 40) + 50}%`);
```

### No `any` types (`@typescript-eslint/no-explicit-any`)

Use `Record<string, unknown>` or proper types instead of `as any`.

### No modifying values through ref props (React compiler)

The React compiler doesn't allow mutating DOM elements through ref props. Use a local ref instead.

```typescript
// ❌ WRONG — mutating through prop ref
function Input({ textareaRef }: { textareaRef: RefObject<HTMLTextAreaElement> }) {
  const el = textareaRef.current;
  el.style.height = "auto"; // "This value cannot be modified"
}

// ✅ CORRECT — use local ref synced via useEffect
function Input({ textareaRef }: { textareaRef: RefObject<HTMLTextAreaElement> }) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { localRef.current = textareaRef?.current ?? null; }, [textareaRef]);
  // Now mutate localRef.current safely
}
```

### No synchronous setState in effects

Wrap `setState` calls inside `useEffect` with `requestAnimationFrame` to avoid cascading render warnings.

### Scripts excluded from web typecheck

`apps/web/tsconfig.json` excludes `scripts/` directory. Scripts use `mongodb`, `xlsx`, `pdf-parse` etc. which aren't in `apps/web` dependencies (they run via `tsx` independently). All apps must have their direct type dependencies installed — e.g. `apps/admin` needs `mongodb` even though `mongoose` bundles it.

## Breadcrumb System

The app uses a **context-based breadcrumb** that renders in the global `<Header>` component (top nav bar, next to the sidebar trigger). When no breadcrumb is set, it shows "TendHunt".

### How it works

- `BreadcrumbProvider` wraps the app layout (`apps/web/src/components/layout/breadcrumb-context.tsx`)
- `<Header>` reads `useBreadcrumb()` and renders the breadcrumb or falls back to "TendHunt"
- Pages push their breadcrumb into context via a **client component** that calls `setBreadcrumb()` in `useEffect` and clears it on unmount

### Pattern for list pages

Create a breadcrumb component that sets just the page name (e.g. "Contracts"):

```typescript
// apps/web/src/app/(dashboard)/contracts/breadcrumb.tsx
"use client";
import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function ContractsListBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();
  useEffect(() => {
    setBreadcrumb(<span className="text-sm font-medium">Contracts</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);
  return null;
}
```

### Pattern for detail pages

Create a breadcrumb component with navigation back to the list + entity name:

```typescript
// apps/web/src/app/(dashboard)/contracts/[id]/breadcrumb.tsx
"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function ContractBreadcrumb({ name }: { name: string }) {
  const { setBreadcrumb } = useBreadcrumb();
  useEffect(() => {
    setBreadcrumb(
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/contracts" className="text-muted-foreground hover:text-foreground transition-colors">
          Contracts
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium truncate max-w-[300px]">{name}</span>
      </nav>
    );
    return () => setBreadcrumb(null);
  }, [name, setBreadcrumb]);
  return null;
}
```

### Rules

- **List pages**: Set breadcrumb to just the section name (no "All" prefix). Do NOT put a title `<h1>` in the page body — the breadcrumb IS the title.
- **Detail pages**: Set breadcrumb to `Section > Entity Name`. The detail page can still have a sticky header with back arrow + title + action buttons.
- **Server components** can't call `useBreadcrumb()` directly — create a separate client component file (`breadcrumb.tsx`) and render it as `<ContractBreadcrumb name={...} />`.
- **Always clean up** on unmount: `return () => setBreadcrumb(null)` in the `useEffect`.
- Existing examples: `buyers/[id]/breadcrumb.tsx`, `contracts/breadcrumb.tsx`, `contracts/[id]/breadcrumb.tsx`, scanners page (inline in client component).

## Common Issues

### Cherry-picking between divergent branches

Avoid cherry-picking commits between branches with significantly different file structures. Cherry-picks can overwrite entire files rather than applying targeted changes. Prefer manually applying specific fixes when branch structures differ.

### Interface changes

When adding optional parameters to a method, update BOTH the base class/interface definition AND all implementing classes. TypeScript won't always catch missing fields in base interfaces due to structural typing.

### MongoDB $text search — quoted phrases are AND'd

MongoDB `$text` search treats **unquoted words as OR** but **quoted phrases as AND** — every quoted phrase must appear in the same document. When the agent generates search queries with multiple quoted phrases (e.g. `"special educational needs" "functional skills"`), they return 0 results because no single document contains ALL phrases.

**Rule:** Always strip double quotes from agent-generated search queries before passing to `$text`. The scanner page (`apps/web/src/app/(dashboard)/scanners/[id]/page.tsx`) does this via `.replace(/"/g, "")`.

### Shared constants — avoid taxonomy duplication

Enum-like values (sectors, regions, signal types) must come from a **single shared constant**, not be hardcoded in multiple files. The sector list source of truth is `apps/web/src/lib/constants/sectors.ts`, derived from CPV codes in the data-sync worker (`apps/workers/data-sync/src/mappers/ocds-mapper.ts`).

**Rule:** When adding a new dropdown/filter that references database enum values, import from the shared constant file. Never hardcode the list inline.

### Agent tool handler actions

Tool handlers in `apps/web/src/lib/agent/tool-handlers.ts` return `action` objects that are processed by `apps/web/src/hooks/use-agent.ts`. The action `type` field must match between both files. Currently supported: `action.type === "navigate"` with `action.url`.

### SSE scoring streams must handle cancellation

Both scoring API routes (`/api/scanners/[id]/score` and `/api/scanners/[id]/score-column`) use `ReadableStream` for SSE. The stream **must** implement a `cancel()` callback that sets a `cancelled` flag, and every `controller.enqueue()` call must check this flag first.

Without this, when the client disconnects (user navigates away, cancels, or closes the tab), the scoring loop continues running server-side — making Claude API calls and burning credits indefinitely. The `pLimit` concurrency tasks must also check `cancelled` before starting each `scoreOneEntity()` call.

**Pattern:**
```typescript
let cancelled = false;
const stream = new ReadableStream({
  async start(controller) {
    function send(data: object) {
      if (cancelled) return;
      try { controller.enqueue(...); } catch { cancelled = true; }
    }
    // In each pLimit task: if (cancelled) return;
  },
  cancel() { cancelled = true; },
});
```

### Scoring must respect row pagination

`getVisibleEntityIds()` in the scanner page always returns IDs from the currently loaded `rows` — never `null`. This ensures scoring only processes entities the user can see (respecting both row pagination and column filters). See the "Scoring & Filters Rule" in the Scanner Data Grid section for details.

## Project Structure

This is a **bun workspaces monorepo** with all deployable units under `apps/`.

```
tendhunt.com/
├── apps/
│   ├── web/          # @tendhunt/web — Next.js 16.1 dashboard (app.tendhunt.com)
│   ├── landing/      # @tendhunt/landing — Next.js 15.4 marketing (tendhunt.com)
│   └── workers/
│       ├── data-sync/      # @tendhunt/worker-data-sync
│       ├── enrichment/     # @tendhunt/worker-enrichment
│       └── spend-ingest/   # @tendhunt/worker-spend-ingest
├── .planning/        # Requirements, roadmap, research, state
├── .claude/          # Claude Code config
├── package.json      # Root workspace config
└── CLAUDE.md
```

- `.planning/config.json` — Workflow config + Linear integration mapping

## Scanner Data Grid — Column & Icon System

The scanner grid uses **Glide Data Grid** (`@glideapps/glide-data-grid`) with fully custom canvas-rendered headers.

### Column Types

Every column has a `type` field in `ColumnDef` (`apps/web/src/components/scanners/table-columns.ts`):

| Type | Icon | Rendered As | Example Columns |
|------|------|-------------|-----------------|
| `entity-name` | Person silhouette (head circle + shoulders arc) | Logo + text (custom renderer) | Buyer, Organization |
| `text` | Bold **T** | Plain text cell | Contract, Description |
| `number` | **#** | Numeric cell | Contacts |
| `currency` | **£** | Formatted GBP text | Value |
| `date` | Mini calendar (rounded rect + pegs) | Formatted date text | Deadline, Date |
| `badge` | Small rounded-rect outline | Colored pill (custom renderer) | Sector, Type, Region |
| `ai` | Sparkle stars (lime #E5FF00) + play button | Score badge circle (custom renderer) | Vibe Score, Bid Recommendation |

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/scanners/table-columns.ts` | `ColumnDef` interface + column arrays per scanner type (RFPs, Meetings, Buyers) |
| `apps/web/src/components/scanners/grid/glide-columns.ts` | Converts `ColumnDef[]` → Glide `GridColumn[]` + `ColumnMeta[]` |
| `apps/web/src/components/scanners/grid/custom-renderers.ts` | Canvas cell renderers: `score-badge`, `category-badge`, `entity-name` |
| `apps/web/src/components/scanners/grid/cell-content.ts` | `getCellContent` factory — maps column type → GridCellKind |
| `apps/web/src/components/scanners/grid/scanner-data-grid.tsx` | Main grid component — `drawHeader` draws type icons + AI sparkle headers |
| `apps/web/src/components/scanners/grid/glide-theme.ts` | Theme from CSS variables, dark mode via MutationObserver |
| `apps/web/src/components/scanners/grid/header-menu.tsx` | Column context menu (sort, rename, edit prompt, delete) |

### Header Icon Drawing Rules

- All icons are drawn via `drawTypeIcon()` in `apps/web/src/components/scanners/grid/scanner-data-grid.tsx`
- Icons are centered at `(rect.x + 14, rect.y + rect.height / 2)` — 14px from left edge
- Title text starts at `rect.x + 26` — 12px gap after icon center
- Stroke-based icons (date, badge, entity-name) use `lineWidth: 1.1`, `lineCap: "round"`
- Text-based icons (T, #, £) use `600 weight`, `11px` font, `textAlign: "center"`, `textBaseline: "middle"`
- Icon color: `theme.textMedium` (muted, not as dark as title text)
- AI columns use **per-use-case icons** drawn by `drawAiUseCaseIcon()` — sparkle for score, magnifying glass for research, people for decision-makers, shield+check for bid-recommendation, contact card for find-contacts. All lime `#E5FF00`.
- Core column headers: call `drawContent()` first (Glide default), then overdraw left portion with icon + title, preserving the right menu arrow zone

### Custom Cell Renderers

Four renderers registered in `customRenderers` array:
1. **`score-badge`** — Circle with score number. Colors: red `#ef4444` (<4), yellow `#eab308` (4-7), green `#22c55e` (>=7). Loading: spinning arc. Queued: shimmer bar with "queued" label. Empty: dashed border.
2. **`text-status`** — Status indicator for text-mode AI columns. 5 states: queued (shimmer bars + "queued" label), loading (fast shimmer), success (green checkmark pill + truncated text), error (red X pill + "Failed"), empty ("--" text). Replaces the old `text-shimmer` renderer.
3. **`category-badge`** — Rounded-rect pill with label text. Background from `theme.bgCellMedium`.
4. **`entity-name`** — Logo image (18px, rounded corners, cached in Map) + text. Fallback: initials circle. Uses `setLogoRedrawCallback` for async image load → grid repaint.

### AI Column Loading States

AI columns have a 4-phase loading state machine managed via `ScoreEntry` in `apps/web/src/stores/scanner-store.ts`:
- **Queued** (`isQueued: true`): Only rows that will actually be scored start here. Score-mode shows shimmer bar, text-mode shows shimmer bars with "queued" label.
- **Active** (`isLoading: true`, no `isQueued`): Max 2 concurrent (matches `pLimit(2)` in scoring engine). Score-mode shows spinning circle, text-mode shows fast shimmer.
- **Complete** (neither flag): Shows actual score badge or text result (green checkmark + text for text-mode).
- **Error** (`error` field set): Red X pill + "Failed" text. Per-entity errors captured from SSE stream.

Shimmer animation is driven by an `animTick` counter (via `useReducer`) included in the `getCellContent` memo deps. A 60ms `setInterval` during `isScoring` forces redraws so shimmer bars sweep smoothly.

Promotion logic lives in `scoreSingleColumn` and `handleScore` in `page.tsx`: on `column_start` SSE event, first 2 queued entities promote to active. On each `progress` event (entity scored), next queued entity promotes.

### Scoring & Filters Rule (CRITICAL)

**Every call to `scoreSingleColumn()` MUST call `getVisibleEntityIds()` first** and pass the result as `entityIds`. This applies to:
- `handleRunColumn` (header menu play button)
- `handleColumnAdded` (new AI column auto-score)
- `onScoreColumn` (inline play button callback)
- Any future scoring trigger

`getVisibleEntityIds()` returns entity IDs in **display order** (sorted + filtered as shown in the grid) via `displayRowIdsRef`. The grid component populates this ref in a `useEffect` whenever `displayRows` changes. The backend's `score-column` API re-sorts entities to match the client's order using an `orderMap`. This ensures scoring starts from row 1 (top of grid) and works downward. **Never pass `entityIds` as undefined/null** — the backend interprets missing `entityIds` as "score ALL entities in the database", which ignores pagination. This was a bug caught on 2026-02-11 (column filters) and 2026-02-12 (row pagination).

### Queued State Scoping Rule

`scoreSingleColumn()` only sets `isQueued: true` on rows that will **actually** be scored — matching the backend's logic:
- Respects `limit` option (e.g., "Run 1 row" only marks 1 row as queued)
- Respects `force` flag (when false, skips rows with existing results)
- After scoring completes, `clearStaleLoadingStates()` removes any leftover `isQueued`/`isLoading` flags

### Text-Mode Scoring Rules

Text-mode use cases (`research`, `decision-makers`, `bid-recommendation`, `find-contacts`) differ from score-mode:
- **Prompt**: `buildScoringSystemPrompt()` strips the scoring rubric from the base prompt for text-mode, keeping only company profile context. Explicitly instructs "Do NOT provide a numeric score."
- **Tokens**: `resolveMaxTokens()` doubles the limit for text-mode (2048 vs 1024) since text analyses are longer.
- **JSON schema**: Text-mode uses `{response: string}` only (no score/reasoning fields).
- **Safety parsing**: If the model returns score-mode JSON inside the response field, the engine extracts the useful text.
- **AI cell drawer**: Shows "Not yet analyzed" (not "Not yet scored") for empty text-mode cells. Error state shows red-tinted error box.

### Sculptor Column ID Resolution

`test_score_column` tool resolves columns by **fuzzy name matching** when the exact UUID doesn't match. It normalizes both strings by stripping all non-alphanumeric chars (`/[^a-z0-9]/g`), so `"engagement-strategy"`, `"engagement_strategy"`, and `"Engagement Strategy"` all match. If still not found, the error message lists available columns with their IDs.

### Adding a New Column Type

1. Add type to union in `ColumnDef.type` (`apps/web/src/components/scanners/table-columns.ts`)
2. Add to `ColumnMeta` if extra metadata needed (`apps/web/src/components/scanners/grid/glide-columns.ts`)
3. Add cell rendering case in `createGetCellContent` (`apps/web/src/components/scanners/grid/cell-content.ts`)
4. If custom rendering needed, add renderer to `apps/web/src/components/scanners/grid/custom-renderers.ts` and include in `customRenderers` array
5. Add icon drawing case in `drawTypeIcon` switch (`apps/web/src/components/scanners/grid/scanner-data-grid.tsx`)
6. Add to column arrays for relevant scanner types (`apps/web/src/components/scanners/table-columns.ts`)

## Sculptor AI Agent

Sculptor is TendHunt's inline AI assistant panel. It lives as a 420px panel on the right side of the layout, communicating via SSE streaming with Claude Haiku.

### Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Panel | `components/agent/agent-panel.tsx` | Inline panel (desktop) / Sheet overlay (mobile) |
| Store | `stores/agent-store.ts` | Zustand + persist middleware — conversations survive refresh |
| SSE Hook | `hooks/use-agent.ts` | Chat streaming, tool action handling, enrichment stream |
| System Prompt | `lib/agent/system-prompt.ts` | Personality, tools, context, guidelines, clarifying questions |
| Tools Schema | `lib/agent/tools.ts` | Claude tool definitions (11 tools: 8 read, 3 write, 1 enrichment) |
| Tool Handlers | `lib/agent/tool-handlers.ts` | Server-side tool execution |
| Chat API | `app/api/agent/chat/route.ts` | SSE streaming endpoint (max 5 agentic loops) |
| Messages | `components/agent/agent-message.tsx` | Markdown rendering, entity links, buyer logo hydration |
| Quick Reply | `components/agent/quick-reply-chips.tsx` | `[[option: Label]]` token parser + pill buttons |
| Tool Chain | `components/agent/tool-call-indicator.tsx` | Collapsible "Working" / "Completed N steps" UI |
| Input | `components/agent/agent-input.tsx` | Textarea with context chips bar |
| Enrichment Confirm | `components/agent/enrichment-confirm.tsx` | Text-detection fallback for "Yes, enrich" / "Skip" buttons |
| Enrichment Progress | `components/agent/enrichment-progress.tsx` | Animated stage-by-stage enrichment progress |
| Suggested Actions | `components/agent/suggested-actions.tsx` | Context-aware prompt suggestions on empty state |
| Context Provider | `components/agent/agent-provider.tsx` | React Context for page context (buyer/contract/scanner) |
| Context Setter | `components/agent/agent-context-setter.tsx` | Client component to set context from server components |

### Sculptor Personality

Sculptor has a "senior BD director" personality — direct, data-first, dry wit, zero filler. Key rules:
- No emojis, no preamble, no filler phrases
- Bold key facts, use tables for multi-entity results
- Always link entities (buyer:ID, contract:ID, scanner:ID)
- Reuse data from earlier in conversation — don't re-query

### Entity Links

Internal links use protocol prefixes: `buyer:ID`, `contract:ID`, `scanner:ID`. The custom marked renderer converts these to `<a data-internal>` links with arrow icons. Buyer links include `data-buyer-id` for logo hydration via `/api/buyers/logos`.

External links get blue underline styling with `class="external-link"`.

### On-Demand Buyer Enrichment

Sculptor can trigger the full enrichment pipeline (9 stages + 4 spend stages) for a buyer.

**Flow:**
1. AI detects missing data → suggests enrichment (text or tool call)
2. Client detects enrichment keywords → shows "Yes, enrich" / "Skip" buttons
3. User confirms → sends message → AI calls `enrich_buyer(confirmed: true)`
4. `enrich_started` action triggers SSE progress stream (`/api/enrichment/[id]/progress`)
5. `EnrichmentProgress` component shows animated stage-by-stage progress
6. Worker runs all stages → progress bar fills → completion summary

**Key files:**
- `lib/agent/tool-handlers.ts` → `handleEnrichBuyer` (24h→1h cooldown, name fallback)
- `app/api/enrichment/[id]/progress/route.ts` → SSE endpoint with estimated stage timings
- `components/agent/enrichment-progress.tsx` → Animated progress card
- `components/agent/enrichment-confirm.tsx` → Text-detection fallback for confirmation buttons

**Confirmation buttons** appear via two paths:
1. **Tool-triggered:** AI calls `enrich_buyer` without `confirmed` → `enrich_confirm` action → store state
2. **Text-detection fallback:** Regex patterns detect enrichment mentions in AI text → buttons auto-show

### Quick Reply Chips (Clarifying Questions)

Before ambiguous write actions (create scanner, apply filter, add column), Sculptor asks one clarifying question with clickable option chips instead of guessing.

**How it works:**
1. System prompt instructs Sculptor to include `[[option: Label]]` tokens in its response text
2. `renderMarkdown()` in `agent-message.tsx` calls `stripChipTokens()` to remove tokens before rendering — they're never visible as raw text
3. `QuickReplyChips` component in `agent-message-list.tsx` extracts tokens from last assistant message and renders pill buttons
4. Clicking a chip sends the label as a regular user message via `onSend()`
5. Chips auto-dismiss after click or when a new message is sent

**Key design:** Zero protocol changes — tokens live in the raw message text (persisted in MongoDB as-is). The client handles extraction and rendering. If the AI forgets the syntax, it degrades gracefully to plain text.

**System prompt rules:**
- Only ask before write actions when ambiguous (not for reads, not when context fills gaps)
- Max ONE question per response, 2-4 options
- After user responds, act immediately — no follow-up questions

### Page Context

Server components inject page context via `<AgentContextSetter context={{...}} />`. The context flows through `AgentProvider` → `useAgentContext()` → system prompt builder. Pages set context in `useEffect` and clean up on unmount (`setBreadcrumb(null)` pattern).

Context fields vary by page: `page` (always present), `buyerId/Name/Sector/Region/OrgType` (buyer detail), `contractId/Title/BuyerName/Sector/Value/Mechanism` (contract detail), `scannerId/Type/Name/Query/Filters` (scanner), `selectedRow` (scanner with row selection).

### Conversation Persistence

Conversations persist in `localStorage` via Zustand `persist` middleware (key: `sculptor-conversations`). Only `panelOpen`, `conversations`, and `activeConversationId` are persisted. Transient state (`isStreaming`, `activeEnrichment`) resets on refresh.

## Buyer Parent-Child Hierarchy

UK government buyer names are fragmented — "Ministry of Defence" appears as 26+ separate records ("Ministry of Defence, Army", "Ministry of Defence, Ships, Other", etc.). The hierarchy system links these sub-departments to their parent org.

### Schema

Buyer model (`apps/web/src/models/buyer.ts`) has three hierarchy fields:

| Field | Type | Description |
|-------|------|-------------|
| `parentBuyerId` | `ObjectId` (ref Buyer, indexed) | Points child → parent |
| `childBuyerIds` | `ObjectId[]` (ref Buyer) | Parent's list of children |
| `isParent` | `Boolean` (indexed) | Quick filter for parent orgs |

**Single-level only** — no grandchildren. "Ministry of Defence, Ships, Maritime Platform Systems" links directly to "Ministry of Defence".

### Detection Patterns

Parent names are extracted from buyer names via three patterns (in order):
1. **"hosted by"**: `"X as hosted by Y"` → parent `"Y"`
2. **Comma** (first only): `"Ministry of Defence, Army"` → parent `"Ministry of Defence"`
3. **Dash with spaces** (first only): `"DIO - Ministry of Defence"` → try both sides

Extracted name is looked up by `nameLower` in the buyers collection. Min parent name length: 5 chars. Self-references are skipped.

### Key Files

| File | Purpose |
|------|---------|
| `apps/workers/enrichment/src/stages/00-parent-link.ts` | Enrichment stage — auto-detects relationships for new buyers |
| `apps/web/scripts/backfill-parent-buyers.ts` | One-time backfill script (`--dry-run` default, `--write` to apply) |
| `apps/web/src/lib/buyers.ts` | `fetchBuyerById()` — aggregates contracts from children for parent pages |
| `apps/web/src/components/buyers/buyer-header.tsx` | "Parent org · N departments" badge + "Part of [Parent →]" link |
| `apps/web/src/components/buyers/buyer-tabs.tsx` | Conditional "Departments (N)" tab for parents |
| `apps/web/src/components/buyers/departments-tab.tsx` | Grid of child buyer cards |

### Enrichment Pipeline

`parent_link` is the **first** stage in the enrichment pipeline (stage 0, before `classify`). It runs on every hourly cron and for single-buyer enrichment (`/run-buyer?id=X`). Buyers are marked with `enrichmentSources: "parent_link"` after processing (even if no parent found) to avoid reprocessing.

### Contract Aggregation Rules

- **Parent buyer pages**: Contracts tab shows aggregated contracts from `[parent._id, ...childBuyerIds]` using `$in` query
- **Child buyer pages**: Contracts tab shows only the child's own contracts (no inheritance from parent)
- **Buyers list**: Stays flat — no grouping change, just `isParent` badge available for filtering

### UI Behavior

- **Parent header**: Shows `Badge` "Parent org · N departments" in the badges row
- **Child header**: Shows "Part of [Parent Name →]" link above the buyer name (routes to parent page)
- **Departments tab**: Only visible for parent buyers. Grid of child buyer cards with logo, name, orgType, contract count, enrichment score. Animated entrance via `motion.div`

### Backfill Script

```bash
# Dry run (default) — shows what would be linked
DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-parent-buyers.ts

# Write mode — updates database
DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/backfill-parent-buyers.ts --write
```

Initial backfill (2026-02-14): 227 children → 119 parents. Top parents: Ministry of Defence (26), Department of Finance (15), NHS England (10), DAERA (8), Velindre NHS Trust (8).

### Gotcha: `children` is a reserved React prop

Never pass `children` as an explicit JSX prop name — ESLint `react/no-children-prop` will error. Use `departments` instead when passing child buyer arrays between components.

## Spend Intelligence — SME Openness & Vendor Churn (Phase 11-07)

**Origin:** Matt's Tussle.com interview (2026-02-14). Tussle has spend data but forces users to manually eyeball each council to assess SME vs large vendor split. TendHunt automates this signal across all buyers.

### Two Intelligence Signals

| Signal | What it measures | How suppliers use it |
|--------|-----------------|---------------------|
| **SME Openness** (0-100) | % of buyer spend going to SMEs vs large vendors | High score = buyer works with lots of SMEs → "go pitch them". Low score = "locked in" with large orgs → harder to break in |
| **Vendor Stability** (0-100) | How much vendors change year-over-year | Low stability (high churn) = they change providers regularly → open to new suppliers. High stability = same vendors every year → harder to win |

### Vendor Size Heuristic

No external API (Companies House etc.) — heuristic classification from spend patterns:
- **Large vendor**: Total spend from this buyer > £500k OR > 50 transactions
- **SME vendor**: Everything else

Works because UK transparency data is £25k+ or £500+ payments — frequent large payments indicate a major contractor.

### Schema Additions (SpendSummary)

```
vendorSizeBreakdown: { sme: { totalSpend, vendorCount, transactionCount }, large: { ... } }
yearlyVendorSets: [{ year, vendors: [string], totalSpend }]
smeOpennessScore: Number (0-100)
vendorStabilityScore: Number (0-100)
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/workers/spend-ingest/src/stages/04-aggregate.ts` | Computes vendor mix + yearly sets during aggregation |
| `apps/web/src/lib/spend-analytics.ts` | `computeVendorMixAnalysis()` + `computeVendorChurnAnalysis()` |
| `apps/web/src/components/buyers/spend-vendor-mix.tsx` | SME vs Large donut chart + signal badge |
| `apps/web/src/components/buyers/spend-vendor-churn.tsx` | Year-over-year vendor change bar chart |
| `apps/web/src/components/buyers/spend-opportunities.tsx` | Two new opportunity cards (SME Openness, Vendor Stability) |

### Competitive Edge vs Tussle

Tussle: "Go into each council manually, look at invoices, figure out SME split yourself"
TendHunt: Automated SME Openness score + Vendor Stability score computed across all buyers, surfaced proactively on buyer pages and in scanners

## Admin Panel — Worker Budget Controls

The admin panel (`apps/admin/`) includes a Settings page (`/settings`) for controlling worker budget limits.

### How It Works

- **Budget enabled** (default): Workers process up to configured `maxItems` per cron run (enrichment=500, data-sync=9000, spend=200, board-minutes=100)
- **Budget disabled**: Workers process all remaining items in one invocation (passes `max=999999` to worker URL)
- Settings stored in MongoDB `adminsettings` collection with key `"worker_budgets"`
- When admin clicks "Run Now" on Workers page, the API reads budget settings and passes `?max=N` to the Cloudflare Worker

### Key Files

| File | Purpose |
|------|---------|
| `apps/admin/src/lib/settings.ts` | `getWorkerBudgets()` / `updateWorkerBudgets()` — reads/writes adminsettings |
| `apps/admin/src/app/api/settings/route.ts` | GET + PATCH endpoints for budget settings |
| `apps/admin/src/app/(dashboard)/settings/page.tsx` | Settings page with per-worker toggle + limit input |
| `apps/admin/src/app/api/workers/run/route.ts` | Reads budget before triggering worker run |

### Single-Buyer Enrichment Priority Fix

The `/run-buyer` endpoint (Sculptor enrichment) uses `enrichmentPriority: 10` to ensure the target buyer is processed first. Before setting priority, it resets all stale priority-10 entries from previous failed runs to prevent the wrong buyer from being processed.
