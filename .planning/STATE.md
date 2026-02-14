# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services.
**Current focus:** Phase 1 -- Inspection History Data Foundation

## Current Phase

**Phase 1: Inspection History Data Foundation**
- Status: Complete
- Goal: Ingest full historical Ofsted inspection data so every school has a complete inspection timeline in MongoDB
- Requirements: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

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
- [ ] Not started

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

## Blockers

None currently.

---
*Last updated: 2026-02-14 after Phase 1 completion*
