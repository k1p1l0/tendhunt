# Roadmap: Competitor Contract Intelligence

**Created:** 2026-02-14
**Total phases:** 4
**Total requirements:** 30

## Phase Overview

| # | Phase | Requirements | Status |
|---|-------|-------------|--------|
| 1 | Search & Data Foundation | 7 (SRCH-01..04, DATA-01..03) | Done |
| 2 | Competitor Profile & Relationships | 12 (DATA-04, PROF-01..04, CONT-01..04, BUYR-01..04) | Pending |
| 3 | Spend Intelligence | 4 (SPND-01..04) | Pending |
| 4 | Navigation & AI Integration | 6 (NAV-01..03, AI-01..03) | Pending |

---

## Phase 1: Search & Data Foundation

**Goal:** Users can search for a supplier/competitor by name and see matching results. The data layer supports efficient querying.

**Requirements:**
- [x] SRCH-01 — Search bar with autocomplete suggestions
- [x] SRCH-02 — Handle name variations (Ltd vs Limited, case insensitive)
- [x] SRCH-03 — Search results show supplier name, contract count, total value
- [x] SRCH-04 — Click result to navigate to competitor profile page
- [x] DATA-01 — MongoDB index on `awardedSuppliers.name`
- [x] DATA-02 — Supplier name normalization utility
- [x] DATA-03 — Search API route (contracts + spend data)

**Key deliverables:**
1. `lib/supplier-normalize.ts` — Name normalization (strip Ltd/Limited/PLC/LLP/CIC, lowercase, trim)
2. MongoDB index on `contracts.awardedSuppliers.name` (script or migration)
3. `/api/competitors/search` API route — regex-based search with Atlas Search fallback
4. `/competitors` page — Search bar UI with debounced autocomplete, result cards
5. URL routing: `/competitors/[name]` dynamic route (placeholder for Phase 2)

**Dependencies:** None (first phase)

**Risks:**
- Atlas Search may not be available on free tier — mitigated by regex fallback
- Name normalization heuristics may miss edge cases — iterate based on real data

---

## Phase 2: Competitor Profile & Relationships

**Goal:** Users see a complete profile for a searched supplier — overview stats, contract list, and buyer relationships.

**Requirements:**
- [ ] DATA-04 — Aggregation pipeline for competitor profile
- [ ] PROF-01 — Company name header with key stats (contracts, value, active, buyers)
- [ ] PROF-02 — Sector breakdown
- [ ] PROF-03 — Geographic breakdown (buyer regions)
- [ ] PROF-04 — Timeline of contract activity
- [ ] CONT-01 — Contract list table (title, buyer, value, dates, status)
- [ ] CONT-02 — Server-side pagination
- [ ] CONT-03 — Sortable by value, date, buyer name
- [ ] CONT-04 — Contract rows link to contract detail pages
- [ ] BUYR-01 — Buyer list with contract count and total value
- [ ] BUYR-02 — Sorted by total value (highest first)
- [ ] BUYR-03 — Buyer rows link to buyer detail pages
- [ ] BUYR-04 — Buyer entries show sector, region, relationship duration

**Key deliverables:**
1. `lib/competitors.ts` — `getCompetitorProfile()`, `getCompetitorContracts()`, `getCompetitorBuyers()` aggregation functions
2. `/competitors/[name]/page.tsx` — Profile page with tabbed layout (Overview, Contracts, Buyers)
3. Overview tab: stat cards + sector donut chart + region breakdown + contract timeline
4. Contracts tab: paginated sortable table with links to `/contracts/[id]`
5. Buyers tab: grouped buyer list with links to `/buyers/[id]`
6. Breadcrumb component for profile page

**Dependencies:** Phase 1 (search + indexing + normalization)

**Risks:**
- Aggregation performance for large suppliers (Capita, Serco) — mitigate with $limit and caching
- Supplier name in URL may need encoding edge case handling

---

## Phase 3: Spend Intelligence

**Goal:** Users see actual payment data for a supplier, showing which buyers pay them and how much (beyond formal contract awards).

**Requirements:**
- [ ] SPND-01 — Spend tab on profile page
- [ ] SPND-02 — Total spend amount and transaction count
- [ ] SPND-03 — Breakdown by buyer (which buyers pay this supplier)
- [ ] SPND-04 — Clear labeling distinguishing spend from contract data

**Key deliverables:**
1. `lib/competitors.ts` — `getCompetitorSpend()` aggregation on spend transactions
2. Spend tab on profile page — summary stats + buyer-level spend table
3. Data source indicator on profile page ("Contract data from CF/FaT, Spend data from transparency reports")
4. Cross-reference indicator showing overlap between contract buyers and spend buyers

**Dependencies:** Phase 2 (profile page with tabs)

