# Research Summary: Ofsted Timeline Intelligence

## Stack

**No new major dependencies.** This is a brownfield feature addition using the existing TendHunt stack (Next.js, MongoDB, Glide Data Grid, Claude API). The only additions are:
- `pdf-parse` for Ofsted report text extraction (already available in the project)
- `csv-parse` for historical CSV parsing (already in use by existing ingestion script)

## Key Data Sources

| Source | What | Format | Rows per School |
|--------|------|--------|-----------------|
| Monthly Management Info CSV | Latest inspection snapshot | CSV, ~22k rows | 1 (latest only) |
| "All Inspections" Year-to-Date CSVs | Every inspection in a period | CSV, multiple files | Multiple |
| Historical consolidated CSVs (2005-2015, 2015-2019) | All older inspections | CSV | Multiple |
| `files.ofsted.gov.uk` | PDF reports | PDF, 5-20 pages | N/A |

**Critical insight:** The "All Inspections" CSVs are the key data source for building the grading timeline. The monthly CSV (already ingested) only shows the latest + one previous inspection. The historical CSVs contain every inspection a school has ever had.

## Table Stakes

1. **Inspection history ingestion** -- download and parse historical CSVs, build per-school timeline
2. **Schools scanner type** -- new scanner with Ofsted-specific columns and filters
3. **Downgrade detection & filtering** -- "downgraded in last N months" as primary filter
4. **Current rating filters** -- filter by grade, region, school phase, local authority
5. **School detail page** -- full inspection history with links to reports

## Differentiators

1. **AI report analysis column** (PRIMARY) -- Claude reads Ofsted report PDF, scores "tuition relevance"
2. **Timeline visualization** -- visual rating history on detail pages
3. **Downgrade recency signal** -- "Downgraded 2 months ago" badge
4. **MAT-level aggregation** -- downgrade patterns across Multi-Academy Trusts

## Critical Pitfalls

1. **Post-Sep-2024 grade removal:** Overall Effectiveness no longer assigned. Must use sub-judgements for downgrade detection and filtering. All queries and UI must handle NULL overall grades.
2. **CSV column name changes across years:** Column names differ between CSV eras (pre-2019, 2019-2024, post-2024). Ingestion script must map columns per era.
3. **Scanner type cascade:** Adding "schools" scanner type touches 10+ files. Must systematically update all switch statements, column definitions, and API routes.

## Architecture Decision

**Embedded array** for inspection history (add `inspectionHistory[]` to OfstedSchool model). Pre-compute `lastDowngradeDate` and `ratingDirection` during ingestion for fast filtering. Index `lastDowngradeDate` for the primary "downgraded in last N months" query.

## Build Order Recommendation

1. Schema + history ingestion (data foundation)
2. Scanner type + columns + filters (discovery UI)
3. Downgrade detection + filtering (core intelligence)
4. Detail page + timeline (deep dive)
5. AI report analysis column (differentiator)

---
*Synthesized: 2026-02-14*
