# State: Competitor Contract Intelligence

**Last updated:** 2026-02-14
**Branch:** `feat/competitor-analysis`
**Worktree:** `/Users/kirillkozak/Projects/tendhunt-competitor-analysis`

## Current Phase

**Phase 5: Competitor Monitoring & Alerts** — Done

**All 5 phases complete. All 36 requirements delivered.**

## Phase Progress

| Phase | Status | Requirements | Done |
|-------|--------|-------------|------|
| 1 | Done | 7 | 7 |
| 2 | Done | 12 | 12 |
| 3 | Done | 4 | 4 |
| 4 | Done | 6 | 6 |
| 5 | Done | 6 | 6 |

## Planning Artifacts

| Artifact | Status |
|----------|--------|
| PROJECT.md | Done |
| Research (5 files) | Done |
| REQUIREMENTS.md (36 reqs) | Done |
| ROADMAP.md (5 phases) | Done |
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

## Phase 3 Deliverables

All 4 requirements completed:

| Requirement | Deliverable |
|-------------|-------------|
| SPND-01 | `apps/web/src/components/competitors/spend-tab.tsx` — Spend tab on profile page showing payment data from transparency CSVs, with empty state for suppliers with no spend data |
| SPND-02 | Summary stat cards showing total spend, payment count, paying buyer count, and contract buyer overlap |
| SPND-03 | Per-buyer spend breakdown cards sorted by total spend, showing payment count, date range, categories, and links to buyer detail pages |
| SPND-04 | `DataSourceBanner` component clearly explaining the difference between spend (transparency CSVs) and contract (CF/FaT) data sources |

Key files:
- `apps/web/src/lib/competitors.ts` — added `getCompetitorSpend()` aggregation with `$facet`-style buyer grouping, buyer name resolution, and contract overlap detection
- `apps/web/src/app/api/competitors/[name]/spend/route.ts` — authenticated API endpoint for spend data
- `apps/web/src/components/competitors/spend-tab.tsx` — full spend tab UI with stats, data source banner, and buyer cards
- `apps/web/src/components/competitors/profile-tabs.tsx` — updated to include 4th "Spend" tab

Cross-reference features:
- Each spend buyer card shows a green "Contract" badge if that buyer also has formal contract awards with this supplier
- "Also in Contracts" stat card shows overlap count (N of M buyers appear in both spend and contract data)
- Normalized vendor name matching via `vendorNormalized` field in SpendTransaction collection

## Phase 4 Deliverables

All 6 requirements completed:

| Requirement | Deliverable |
|-------------|-------------|
| NAV-01 | Sidebar "Competitors" entry with `Swords` icon in Data group of `app-sidebar.tsx` (done in Phase 1, verified) |
| NAV-02 | Breadcrumb components: `CompetitorsListBreadcrumb` (list page) + `CompetitorProfileBreadcrumb` (detail page with "Competitors > [Name]" pattern) |
| NAV-03 | Enhanced tab switch animations via `AnimatePresence mode="wait"` with keyed `motion.div` in `profile-tabs.tsx`. All components use motion/react for enter/exit transitions. |
| AI-01 | `search_competitor` tool definition in `lib/agent/tools.ts` — accepts `companyName` and `limit`, handles name variations |
| AI-02 | `handleSearchCompetitor` handler in `lib/agent/tool-handlers.ts` — calls `searchSuppliers()`, returns formatted results with profile URLs. Auto-navigates on single match. |
| AI-03 | `competitor:COMPANY_NAME` entity link protocol in `agent-message.tsx`, competitor context in system prompt (`competitor_detail` page type), suggested actions for competitor pages |

Key files modified:
- `apps/web/src/lib/agent/tools.ts` — added `search_competitor` tool definition
- `apps/web/src/lib/agent/tool-handlers.ts` — added `handleSearchCompetitor` handler with `searchSuppliers` import
- `apps/web/src/lib/agent/system-prompt.ts` — added `competitors`/`competitor_detail` page types, competitor context fields, competitor entity link docs
- `apps/web/src/components/agent/agent-provider.tsx` — added `competitors`/`competitor_detail` page types and competitor context fields
- `apps/web/src/components/agent/agent-message.tsx` — added `competitor:` entity link protocol for clickable supplier links
- `apps/web/src/components/agent/suggested-actions.tsx` — added competitor-specific suggested prompts
- `apps/web/src/components/competitors/profile-tabs.tsx` — enhanced with `AnimatePresence` tab switch transitions
- `apps/web/src/app/(dashboard)/competitors/page.tsx` — added agent context setter for competitor list page
- `apps/web/src/app/(dashboard)/competitors/[name]/page.tsx` — added `AgentContextSetter` with full competitor profile context

## Phase 5 Deliverables

All 6 requirements completed:

