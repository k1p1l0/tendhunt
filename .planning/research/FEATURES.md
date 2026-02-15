# Features Research: Ofsted Timeline Intelligence

## Table Stakes

These features are expected by users looking for Ofsted-based sales intelligence.

### 1. Downgrade Detection & Filtering
- Detect when a school's rating dropped between inspections
- Filter by recency: last month, last 3 months, last 6 months, last year
- Filter by severity: any downgrade, downgrade to RI, downgrade to Inadequate
- **Complexity:** Medium -- requires comparing current vs previous ratings per school
- **Dependency:** Inspection history data (multiple inspections per school)

### 2. Current Rating Filters
- Filter by current overall effectiveness (1-4)
- Filter by individual sub-judgement grades (quality of education, behaviour, etc.)
- Filter by region, local authority, school phase (primary/secondary)
- **Complexity:** Low -- data already in OfstedSchool model
- **Dependency:** None (data exists)

### 3. School List / Scanner
- Grid view of schools with key columns: name, rating, inspection date, region, school type
- Pagination, sorting, search
- Matches existing TendHunt scanner pattern
- **Complexity:** Medium -- new scanner type, reuses existing grid infrastructure
- **Dependency:** Scanner system (already built)

### 4. School Detail Page
- Full inspection history with ratings over time
- Current + all previous ratings shown
- Links to Ofsted report PDFs
- Integration with buyer page (if school is linked to a buyer org)
- **Complexity:** Medium
- **Dependency:** Inspection history data

### 5. Inspection History Ingestion
- Download and parse historical "all inspections" CSVs from GOV.UK
- Build per-school timeline from multiple CSV files covering 2005-present
- Store as embedded array or separate collection
- **Complexity:** Medium-High -- multiple CSV files, data normalization
- **Dependency:** Data access to GOV.UK CSVs

## Differentiators

These features set TendHunt apart from manual Ofsted data browsing.

### 6. AI Report Analysis Column (PRIMARY DIFFERENTIATOR)
- AI column in scanner grid scores "Tuition Relevance" from Ofsted report PDF
- Claude reads the report text and assesses: does this school need tuition services?
- Scores 0-10 with reasoning explaining what in the report suggests tuition need
- Looks for keywords/themes: literacy, numeracy, catch-up, pupil premium, disadvantaged pupils, attainment gaps
- **Complexity:** High -- PDF download, text extraction, Claude API call per school
- **Dependency:** PDF access, existing AI column infrastructure

### 7. Timeline Visualization
- Visual timeline showing rating changes over time for a school
- Color-coded: green (improvement), red (downgrade), amber (no change)
- Highlight the most recent change prominently
- Could be: inline in scanner grid (mini chart) or on detail page (full timeline)
- **Complexity:** Medium -- custom rendering
- **Dependency:** Inspection history data

### 8. Downgrade Recency Signal
- "Downgraded 2 months ago" badge on school cards
- Priority sorting: most recent downgrades first
- Signal type in the existing signals system
- **Complexity:** Low-Medium
- **Dependency:** Downgrade detection (#1)

### 9. MAT-Level Aggregation
- Show downgrade patterns across a Multi-Academy Trust
- "3 of 12 schools in this MAT were downgraded in the last 6 months"
- Useful for targeting MAT central teams
- **Complexity:** Medium -- aggregation query across schools by matUid
- **Dependency:** MAT data (already in OfstedSchool model)

## Anti-Features (Do NOT Build)

| Feature | Why Not |
|---------|---------|
| Real-time Ofsted notification feed | Ofsted publishes monthly; real-time is misleading |
| Automated bulk report analysis | Burns API credits on 22k+ reports; on-demand only |
| School comparison tool | Out of scope for sales intelligence use case |
| Ofsted appeal/response tracking | Different dataset, different audience |
| Teacher recruitment signals from reports | Scope creep -- stick to tuition relevance |
| Parent-facing school rating display | TendHunt is B2B supplier tool, not parent tool |

## Feature Dependencies

```
Inspection History Ingestion (#5)
  --> Downgrade Detection (#1)
    --> Downgrade Recency Signal (#8)
  --> Timeline Visualization (#7)
  --> School Detail Page (#4)

Current Rating Filters (#2) [no dependency]

School List/Scanner (#3)
  --> AI Report Analysis Column (#6)

MAT Aggregation (#9) [depends on #1 + existing data]
```

## Priority Order (for roadmap)

1. **Inspection history ingestion** -- foundation for everything
2. **Schools scanner + current rating filters** -- immediate user value
3. **Downgrade detection & filtering** -- the core sales intelligence
4. **School detail page with history** -- deep-dive after scanner discovery
5. **Timeline visualization** -- visual enhancement of history
6. **AI report analysis column** -- the differentiator
7. **Downgrade recency signal** -- refinement
8. **MAT aggregation** -- power user feature

---
*Researched: 2026-02-14*
