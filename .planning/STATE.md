# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services.
**Current focus:** Phase 3 -- Downgrade Detection & Sorting

## Current Phase

**Phase 2: Schools Scanner Type**
- Status: Complete
- Goal: Users can create a "schools" scanner with Ofsted-specific columns and filters
- Requirements: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06

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
- [ ] Not started

### Phase 4: School Detail Page & Timeline
- [ ] Not started

### Phase 5: AI Report Analysis Column
- [ ] Not started

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
- Schools API at /api/schools supports: q (name search), ofstedRating, region, schoolPhase, localAuthority, downgradeWithin (1m/3m/6m/1y/any)
- Default AI columns for schools: "Tuition Relevance" (score 1-10) and "Outreach Priority" (text assessment)
- Schools scanner sorts by lastDowngradeDate desc, inspectionDate desc by default

## Blockers

None currently.

---
*Last updated: 2026-02-14 after Phase 1 completion*
