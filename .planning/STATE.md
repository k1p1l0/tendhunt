# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services.
**Current focus:** Phase 1 -- Inspection History Data Foundation

## Current Phase

**Phase 1: Inspection History Data Foundation**
- Status: Not Started
- Goal: Ingest full historical Ofsted inspection data so every school has a complete inspection timeline in MongoDB
- Requirements: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

## Progress

### Phase 1: Inspection History Data Foundation
- [ ] Extend OfstedSchool model with inspectionHistory[] and computed fields
- [ ] Create ingest-ofsted-history.ts script
- [ ] Download and parse historical CSVs (2005-2015, 2015-2019, yearly)
- [ ] Map CSV column names across eras
- [ ] Deduplicate inspections by inspectionNumber
- [ ] Compute downgrade detection (lastDowngradeDate, ratingDirection)
- [ ] Index lastDowngradeDate

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
- Existing OfstedSchool model has current + one previous rating only
- ~22,000 schools already ingested from monthly management info CSV
- Historical "all inspections" CSVs available on GOV.UK with multiple rows per school
- Post-Sep-2024: Ofsted removed overall effectiveness grade; must use sub-judgements
- Do NOT run `bun run lint` -- memory exhaustion on this machine

## Blockers

None currently.

---
*Last updated: 2026-02-14 after project initialization*
