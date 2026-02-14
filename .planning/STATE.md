# State: Competitor Contract Intelligence

**Last updated:** 2026-02-14
**Branch:** `feat/competitor-analysis`
**Worktree:** `/Users/kirillkozak/Projects/tendhunt-competitor-analysis`

## Current Phase

**Phase 2: Competitor Profile & Relationships** — Done

## Phase Progress

| Phase | Status | Requirements | Done |
|-------|--------|-------------|------|
| 1 | Done | 7 | 7 |
| 2 | Done | 12 | 12 |
| 3 | Not started | 4 | 0 |
| 4 | Not started | 6 | 0 |

## Planning Artifacts

| Artifact | Status |
|----------|--------|
| PROJECT.md | Done |
| Research (5 files) | Done |
| REQUIREMENTS.md (30 reqs) | Done |
| ROADMAP.md (4 phases) | Done |
| STATE.md | Done |

## Phase 1 Deliverables

All 7 requirements completed:

| Requirement | Deliverable |
|-------------|-------------|
| DATA-02 | `apps/web/src/lib/supplier-normalize.ts` — name normalization (strip Ltd/Limited/PLC/LLP/CIC, lowercase, collapse whitespace) |
| DATA-01 | `apps/web/scripts/add-supplier-index.ts` — MongoDB index migration for `awardedSuppliers.name` and spend vendor fields |
| DATA-03 | `apps/web/src/lib/competitors.ts` + `apps/web/src/app/api/competitors/search/route.ts` — search API with aggregation pipeline |
| SRCH-01 | `apps/web/src/components/competitors/search-bar.tsx` — debounced autocomplete with keyboard navigation |
| SRCH-02 | Name variation handling built into `supplier-normalize.ts` and `buildSupplierSearchPattern()` |
| SRCH-03 | `apps/web/src/components/competitors/search-result-card.tsx` — shows name, contract count, total value, buyer count |
| SRCH-04 | `apps/web/src/app/(dashboard)/competitors/[name]/page.tsx` — profile page with basic stats (placeholder for Phase 2 tabs) |

Additional:
- Sidebar "Competitors" entry added with Swords icon
- Breadcrumbs for list and detail pages
- Competitors page with animated hint cards

## Phase 2 Deliverables

All 12 requirements completed:

| Requirement | Deliverable |
|-------------|-------------|
| DATA-04 | `apps/web/src/lib/competitors.ts` — `getCompetitorProfile()`, `getCompetitorContracts()`, `getCompetitorBuyers()` aggregation pipelines with $facet for sector/region/timeline breakdowns |
| PROF-01 | `apps/web/src/components/competitors/profile-header.tsx` + `profile-stats.tsx` — header with back nav, sector badges, 5 stat cards (contracts, value, active, buyers, latest award) |
| PROF-02 | `apps/web/src/components/competitors/sector-chart.tsx` — Recharts donut chart with sector legend showing count + value |
| PROF-03 | `apps/web/src/components/competitors/region-chart.tsx` — horizontal bar chart of geographic distribution |
| PROF-04 | `apps/web/src/components/competitors/timeline-chart.tsx` — area chart of monthly contract activity over time |
| CONT-01 | `apps/web/src/components/competitors/contracts-tab.tsx` — full contract table with title, buyer, value, date, status columns |
| CONT-02 | Server-side pagination via `/api/competitors/[name]/contracts` with page/pageSize params |
| CONT-03 | Sort dropdown (newest/oldest, highest/lowest value, buyer A-Z/Z-A) + clickable column headers |
| CONT-04 | Contract titles link to `/contracts/[id]`, buyer names link to `/buyers/[id]` |
| BUYR-01 | `apps/web/src/components/competitors/buyers-tab.tsx` — card-based buyer list with contract count and total value |
| BUYR-02 | Buyers sorted by total value (highest first) via aggregation `$sort` |
| BUYR-03 | Buyer names link to `/buyers/[id]` with external link icon on hover |
| BUYR-04 | Buyer cards show sector badge, region badge, and relationship duration (first to latest contract) |

Additional:
- `apps/web/src/components/competitors/profile-tabs.tsx` — tabbed layout (Overview, Contracts, Buyers) using shadcn Tabs with line variant
- API routes: `/api/competitors/[name]/profile`, `/api/competitors/[name]/contracts`, `/api/competitors/[name]/buyers`
- All components use motion/react for enter/exit animations
- Profile page is server-rendered (SSR) with client-side tabs for contracts/buyers loading

## What's Next

Phase 3: Spend Intelligence — Spend tab on profile page showing payment data from transparency CSVs.

## Notes

- This feature uses no new NPM dependencies — everything builds on existing TendHunt stack
- Supplier names are the identifier (no suppliers collection in v1) — URL uses encoded name
- Search uses regex-based aggregation with normalization merging (no Atlas Search needed)
- `.planning-main-backup/` contains the inherited main branch planning files (not tracked)
- Profile aggregation uses $facet to run overview, sectors, regions, and timeline in a single query
- Contract pagination is server-side with sort support on value, date, and buyer name
- Buyer list enriches regions/sectors from the Buyer collection when contract data lacks them

---
*Created: 2026-02-14*
*Phase 1 completed: 2026-02-14*
*Phase 2 completed: 2026-02-14*
