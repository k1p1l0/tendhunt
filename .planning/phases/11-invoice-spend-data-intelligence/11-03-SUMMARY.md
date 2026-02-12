---
phase: 11-invoice-spend-data-intelligence
plan: 03
subsystem: normalization, pipeline, aggregation
tags: [papaparse, csv-normalization, column-mapper, date-parser, amount-parser, vendor-normalizer, category-taxonomy, mongodb-aggregation]

# Dependency graph
requires:
  - phase: 11-invoice-spend-data-intelligence
    plan: 01
    provides: "Worker scaffold, stage stubs, DB operations, SpendTransaction/SpendSummary types"
  - phase: 11-invoice-spend-data-intelligence
    plan: 02
    provides: "csvLinks populated on buyer documents"
provides:
  - "Complete CSV normalization library (10 known schemas + AI fallback column mapper)"
  - "Date parser supporting ISO, DD/MM/YYYY, DD-Mon-YY/YYYY formats"
  - "Amount parser handling GBP symbols, parentheses-negative, CR/DR, commas"
  - "Vendor name normalizer (strip suffixes, normalize casing)"
  - "25-category spend taxonomy with keyword matching"
  - "Stage 3: CSV download, parse, normalize, and bulk upsert (capped per buyer)"
  - "Stage 4: MongoDB $facet aggregation for SpendSummary computation"
affects: [11-04, 11-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [hybrid-column-mapping, category-taxonomy, facet-aggregation, transaction-cap]

key-files:
  created:
    - workers/spend-ingest/src/normalization/known-schemas.ts
    - workers/spend-ingest/src/normalization/column-mapper.ts
    - workers/spend-ingest/src/normalization/date-parser.ts
    - workers/spend-ingest/src/normalization/amount-parser.ts
    - workers/spend-ingest/src/normalization/vendor-normalizer.ts
    - workers/spend-ingest/src/normalization/category-taxonomy.ts
  modified:
    - workers/spend-ingest/src/stages/03-download-parse.ts
    - workers/spend-ingest/src/stages/04-aggregate.ts

key-decisions:
  - "10 known schemas cover Devon, Rochdale, Ipswich, Manchester, Eden + 5 generic patterns"
  - "AI column mapping cached in memory by sorted headers hash"
  - "MAX_TRANSACTIONS_PER_BUYER = 5000 to respect MongoDB Atlas free tier limits"
  - "p-limit(2) for buyer-level concurrency; files processed sequentially per buyer"
  - "Stage 4 uses $facet for single-pass multi-metric aggregation"
  - "Column mapping cached per buyer (most councils reuse same CSV format)"

patterns-established:
  - "Hybrid normalization: pattern library first, AI fallback for unknown schemas"
  - "Case-insensitive column field lookup for cross-format compatibility"
  - "Transaction cap per buyer with early termination"
  - "$facet aggregation: totals + byCategory(30) + byVendor(50) + byMonth timeline"

# Metrics
duration: 6min
completed: 2026-02-12
---

# Phase 11 Plan 03: CSV Normalization Library & Stages 3-4 Summary

**Complete CSV normalization pipeline with 10 known schemas + AI fallback column mapper, robust parsers, and MongoDB aggregation for per-buyer spend summaries.**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files created:** 6
- **Files modified:** 2

## Accomplishments
- 10 known UK council CSV column mappings (Devon, Rochdale, Ipswich, Manchester, Eden + 5 generic/NHS/ProClass patterns)
- Hybrid column mapper: tries known schemas first, falls back to Claude Haiku AI for unmapped formats
- Date parser: ISO 8601, DD/MM/YYYY, DD-Mon-YY/YYYY, Mon DD YYYY formats
- Amount parser: parentheses-negative, CR/DR prefix, currency symbols, comma separators
- Vendor normalizer: strips Ltd/Limited/PLC/Inc/LLP suffixes, normalizes casing
- 25-category spend taxonomy with keyword matching
- Stage 3: Downloads CSVs, parses with PapaParse, normalizes via column mapper, bulk-upserts transactions (capped at 5000 per buyer)
- Stage 4: MongoDB $facet aggregation computing category/vendor/monthly breakdowns, upserts SpendSummary

## Files Created
- `workers/spend-ingest/src/normalization/known-schemas.ts` - 10 ColumnMapping objects with detect/map functions
- `workers/spend-ingest/src/normalization/column-mapper.ts` - Hybrid mapper: known schemas + Claude Haiku AI fallback
- `workers/spend-ingest/src/normalization/date-parser.ts` - parseFlexibleDate with 4+ date format groups
- `workers/spend-ingest/src/normalization/amount-parser.ts` - parseAmount handling UK accounting formats
- `workers/spend-ingest/src/normalization/vendor-normalizer.ts` - normalizeVendor for dedup key generation
- `workers/spend-ingest/src/normalization/category-taxonomy.ts` - normalizeCategory to 25 high-level categories

## Files Modified
- `workers/spend-ingest/src/stages/03-download-parse.ts` - Full Stage 3 implementation replacing stub
- `workers/spend-ingest/src/stages/04-aggregate.ts` - Full Stage 4 implementation replacing stub

## Decisions Made
- Content-type check for CSV downloads: accepts text/csv, text/plain, application/csv, application/octet-stream, application/vnd
- CSV files with > 50% parse error rate are skipped
- Column mapping is cached per buyer across multiple CSV files
- Vendor normalization strips 12 common UK company suffixes

## Deviations from Plan
None

## Issues Encountered
None

## Next Phase Readiness
- Complete 4-stage pipeline is now functional: discover -> extract_links -> download_parse -> aggregate
- SpendTransaction and SpendSummary collections will be populated once deployed
- Frontend (Plan 11-04) can read from SpendSummary for charts and SpendTransaction for tables
- No blockers for next plans

## Self-Check: PASSED

TypeScript compilation passes: `cd workers/spend-ingest && npx tsc --noEmit` — no errors.

---
*Phase: 11-invoice-spend-data-intelligence*
*Completed: 2026-02-12*
