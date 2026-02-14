# Roadmap: Ofsted Timeline Intelligence

## Overview

This feature adds Ofsted grading timeline intelligence to TendHunt, enabling tuition companies to discover recently-downgraded schools as sales targets. The build follows a data-first order: historical inspection data ingestion first (foundation for everything), then the schools scanner type with filters (discovery UI), then downgrade detection logic (the core intelligence), then the school detail page with timeline visualization (deep-dive), and finally AI report analysis columns (the differentiator). Five phases, each delivering testable capability.

**5 phases** | **22 requirements** | **Depth: standard**

## Phase 1: Inspection History Data Foundation

**Goal:** Ingest full historical Ofsted inspection data so every school has a complete inspection timeline in MongoDB.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

**What we build:**
1. Extend the OfstedSchool model with `inspectionHistory[]` array and computed fields (`lastDowngradeDate`, `ratingDirection`, `downgradeType`)
2. Create `ingest-ofsted-history.ts` script that downloads and parses historical "all inspections" CSVs from GOV.UK (2005-2015 consolidated, 2015-2019 consolidated, yearly files after)
3. Map CSV column names across eras (pre-2019 used different field names than post-2019)
4. Deduplicate inspections by `inspectionNumber` across overlapping CSV files
5. Compute downgrade detection by comparing consecutive inspections per school
6. Index `lastDowngradeDate` for fast filtering

**Key files to create/modify:**
- `apps/web/src/models/ofsted-school.ts` -- add inspectionHistory schema, computed fields, indexes
- `apps/web/scripts/ingest-ofsted-history.ts` -- new script for historical CSV ingestion

**Success criteria:**
- [x] Running `ingest-ofsted-history.ts` populates inspectionHistory for schools with historical data
- [x] Each school's inspectionHistory is sorted by date, deduplicated by inspectionNumber
- [x] `lastDowngradeDate` is computed and indexed for schools that have experienced a downgrade
- [x] Schools with post-Sep-2024 inspections have downgrade detection using sub-judgement grades (not overall effectiveness)
- [x] Database query `{ lastDowngradeDate: { $gte: 3_months_ago } }` returns results in <100ms

---

## Phase 2: Schools Scanner Type

**Goal:** Users can create a "schools" scanner that lists and filters schools with Ofsted-specific columns, matching the existing scanner pattern.

**Requirements:** SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06

**What we build:**
1. Add `"schools"` to the `ScannerType` union and all related switch/case statements across the codebase
2. Define schools-specific column definitions in `table-columns.ts` (School name, Rating, Quality of Education, Inspection Date, Previous Rating, Rating Change, Region, School Phase, Pupils, LA)
3. Add schools-specific filter fields to the scanner filters schema (downgradeWithin, ofstedRating, schoolPhase, localAuthority)
4. Create API endpoint for querying ofstedschools with pagination, search, and Ofsted filters
5. Update scanner creation form/modal to allow "schools" type
6. Ensure AI column support works for schools entities (same pattern as existing types)

**Key files to create/modify:**
- `apps/web/src/models/scanner.ts` -- add "schools" to type enum, extend filters
- `apps/web/src/components/scanners/table-columns.ts` -- schools column definitions
- `apps/web/src/components/scanners/scanner-creation-form.tsx` -- schools option
- `apps/web/src/components/scanners/create-scanner-modal.tsx` -- schools option
- `apps/web/src/app/api/scanners/route.ts` -- schools query builder
- `apps/web/src/app/api/scanners/[id]/score-column/route.ts` -- schools entity scoring
- ~10 more files with scanner type switch statements

**Success criteria:**
- [x] User can create a new scanner with type "schools" from the scanners page
- [x] Schools scanner grid displays columns with correct Ofsted data (ratings, dates, region)
- [x] "Downgraded in last N months" filter returns only schools with recent downgrades
- [x] Filters for rating, region, school phase, and local authority work correctly
- [x] Search by school name returns matching results
- [x] AI column can be added to schools scanner (scoring infrastructure connected)

---

## Phase 3: Downgrade Detection & Sorting

**Goal:** Robust downgrade detection that works for both pre-2024 (overall effectiveness) and post-2024 (sub-judgement only) inspections, with sorting by recency.

**Requirements:** DOWN-01, DOWN-02, DOWN-03

**What we build:**
1. Downgrade detection logic comparing current vs previous inspection sub-judgement grades
2. Handle post-Sep-2024 inspections where overall effectiveness is NULL
3. Sort option in scanner: "Most recent downgrades first" using pre-computed `lastDowngradeDate`
4. Rating change badge rendering in the grid (red for downgrade, green for improvement, neutral for unchanged)
5. Update the "Rating Change" column to show direction with color coding

