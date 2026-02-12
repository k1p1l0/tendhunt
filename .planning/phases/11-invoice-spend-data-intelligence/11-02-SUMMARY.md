---
phase: 11-invoice-spend-data-intelligence
plan: 02
subsystem: pipeline, ai
tags: [claude-haiku, transparency-pages, csv-discovery, rate-limiter, html-scraping]

# Dependency graph
requires:
  - phase: 11-invoice-spend-data-intelligence
    plan: 01
    provides: "Worker scaffold, stage stubs, DB operations, rate limiter"
provides:
  - "Stage 1: AI-assisted transparency page discovery on buyer websites"
  - "Stage 2: CSV/Excel download link extraction from transparency pages"
  - "DB queries: getBuyerBatchForDiscovery, getBuyerBatchForLinkExtraction"
  - "DB updates: updateBuyerTransparencyInfo, updateBuyerCsvLinks"
affects: [11-03, 11-04, 11-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [html-strip-regex, claude-haiku-json-extraction, two-pass-link-extraction]

key-files:
  created: []
  modified:
    - workers/spend-ingest/src/stages/01-discover.ts
    - workers/spend-ingest/src/stages/02-extract-links.ts
    - workers/spend-ingest/src/db/buyers.ts
    - workers/spend-ingest/src/types.ts

key-decisions:
  - "Stage 1 uses Claude Haiku with 12000-char HTML limit and JSON-only output"
  - "Stage 2 uses two-pass extraction: regex first, Claude Haiku fallback if regex finds < 3 links"
  - "Buyers with fetch failures are marked transparencyPageUrl='none' to skip in future runs"
  - "Claude API errors do NOT mark buyer as 'none' — retryable on next run"
  - "p-limit(3) for concurrent processing within batches"

patterns-established:
  - "HTML stripping: remove script/style/noscript tags, keep anchor tags for link discovery"
  - "Two-pass link extraction: fast regex + AI fallback for completeness"
  - "URL normalization via new URL(href, baseUrl) for relative URL resolution"

# Metrics
duration: 6min
completed: 2026-02-12
---

# Phase 11 Plan 02: Transparency Page Discovery & CSV Link Extraction Summary

**Stage 1 discovers transparency/spending pages via Claude Haiku analysis of buyer websites. Stage 2 extracts CSV download links via regex + AI fallback.**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Stage 1 (discover): Fetches buyer homepages, strips HTML, sends to Claude Haiku for transparency page identification. Stores transparencyPageUrl and initial csvLinks on buyer documents.
- Stage 2 (extract_links): Two-pass extraction — regex finds href attributes ending in .csv/.xls/.xlsx, Claude Haiku fallback for pages with < 3 regex-found links. Merges with Stage 1 links, deduplicates, filters valid URLs.
- Added 4 new DB query functions for stage-specific buyer batching (discovery, link extraction, download, aggregation)
- Added spendDataIngested field to BuyerDoc type

## Files Modified
- `workers/spend-ingest/src/stages/01-discover.ts` - Full Stage 1 implementation replacing stub
- `workers/spend-ingest/src/stages/02-extract-links.ts` - Full Stage 2 implementation replacing stub
- `workers/spend-ingest/src/db/buyers.ts` - Added getBuyerBatchForDiscovery, getBuyerBatchForLinkExtraction, getBuyerBatchForDownload, getBuyerBatchForAggregation, updateBuyerTransparencyInfo, updateBuyerCsvLinks
- `workers/spend-ingest/src/types.ts` - Added spendDataIngested field to BuyerDoc

## Decisions Made
- HTML content capped at 12000 chars for Stage 1 (homepage) and 15000 chars for Stage 2 (transparency page)
- 10s AbortController timeout for website fetches
- Regex pattern matches .csv, .xls, .xlsx extensions plus download/export URL patterns
- URL filtering in Stage 2 keeps links matching file extensions OR containing download/export in path

## Deviations from Plan
None

## Issues Encountered
None

## Next Phase Readiness
- Stages 1 and 2 populate transparencyPageUrl and csvLinks on buyer documents
- Stage 3 (Plan 11-03) can now consume csvLinks for download and parsing
- No blockers for next plan

## Self-Check: PASSED

TypeScript compilation passes: `cd workers/spend-ingest && npx tsc --noEmit` — no errors.

---
*Phase: 11-invoice-spend-data-intelligence*
*Completed: 2026-02-12*
