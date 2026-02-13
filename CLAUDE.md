# TendHunt — Project Instructions

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
- Per-worker details: data-sync, enrichment (8-stage), spend-ingest (4-stage)
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
- AI columns skip type icon — use sparkle stars + tinted lime background instead
- Core column headers: call `drawContent()` first (Glide default), then overdraw left portion with icon + title, preserving the right menu arrow zone

### Custom Cell Renderers

Four renderers registered in `customRenderers` array:
1. **`score-badge`** — Circle with score number. Colors: red `#ef4444` (<4), yellow `#eab308` (4-7), green `#22c55e` (>=7). Loading: spinning arc. Queued: shimmer bar with "queued" label. Empty: dashed border.
2. **`text-shimmer`** — Skeleton loader for text-mode AI columns during loading. Draws 2 horizontal gray bars (70%/50% width) with animated shimmer gradient sweep.
3. **`category-badge`** — Rounded-rect pill with label text. Background from `theme.bgCellMedium`.
4. **`entity-name`** — Logo image (18px, rounded corners, cached in Map) + text. Fallback: initials circle. Uses `setLogoRedrawCallback` for async image load → grid repaint.

### AI Column Loading States

AI columns have a 3-phase loading state machine managed via `ScoreEntry` in `apps/web/src/stores/scanner-store.ts`:
- **Queued** (`isQueued: true`): All rows start here. Score-mode shows shimmer bar, text-mode shows text skeleton.
- **Active** (`isLoading: true`, no `isQueued`): Max 2 concurrent (matches `pLimit(2)` in scoring engine). Score-mode shows spinning circle, text-mode shows text skeleton.
- **Complete** (neither flag): Shows actual score badge or text result.

Promotion logic lives in `scoreSingleColumn` and `handleScore` in `page.tsx`: on `column_start` SSE event, first 2 queued entities promote to active. On each `progress` event (entity scored), next queued entity promotes.

### Scoring & Filters Rule (CRITICAL)

**Every call to `scoreSingleColumn()` MUST call `getVisibleEntityIds()` first** and pass the result as `entityIds`. This applies to:
- `handleRunColumn` (header menu play button)
- `handleColumnAdded` (new AI column auto-score)
- `onScoreColumn` (inline play button callback)
- Any future scoring trigger

`getVisibleEntityIds()` always returns an array of IDs from the currently loaded rows, respecting both row pagination AND column filters. **Never pass `entityIds` as undefined/null** — the backend interprets missing `entityIds` as "score ALL entities in the database", which ignores pagination. This was a bug caught on 2026-02-11 (column filters) and 2026-02-12 (row pagination).

### Adding a New Column Type

1. Add type to union in `ColumnDef.type` (`apps/web/src/components/scanners/table-columns.ts`)
2. Add to `ColumnMeta` if extra metadata needed (`apps/web/src/components/scanners/grid/glide-columns.ts`)
3. Add cell rendering case in `createGetCellContent` (`apps/web/src/components/scanners/grid/cell-content.ts`)
4. If custom rendering needed, add renderer to `apps/web/src/components/scanners/grid/custom-renderers.ts` and include in `customRenderers` array
5. Add icon drawing case in `drawTypeIcon` switch (`apps/web/src/components/scanners/grid/scanner-data-grid.tsx`)
6. Add to column arrays for relevant scanner types (`apps/web/src/components/scanners/table-columns.ts`)
