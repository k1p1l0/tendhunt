# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services.
**Current focus:** Phase 6 — Ofsted Data Sync (Enrichment Stage)

## Current Phase

**Phase 6: Ofsted Data Sync (Enrichment Stage)**
- Status: Complete
- Goal: Automated weekly Ofsted CSV sync as a new stage in the enrichment worker, with diff-based ingestion and automatic downgrade detection
- Requirements: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05

### Previous Phase

**Phase 5: AI Report Analysis Column**
- Status: Complete
- Goal: AI column that reads Ofsted report PDFs and scores tuition relevance 0-10 with reasoning
- Requirements: AI-01, AI-02, AI-03, AI-04

## Progress

### Phase 1: Inspection History Data Foundation
- [x] Extend OfstedSchool model with inspectionHistory[] and computed fields
- [x] Create ingest-ofsted-history.ts script
- [x] Download and parse historical CSVs (2015-2019, 2019-Sep2024, post-Sep2024)
- [x] Map CSV column names across eras (pre2019, 2019-2024, post2024)
- [x] Deduplicate inspections by inspectionNumber
- [x] Compute downgrade detection (lastDowngradeDate, ratingDirection, downgradeType)
- [x] Index lastDowngradeDate (descending) + ratingDirection + inspectionHistory.inspectionDate

### Phase 2: Schools Scanner Type
- [x] Add "schools" to ScannerType union and all switch/case statements
- [x] Define schools column definitions (School, Rating, Quality of Ed, Inspection Date, Prev Rating, Rating Change, Region, Phase, Pupils, LA)
- [x] Add schools entity fields for custom column support
- [x] Create /api/schools endpoint with pagination, search, and Ofsted-specific filters
- [x] Add schools-specific filters: downgradeWithin, ofstedRating, schoolPhase, localAuthority, region
- [x] Update scanner creation modal with Schools (Ofsted) type option
- [x] Update scanner creation form with SchoolsFilters component
- [x] Update edit scanner dialog with SchoolsFilters component
- [x] Update score-column and batch score routes for schools entity loading
- [x] Update scoring engine with schools entity prompt builder
- [x] Add schools type config to scanner list, header, dashboard, AI cell drawer
- [x] Add SchoolDetails component to entity detail sheet
- [x] Update agent tools and handlers for schools scanner type
- [x] Update generate-query route with schools prompt template
- [x] Default AI columns: Tuition Relevance + Outreach Priority

### Phase 3: Downgrade Detection & Sorting
- [x] Create ofsted-downgrade.ts utility library with compareInspections() and detectDowngradesFromHistory()
- [x] Handle post-Sep-2024 inspections (no overall effectiveness) via sub-judgement comparison
- [x] Add "rating-change" custom column type with color-coded badge renderer (red/green/amber)
- [x] Add rating-change icon to drawTypeIcon in scanner-data-grid.tsx
- [x] Add sortBy parameter to /api/schools route (6 sort options including downgrade_recent)
- [x] Wire sortBy through scanner page filter params
- [x] Add Sort By dropdown to SchoolsFilters in both creation form and edit dialog

### Phase 4: School Detail Page & Timeline
- [x] Create /schools/[urn] route with server component fetching school + inspection history
- [x] SchoolHeader component with current ratings, school info, buyer link, overall rating circle
- [x] InspectionTimeline component with animated vertical timeline entries (color-coded)
- [x] RatingChart sparkline SVG showing grades over time with animated path
- [x] Each inspection entry links to Ofsted report PDF via ExternalLink icon
- [x] School detail breadcrumb: Scanners > Schools > [Name]
- [x] Scanner entity detail sheet now links to /schools/[urn] for schools scanner type
- [x] Buyer Ofsted tab upgraded: shows inspection history per school (expandable)
- [x] Buyer Ofsted tab now links each school to /schools/[urn] detail page
- [x] Buyer Ofsted tab shows downgrade stats + rating direction icons
- [x] API route /api/schools/[urn] returns full school data including inspectionHistory
- [x] fetchBuyerById now selects inspectionHistory + ratingDirection for Ofsted schools

### Phase 5: AI Report Analysis Column
- [x] Create ofsted-report.ts library with PDF download, text extraction, and MongoDB caching
- [x] Create /api/schools/[urn]/report API endpoint for on-demand report text extraction
- [x] Update scoring engine: add additionalContext parameter to buildEntityUserPrompt and scoreOneEntity
- [x] Update score-column route: pre-fetch report texts via batchGetReportTexts, pass to scoring
- [x] Update schools entity loader to also select reportUrl field
- [x] Enhance "Tuition Relevance" default prompt with detailed report analysis instructions
- [x] Enhance "Outreach Priority" prompt to reference report content themes
- [x] MongoDB cache collection (ofstedReportCache) with TTL index for 90-day expiry