**Risks:**
- Spend vendor names may not match contract supplier names exactly — use normalized matching
- Not all buyers have spend data ingested — show "No spend data available" gracefully

---

## Phase 4: Navigation & AI Integration

**Goal:** Competitor analysis is discoverable in the app navigation and accessible through the Sculptor AI agent.

**Requirements:**
- [ ] NAV-01 — "Competitors" sidebar entry with icon
- [ ] NAV-02 — Breadcrumb integration (list + detail)
- [ ] NAV-03 — Page animations (enter/exit, tab switches)
- [ ] AI-01 — `search_competitor` Sculptor tool
- [ ] AI-02 — AI answers "show me contracts for [company]"
- [ ] AI-03 — AI links to competitor profile pages

**Key deliverables:**
1. Sidebar entry in `app-sidebar.tsx` — "Competitors" with `Swords` or `Users` icon
2. Breadcrumb components following TendHunt patterns
3. `motion.div` entrance animations on search results and profile tabs
4. `search_competitor` tool definition in `lib/agent/tools.ts`
5. Tool handler in `lib/agent/tool-handlers.ts` — calls search + formats results
6. System prompt update in `lib/agent/system-prompt.ts` — competitor context

**Dependencies:** Phase 2 (profile pages exist to link to), Phase 3 (spend data available)

**Risks:**
- AI tool needs to handle ambiguous names (multiple matches) — return top results with clarification
- Sidebar navigation space is limited — verify icon choice fits visually

---

## Dependency Graph

```
Phase 1 (Search Foundation)
    │
    ▼
Phase 2 (Profile & Relationships)
    │
    ▼
Phase 3 (Spend Intelligence)
    │
    ▼
Phase 4 (Navigation & AI)
```

All phases are sequential. Each builds on the previous.

---

## Files Created/Modified Per Phase

### Phase 1
| Action | File |
|--------|------|
| Create | `apps/web/src/lib/supplier-normalize.ts` |
| Create | `apps/web/src/app/api/competitors/search/route.ts` |
| Create | `apps/web/src/app/(dashboard)/competitors/page.tsx` |
| Create | `apps/web/src/app/(dashboard)/competitors/[name]/page.tsx` (placeholder) |
| Create | `apps/web/src/components/competitors/search-bar.tsx` |
| Create | `apps/web/src/components/competitors/search-result-card.tsx` |
| Create | `apps/web/scripts/add-supplier-index.ts` (one-time migration) |

### Phase 2
| Action | File |
|--------|------|
| Create | `apps/web/src/lib/competitors.ts` |
| Create | `apps/web/src/app/(dashboard)/competitors/[name]/page.tsx` (full implementation) |
| Create | `apps/web/src/components/competitors/profile-header.tsx` |
| Create | `apps/web/src/components/competitors/profile-stats.tsx` |
| Create | `apps/web/src/components/competitors/profile-tabs.tsx` |
| Create | `apps/web/src/components/competitors/contracts-tab.tsx` |
| Create | `apps/web/src/components/competitors/buyers-tab.tsx` |
| Create | `apps/web/src/components/competitors/sector-chart.tsx` |
| Create | `apps/web/src/components/competitors/timeline-chart.tsx` |
| Create | `apps/web/src/app/(dashboard)/competitors/[name]/breadcrumb.tsx` |
| Create | `apps/web/src/app/(dashboard)/competitors/breadcrumb.tsx` |
| Create | `apps/web/src/app/api/competitors/[name]/profile/route.ts` |
| Create | `apps/web/src/app/api/competitors/[name]/contracts/route.ts` |
| Create | `apps/web/src/app/api/competitors/[name]/buyers/route.ts` |

### Phase 3
| Action | File |
|--------|------|
| Modify | `apps/web/src/lib/competitors.ts` (add spend functions) |
| Create | `apps/web/src/components/competitors/spend-tab.tsx` |
| Create | `apps/web/src/app/api/competitors/[name]/spend/route.ts` |
| Modify | `apps/web/src/components/competitors/profile-tabs.tsx` (add spend tab) |

### Phase 4
| Action | File |
|--------|------|
| Modify | `apps/web/src/components/layout/app-sidebar.tsx` (add Competitors nav) |
| Modify | `apps/web/src/lib/agent/tools.ts` (add search_competitor tool) |
| Modify | `apps/web/src/lib/agent/tool-handlers.ts` (add handler) |
| Modify | `apps/web/src/lib/agent/system-prompt.ts` (add competitor context) |
| Modify | `apps/web/src/components/competitors/search-bar.tsx` (add animations) |
| Modify | `apps/web/src/components/competitors/profile-tabs.tsx` (add animations) |

---
*Roadmap created: 2026-02-14*
*Last updated: 2026-02-14*
