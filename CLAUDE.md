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
- **AI**: Claude API (Haiku) for Vibe Scanner scoring
- **Scrapers**: Python (Scrapy + Playwright) — run on Cloudflare Workers or standalone
- **Hosting**: Cloudflare (Pages for app, Workers for scrapers/cron, R2 for storage)
- **Domains**: `tendhunt.com` = landing/marketing page, `app.tendhunt.com` = authenticated app

## Git Rules

- NEVER push or commit without explicit user command
- NEVER force push
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`

## Project Structure

- `.planning/` — All planning documents (requirements, roadmap, research, state)
- `.planning/research/` — Research outputs (stack, features, architecture, pitfalls)
- `.planning/config.json` — Workflow config + Linear integration mapping

## Scanner Data Grid — Column & Icon System

The scanner grid uses **Glide Data Grid** (`@glideapps/glide-data-grid`) with fully custom canvas-rendered headers.

### Column Types

Every column has a `type` field in `ColumnDef` (`src/components/scanners/table-columns.ts`):

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
| `src/components/scanners/table-columns.ts` | `ColumnDef` interface + column arrays per scanner type (RFPs, Meetings, Buyers) |
| `src/components/scanners/grid/glide-columns.ts` | Converts `ColumnDef[]` → Glide `GridColumn[]` + `ColumnMeta[]` |
| `src/components/scanners/grid/custom-renderers.ts` | Canvas cell renderers: `score-badge`, `category-badge`, `entity-name` |
| `src/components/scanners/grid/cell-content.ts` | `getCellContent` factory — maps column type → GridCellKind |
| `src/components/scanners/grid/scanner-data-grid.tsx` | Main grid component — `drawHeader` draws type icons + AI sparkle headers |
| `src/components/scanners/grid/glide-theme.ts` | Theme from CSS variables, dark mode via MutationObserver |
| `src/components/scanners/grid/header-menu.tsx` | Column context menu (sort, rename, edit prompt, delete) |

### Header Icon Drawing Rules

- All icons are drawn via `drawTypeIcon()` in `scanner-data-grid.tsx`
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

AI columns have a 3-phase loading state machine managed via `ScoreEntry` in `scanner-store.ts`:
- **Queued** (`isQueued: true`): All rows start here. Score-mode shows shimmer bar, text-mode shows text skeleton.
- **Active** (`isLoading: true`, no `isQueued`): Max 2 concurrent (matches `pLimit(2)` in scoring engine). Score-mode shows spinning circle, text-mode shows text skeleton.
- **Complete** (neither flag): Shows actual score badge or text result.

Promotion logic lives in `scoreSingleColumn` and `handleScore` in `page.tsx`: on `column_start` SSE event, first 2 queued entities promote to active. On each `progress` event (entity scored), next queued entity promotes.

### Scoring & Filters Rule (CRITICAL)

**Every call to `scoreSingleColumn()` MUST check `getFilteredEntityIds()` first** and pass the result as `entityIds` if filters are active. This applies to:
- `handleRunColumn` (header menu play button)
- `handleColumnAdded` (new AI column auto-score)
- `onScoreColumn` (inline play button callback)
- Any future scoring trigger

Without this, scoring ignores active column filters and processes ALL rows instead of just the filtered set. This was a bug caught on 2026-02-11.

### Adding a New Column Type

1. Add type to union in `ColumnDef.type` (`table-columns.ts`)
2. Add to `ColumnMeta` if extra metadata needed (`glide-columns.ts`)
3. Add cell rendering case in `createGetCellContent` (`cell-content.ts`)
4. If custom rendering needed, add renderer to `custom-renderers.ts` and include in `customRenderers` array
5. Add icon drawing case in `drawTypeIcon` switch (`scanner-data-grid.tsx`)
6. Add to column arrays for relevant scanner types (`table-columns.ts`)