| Requirement | Deliverable |
|-------------|-------------|
| WATCH-01 | `apps/web/src/models/watchlist.ts` — Mongoose schema (userId, supplierName, normalizedName, notifyEmail, lastSnapshot with sectors/regions). `apps/web/src/app/api/watchlist/route.ts` — CRUD endpoints (GET with check mode, POST, DELETE, PATCH). `apps/web/src/components/competitors/watch-button.tsx` — Toggle button on profile header with animated state transitions and email notification popover. |
| WATCH-02 | `apps/workers/data-sync/src/db/watchlist.ts` — `checkWatchlistMatches()` runs after each sync batch in `sync-engine.ts`. Compares new awarded contracts against all watchlist entries by normalized supplier name matching. Creates `NEW_CONTRACT` notifications for each user watching a matching supplier. |
| WATCH-03 | `apps/web/src/models/notification.ts` — Mongoose schema (userId, type, title, body, entityLink, supplierName, read, emailSent). `apps/web/src/app/api/notifications/route.ts` — GET (list with pagination + unread count) and PATCH (mark-as-read by IDs or markAllRead). `apps/web/src/components/layout/notification-bell.tsx` — Popover in header with unread badge, 60s polling, mark-all-read, click-to-navigate. |
| WATCH-04 | `apps/web/src/components/dashboard/competitor-feed.tsx` — Activity feed card on dashboard (Sculptor homepage) showing recent notifications with type badges, time-ago, and links to competitor profiles. Auto-hides when no notifications exist. |
| WATCH-05 | Region/sector change detection integrated into `checkWatchlistMatches()` in the data-sync worker. Compares new contract regions/sectors against watchlist `lastSnapshot`. Creates `NEW_REGION` and `NEW_SECTOR` notifications. Updates snapshots after detection to prevent duplicate alerts. |
| WATCH-06 | `apps/web/src/app/api/watchlist/digest/route.ts` — Cron-triggered email digest endpoint. Collects unsent notifications for users with `notifyEmail=true`, groups by supplier, sends via Resend API (or logs if no API key configured). `apps/web/src/lib/watchlist.ts` — `getDigestRecipients()` and `getDigestNotifications()` helpers. |

Key files created:
- `apps/web/src/models/watchlist.ts` — Watchlist schema with supplier snapshot for change detection
- `apps/web/src/models/notification.ts` — Notification schema with type, read, and emailSent tracking
- `apps/web/src/lib/watchlist.ts` — Watchlist logic: `getUserWatchlist()` with activity counts, `updateWatchlistSnapshot()`, digest helpers
- `apps/web/src/app/api/watchlist/route.ts` — Full CRUD (GET/POST/DELETE/PATCH)
- `apps/web/src/app/api/watchlist/digest/route.ts` — Email digest endpoint (cron-triggered)
- `apps/web/src/app/api/notifications/route.ts` — Notification list + mark-as-read
- `apps/web/src/components/competitors/watch-button.tsx` — Watch/unwatch toggle with email settings popover
- `apps/web/src/components/competitors/watchlist-section.tsx` — Watchlist card on competitors page with remove/email toggle
- `apps/web/src/components/layout/notification-bell.tsx` — Header notification bell with popover
- `apps/web/src/components/dashboard/competitor-feed.tsx` — Dashboard activity feed card
- `apps/workers/data-sync/src/db/watchlist.ts` — Post-sync detection logic

Key files modified:
- `apps/web/src/components/competitors/profile-header.tsx` — Added WatchButton next to Track Contracts button
- `apps/web/src/components/layout/header.tsx` — Added NotificationBell to header
- `apps/web/src/components/sculptor/sculptor-homepage.tsx` — Added CompetitorFeed card to dashboard
- `apps/web/src/app/(dashboard)/competitors/page.tsx` — Added WatchlistSection below hint cards
- `apps/workers/data-sync/src/sync-engine.ts` — Added checkWatchlistMatches() call after each batch upsert

## Notes

- This feature uses no new NPM dependencies — everything builds on existing TendHunt stack
- Supplier names are the identifier (no suppliers collection in v1) — URL uses encoded name
- Search uses regex-based aggregation with normalization merging (no Atlas Search needed)
- `.planning-main-backup/` contains the inherited main branch planning files (not tracked)
- Profile aggregation uses $facet to run overview, sectors, regions, and timeline in a single query
- Contract pagination is server-side with sort support on value, date, and buyer name
- Buyer list enriches regions/sectors from the Buyer collection when contract data lacks them
- Spend data uses `vendorNormalized` field matching — same normalization logic as contract supplier names
- Contract-spend overlap detection compares buyer names (case-insensitive) between the two data sources
- Sculptor AI can search competitors via `search_competitor` tool and link to profiles via `competitor:NAME` entity links
- Watchlist detection runs as fire-and-forget after each sync batch — non-blocking to the sync pipeline
- Notification bell polls every 60s for new notifications — no WebSocket needed for v1
- Email digest is triggered via cron POST to `/api/watchlist/digest` — supports Resend API with fallback to console logging
- Change detection (new regions/sectors) uses snapshot comparison — first sync after watch won't produce false positives because initial snapshot is captured at watch time

---
*Created: 2026-02-14*
*Phase 1 completed: 2026-02-14*
*Phase 2 completed: 2026-02-14*
*Phase 3 completed: 2026-02-14*
*Phase 4 completed: 2026-02-14*
*Phase 5 completed: 2026-02-14*
