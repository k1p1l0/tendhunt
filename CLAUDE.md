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

## Buyer Data Enrichment Pipeline

### Overview

A 6-stage Cloudflare Worker (`apps/workers/enrichment/`) enriches 2,384 UK public sector buyers with governance data, board documents, and key personnel. Runs **hourly** via cron (`0 * * * *`), processing 500 buyers per invocation with cursor-based resume.

**Worker URL**: `https://tendhunt-enrichment.kozak-74d.workers.dev`
**Secrets**: `MONGODB_URI`, `ANTHROPIC_API_KEY` (set via `wrangler secret put`)

### DataSource Seeding

The `DataSource` collection is seeded from an external spec file:
- **Source**: `/Users/kirillkozak/Projects/board-minutes-intelligence/specs/DATA_SOURCES.md`
- **Script**: `apps/web/scripts/seed-data-sources.ts`
- **Run**: `DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/seed-data-sources.ts`
- **Result**: ~2,361 documents (672 Tier 0, 1,693 Tier 1), idempotent via bulkWrite upsert on `name`

The seed script parses markdown tables from DATA_SOURCES.md covering **20 categories** of UK public sector organisations:

| Category | orgType | Count (approx) |
|----------|---------|-----------------|
| London Borough Councils | `local_council_london` | 33 |
| Metropolitan Borough Councils | `local_council_metro` | 36 |
| County Councils | `local_council_county` | 21 |
| Unitary Authorities | `local_council_unitary` | 59 |
| District Councils | `local_council_district` | 164 |
| Sui Generis Councils | `local_council_sui_generis` | 4 |
| NHS Ambulance Trusts | `nhs_trust_ambulance` | 10 |
| NHS Acute Trusts (7 regions) | `nhs_trust_acute` | ~130 |
| NHS Mental Health Trusts | `nhs_trust_mental_health` | 44 |
| NHS Community Healthcare | `nhs_trust_community` | 11 |
| NHS ICBs (7 regions) | `nhs_icb` | 42 |
| Fire & Rescue Services | `fire_rescue` | 44 |
| Police & Crime Commissioners | `police_pcc` | 40 |
| Combined Authorities | `combined_authority` | 11 |
| National Park Authorities | `national_park` | 10 |
| Multi-Academy Trusts | `mat` | ~1,400 |
| Universities | `university` | ~170 |
| FE Colleges | `fe_college` | ~90 |
| Healthcare Regulators | `alb` | ~15 |
| Arms-Length Bodies | `alb` | ~30 |

Each DataSource record includes: `name`, `orgType`, `region`, `democracyPortalUrl`, `boardPapersUrl`, `platform` (ModernGov/CMIS/Custom/Jadu/None), `website`, `tier`, `status`.

### 6-Stage Pipeline

Stages run sequentially. Each stage processes all buyers before the next begins. The `EnrichmentJob` collection tracks cursor position per stage for crash-safe resume.

| Stage | File | What it does |
|-------|------|-------------|
| 1. `classify` | `stages/01-classify.ts` | Fuzzy-match buyer names → DataSource via Fuse.js (threshold 0.3, 16 strip patterns for UK org name normalization). Sets `orgType`, `dataSourceId`, governance URLs. |
| 2. `governance_urls` | `stages/02-governance-urls.ts` | Propagate `democracyPortalUrl`, `boardPapersUrl`, `platform` from DataSource to matched buyers. |
| 3. `moderngov` | `stages/03-moderngov.ts` | Call ModernGov SOAP API for buyers on ModernGov platform. Fetch recent meetings + committees, upsert `BoardDocument` records. Uses double XML parse (SOAP envelope → inner result). |
| 4. `scrape` | `stages/04-scrape.ts` | HTML scrape governance pages for non-ModernGov orgs. Extract board document links, descriptions, meeting dates. |
| 5. `personnel` | `stages/05-personnel.ts` | Claude Haiku (`claude-haiku-4-5-20250401`) extracts key personnel from scraped content. p-limit(2) concurrency. Upserts `KeyPersonnel` records with role, confidence score. |
| 6. `score` | `stages/06-score.ts` | Compute weighted enrichment score (0–100): orgType(15) + governance(10) + boardPapers(10) + website(5) + description(5) + staff(10) + budget(10) + personnel(20) + docs(15). |

### Rate Limiting

Per-domain rate limiter (`apps/workers/enrichment/src/api-clients/rate-limiter.ts`) with exponential backoff:
- `moderngov` domains: 2s delay
- `nhs.uk`: 2s delay
- `gov.uk`: 1s delay
- Default: 3s delay
- Retries on 429/503/network errors (max 3, respects `Retry-After` header)

### MongoDB Collections (Enrichment)

| Collection | Model File | Purpose |
|------------|-----------|---------|
| `DataSource` | `apps/web/src/models/data-source.ts` | Seed data — UK public sector orgs with governance URLs |
| `BoardDocument` | `apps/web/src/models/board-document.ts` | Scraped board papers/meeting docs per buyer |
| `KeyPersonnel` | `apps/web/src/models/key-personnel.ts` | Extracted key people (CEO, CFO, etc.) per buyer |
| `EnrichmentJob` | `apps/web/src/models/enrichment-job.ts` | Pipeline state — cursor, stage, progress tracking |

### Buyer Schema Extensions

The `Buyer` model (`apps/web/src/models/buyer.ts`) was extended with 12 enrichment fields:
`orgType`, `orgSubType`, `dataSourceId`, `democracyPortalUrl`, `democracyPlatform`, `boardPapersUrl`, `staffCount`, `annualBudget`, `enrichmentScore`, `enrichmentSources`, `lastEnrichedAt`, `enrichmentVersion`

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
```

## Common Issues

### Cherry-picking between divergent branches

Avoid cherry-picking commits between branches with significantly different file structures. Cherry-picks can overwrite entire files rather than applying targeted changes. Prefer manually applying specific fixes when branch structures differ.

### Interface changes

When adding optional parameters to a method, update BOTH the base class/interface definition AND all implementing classes. TypeScript won't always catch missing fields in base interfaces due to structural typing.

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

**Every call to `scoreSingleColumn()` MUST check `getFilteredEntityIds()` first** and pass the result as `entityIds` if filters are active. This applies to:
- `handleRunColumn` (header menu play button)
- `handleColumnAdded` (new AI column auto-score)
- `onScoreColumn` (inline play button callback)
- Any future scoring trigger

Without this, scoring ignores active column filters and processes ALL rows instead of just the filtered set. This was a bug caught on 2026-02-11.

### Adding a New Column Type

1. Add type to union in `ColumnDef.type` (`apps/web/src/components/scanners/table-columns.ts`)
2. Add to `ColumnMeta` if extra metadata needed (`apps/web/src/components/scanners/grid/glide-columns.ts`)
3. Add cell rendering case in `createGetCellContent` (`apps/web/src/components/scanners/grid/cell-content.ts`)
4. If custom rendering needed, add renderer to `apps/web/src/components/scanners/grid/custom-renderers.ts` and include in `customRenderers` array
5. Add icon drawing case in `drawTypeIcon` switch (`apps/web/src/components/scanners/grid/scanner-data-grid.tsx`)
6. Add to column arrays for relevant scanner types (`apps/web/src/components/scanners/table-columns.ts`)