### Phase 6: Ofsted Data Sync (Enrichment Stage)
- [x] Create new enrichment stage `09-ofsted-sync.ts` that downloads latest Ofsted CSVs from GOV.UK
- [x] Implement diff logic: compare downloaded inspections against existing inspectionHistory by inspectionNumber
- [x] Run downgrade detection on newly ingested inspections using ofsted-downgrade.ts
- [x] Recompute lastDowngradeDate and ratingDirection for affected schools
- [x] Add sync progress tracking to enrichment job logs (schools updated, new downgrades found)
- [x] Gate stage to run at most once per week via last-sync timestamp
- [x] Register stage in enrichment worker index.ts (runs after buyer pipeline completes)
- [x] Add manual trigger endpoint `/run-ofsted-sync` with `?force=1` option
- [x] Add `lastSyncedAt` field to OfstedSchool model
- [x] Add `papaparse` dependency for in-memory CSV parsing in Cloudflare Worker

## Key Context

- Branch: `feat/ofsted-timeline`
- Worktree: `/Users/kirillkozak/Projects/tendhunt-ofsted-timeline`
- OfstedSchool model now has `inspectionHistory[]` subdocument array, `lastDowngradeDate`, `ratingDirection`, `downgradeType`
- Three CSV eras: pre2019 (2015-2019 consolidated), 2019-2024 (Sep 2024 YTD), post2024 (Aug 2025 YTD)
- Pre-2019 CSVs use different column names (e.g. "Quality of teaching, learning and assessment" vs "Quality of education")
- Post-Sep-2024 CSVs lack "Overall effectiveness" column — downgrade detection uses sub-judgement grades
- Grade 9 in CSVs = "not applicable" (monitoring visits, S8 non-conversions), filtered out during ingestion
- ~22,000 schools already ingested from monthly management info CSV
- Do NOT run `bun run lint` -- memory exhaustion on this machine
- Schools scanner type added: "schools" is now a valid ScannerType alongside rfps/meetings/buyers
- Schools API at /api/schools supports: q, ofstedRating, region, schoolPhase, localAuthority, downgradeWithin, sortBy
- sortBy options: downgrade_recent (default), inspection_recent, name_asc, name_desc, rating_asc, rating_desc
- Default AI columns for schools: "Tuition Relevance" (score 1-10) and "Outreach Priority" (text assessment)
- New "rating-change" DataType with custom canvas renderer: red pill with down arrow for downgraded, green with up arrow for improved, grey with equals for unchanged
- `ofsted-downgrade.ts` utility provides compareInspections() for any two inspections and detectDowngradesFromHistory() for full timeline analysis

## Key Context (Phase 5 additions)

- `ofsted-report.ts` provides `getReportText()` and `batchGetReportTexts()` for PDF fetch + extraction + caching
- Reports cached in MongoDB `ofstedReportCache` collection with 90-day TTL (reports don't change)
- Cache keyed by URN + reportUrl (unique compound index)
- Max extracted text: 40,000 chars per report (truncated to fit AI token limits)
- PDF fetch timeout: 30 seconds per report
- Batch pre-fetch runs sequentially to avoid hammering Ofsted servers
- The scoring engine's `buildEntityUserPrompt` now appends report text as a dedicated "Ofsted Report Content" section for schools
- Non-school scanner types are unaffected (additionalContext parameter is optional)
- Report API endpoint at `/api/schools/[urn]/report` supports `?inspectionNumber=` for historical reports

## Key Context (Phase 6 additions)

- Ofsted sync stage is `09-ofsted-sync.ts` in enrichment worker — NOT a buyer pipeline stage
- Runs after all buyer enrichment stages complete (in the `all_complete` block), self-gated to once per week
- Weekly gate uses `ofstedsyncmeta` collection with `key: "ofsted_sync"` + `lastSyncedAt` timestamp
- Diff logic: downloads all 3 CSV sources, groups by URN, fetches existing `inspectionHistory` per school, only inserts inspections with new `inspectionNumber`s
- Recomputes `lastDowngradeDate`, `ratingDirection`, `downgradeType` on merged history
- Also updates top-level school metadata (name, ratings, phase, etc.) from latest CSV data
- New downgrades detected when the latest inspection in merged history is both new AND a downgrade
- Manual trigger: `GET /run-ofsted-sync` (respects weekly gate), `GET /run-ofsted-sync?force=1` (resets gate)
- Uses `papaparse` for in-memory CSV parsing (no filesystem access in Cloudflare Workers)
- OfstedSchool model now has `lastSyncedAt` field for per-school sync tracking

## Blockers

None currently.

---
*Last updated: 2026-02-14 — Phase 6 Ofsted Data Sync complete*