**Key files to create/modify:**
- `apps/web/src/lib/ofsted-downgrade.ts` -- new utility for downgrade detection logic
- `apps/web/src/components/scanners/grid/cell-content.ts` -- rating change cell rendering
- `apps/web/src/components/scanners/grid/custom-renderers.ts` -- rating change badge renderer
- `apps/web/src/app/api/scanners/route.ts` -- add sort by lastDowngradeDate

**Success criteria:**
- [x] Schools with a rating that dropped between consecutive inspections are flagged as "downgraded"
- [x] Post-Sep-2024 inspections (no overall grade) detect downgrades via sub-judgement comparison
- [x] Scanner can be sorted by "most recent downgrade first"
- [x] Rating Change column shows colored badges (red/green/amber) indicating direction

---

## Phase 4: School Detail Page & Timeline

**Goal:** Users can deep-dive into a specific school's full inspection history with a visual timeline and links to reports.

**Requirements:** DETL-01, DETL-02, DETL-03, DETL-04, DETL-05

**What we build:**
1. New route `/schools/[urn]` with server component fetching school data + inspectionHistory
2. School header with current ratings, school info, and buyer link (if connected)
3. Timeline visualization component showing inspection ratings over time, color-coded by direction
4. Each inspection entry links to the Ofsted report PDF
5. Update buyer detail page Ofsted tab to show inspection history (not just current snapshot)
6. Breadcrumb integration following existing pattern

**Key files to create/modify:**
- `apps/web/src/app/(dashboard)/schools/[urn]/page.tsx` -- new school detail page
- `apps/web/src/app/(dashboard)/schools/[urn]/breadcrumb.tsx` -- breadcrumb component
- `apps/web/src/components/schools/school-header.tsx` -- school info header
- `apps/web/src/components/schools/inspection-timeline.tsx` -- timeline visualization
- `apps/web/src/components/buyers/ofsted-tab.tsx` -- upgrade to show history
- `apps/web/src/app/api/schools/[urn]/route.ts` -- API for school detail data

**Success criteria:**
- [x] Navigating to `/schools/[urn]` shows a school detail page with full inspection history
- [x] Timeline visualization displays ratings over time with color coding (red=downgrade, green=improvement)
- [x] Each inspection in the timeline links to the corresponding Ofsted report PDF
- [x] School detail page links to the buyer page when buyerId exists
- [x] Buyer Ofsted tab shows inspection history for linked schools (not just current ratings)

---

## Phase 5: AI Report Analysis Column

**Goal:** Users can add an AI column to the schools scanner that reads Ofsted report PDFs and scores "tuition relevance."

**Requirements:** AI-01, AI-02, AI-03, AI-04

**What we build:**
1. Report fetch + text extraction API endpoint: given a school URN, fetch PDF from `files.ofsted.gov.uk`, extract text with `pdf-parse`
2. Integrate with existing AI column scoring: when scoring a schools entity, fetch report text and include in Claude prompt
3. Default "Tuition Relevance" prompt that looks for literacy, numeracy, catch-up, pupil premium, attainment gaps themes
4. Score (0-10) + reasoning returned to scanner grid
5. PDF caching to avoid re-downloading the same report

**Key files to create/modify:**
- `apps/web/src/app/api/schools/[urn]/report/route.ts` -- PDF fetch + text extraction endpoint
- `apps/web/src/lib/ofsted-report.ts` -- PDF download, text extraction, caching logic
- `apps/web/src/app/api/scanners/[id]/score-column/route.ts` -- extend for schools entity type
- `apps/web/src/lib/scoring-engine.ts` -- add schools context builder (include report text)

**Success criteria:**
- [ ] User can add an AI column to a schools scanner and run scoring
- [ ] Scoring fetches the Ofsted report PDF and extracts text for Claude analysis
- [ ] "Tuition Relevance" prompt returns a 0-10 score with reasoning referencing report content
- [ ] Results include specific quotes/themes from the report (literacy, numeracy, catch-up, etc.)
- [ ] Report PDFs are cached to prevent redundant downloads on re-scoring

---

## Phase Summary

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 1 | Inspection History Data Foundation | Full inspection timeline in MongoDB | DATA-01..05 | 3-4 |
| 2 | Schools Scanner Type | Discovery UI with Ofsted filters | SCAN-01..06 | 4-5 |
| 3 | Downgrade Detection & Sorting | Core intelligence logic | DOWN-01..03 | 2-3 |
| 4 | School Detail Page & Timeline | Deep-dive with timeline visualization | DETL-01..05 | 3-4 |
| 5 | AI Report Analysis Column | PDF analysis differentiator | AI-01..04 | 3-4 |

---
*Roadmap created: 2026-02-14*
*Last updated: 2026-02-14 after initial creation*
