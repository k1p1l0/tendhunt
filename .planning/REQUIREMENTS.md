# Requirements: Ofsted Timeline Intelligence

**Defined:** 2026-02-14
**Core Value:** Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services.

## v1 Requirements

### Data Ingestion

- [x] **DATA-01**: System ingests historical "all inspections" CSVs from GOV.UK covering 2015-present, building a per-school inspection timeline
- [x] **DATA-02**: Each school record stores an inspectionHistory array with date, grades, inspection type, and report URL for every past inspection
- [x] **DATA-03**: System pre-computes lastDowngradeDate, ratingDirection (improved/downgraded/unchanged), and downgradeType for each school during ingestion
- [x] **DATA-04**: Ingestion handles CSV column name differences across eras (pre-2019, 2019-2024, post-2024)
- [x] **DATA-05**: Ingestion deduplicates inspections by inspectionNumber to prevent duplicate timeline entries from overlapping CSV files

### Scanner

- [x] **SCAN-01**: User can create a scanner of type "schools" that queries the ofstedschools collection
- [x] **SCAN-02**: Schools scanner displays columns: School name, Overall rating, Quality of Education, Inspection Date, Previous Rating, Rating Change, Region, School Phase, Pupils, Local Authority
- [x] **SCAN-03**: User can filter schools by "downgraded in last N months" (1m, 3m, 6m, 1y, any) as the primary filter
- [x] **SCAN-04**: User can filter schools by current rating (Outstanding, Good, Requires Improvement, Inadequate), region, local authority, and school phase
- [x] **SCAN-05**: User can search schools by name or keyword
- [x] **SCAN-06**: Schools scanner supports AI columns following the existing scanner AI column pattern (add column, set prompt, run scoring)

### Downgrade Detection

- [ ] **DOWN-01**: System detects downgrades by comparing current sub-judgement grades against the previous inspection's corresponding grades
- [ ] **DOWN-02**: Downgrade detection works for post-September-2024 inspections where overall effectiveness is NULL, using sub-judgement grades instead
- [ ] **DOWN-03**: Scanner results can be sorted by downgrade recency (most recent downgrades first)

### Detail Page

- [ ] **DETL-01**: User can view a school detail page at /schools/[urn] showing full inspection history
- [ ] **DETL-02**: School detail page shows a timeline visualization of rating changes over time, color-coded by direction (red=downgrade, green=improvement, amber=unchanged)
- [ ] **DETL-03**: School detail page links to the Ofsted report PDF for each inspection
- [ ] **DETL-04**: School detail page links to the associated buyer page when the school has a buyerId
- [ ] **DETL-05**: Buyer detail page Ofsted tab shows inspection history for linked schools, not just current ratings

### AI Report Analysis

- [ ] **AI-01**: User can add an AI column to the schools scanner that analyzes Ofsted report PDFs
- [ ] **AI-02**: AI scoring fetches the school's Ofsted report PDF, extracts text, and sends it to Claude for analysis
- [ ] **AI-03**: Default "Tuition Relevance" prompt scores 0-10 how likely a school needs tuition services based on report content (literacy, numeracy, catch-up, pupil premium, attainment gaps)
- [ ] **AI-04**: AI analysis results include reasoning explaining what in the report suggests tuition need

## v2 Requirements

### Extended Features

- **EXT-01**: Sculptor can analyze a specific school's Ofsted report on demand via chat
- **EXT-02**: MAT-level aggregation showing downgrade patterns across a Multi-Academy Trust
- **EXT-03**: Ofsted downgrade notification alerts (email/push when a school in a user's saved scanner gets downgraded)
- **EXT-04**: Support for FE colleges and other Ofsted-inspected entity types beyond schools

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time Ofsted data feed | Ofsted publishes monthly; CSV refresh is sufficient |
| Automated bulk report analysis during enrichment | Burns API credits on 22k+ reports that may never be viewed |
| Companies House integration for MAT finances | Separate workstream, different data source |
| Parent-facing school rating display | TendHunt is B2B supplier intelligence, not a parent tool |
| School comparison tool | Out of scope for sales intelligence use case |
| Ofsted appeal/response tracking | Different dataset, different audience |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Done |
| DATA-02 | Phase 1 | Done |
| DATA-03 | Phase 1 | Done |
| DATA-04 | Phase 1 | Done |
| DATA-05 | Phase 1 | Done |
| SCAN-01 | Phase 2 | Done |
| SCAN-02 | Phase 2 | Done |
| SCAN-03 | Phase 2 | Done |
| SCAN-04 | Phase 2 | Done |
| SCAN-05 | Phase 2 | Done |
| SCAN-06 | Phase 2 | Done |
| DOWN-01 | Phase 3 | Pending |
| DOWN-02 | Phase 3 | Pending |
| DOWN-03 | Phase 3 | Pending |
| DETL-01 | Phase 4 | Pending |
| DETL-02 | Phase 4 | Pending |
| DETL-03 | Phase 4 | Pending |
| DETL-04 | Phase 4 | Pending |
| DETL-05 | Phase 4 | Pending |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| AI-03 | Phase 5 | Pending |
| AI-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after initial definition*
