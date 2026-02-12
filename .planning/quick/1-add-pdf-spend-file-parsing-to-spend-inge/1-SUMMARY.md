---
phase: quick-pdf-spend
plan: 01
subsystem: data-pipeline
tags: [pdf, unpdf, claude-haiku, r2, spend-ingest, cloudflare-workers]

# Dependency graph
requires:
  - phase: 11-invoice-spend-data-intelligence
    provides: spend-ingest worker pipeline (stages 1-4)
provides:
  - PDF file format detection in spend-ingest worker and local script
  - Claude Haiku tabular data extraction from PDF text
  - R2 storage for raw spend PDF files
  - PDF-to-normalization pipeline integration
affects: [spend-ingest, enrich-buyer, buyer-intelligence]

# Tech tracking
tech-stack:
  added: [unpdf]
  patterns: [pdf-text-extraction-then-llm-parsing, r2-raw-document-storage]

key-files:
  created: []
  modified:
    - apps/workers/spend-ingest/src/stages/03-download-parse.ts
    - apps/workers/spend-ingest/src/types.ts
    - apps/workers/spend-ingest/wrangler.toml
    - apps/workers/spend-ingest/package.json
    - apps/web/scripts/enrich-buyer.ts

key-decisions:
  - "unpdf for Workers (not pdf-parse which requires Node.js fs); pdf-parse for local script"
  - "Claude Haiku parses extracted PDF text into structured JSON array of spend transactions"
  - "R2 storage key pattern: spend-pdfs/{buyerId}/{urlHash}.pdf with simple string hash"
  - "PDF text capped at 15000 chars for Claude prompt to stay within token budget"
  - "Scanned image PDFs gracefully skipped when extracted text < 50 chars"

patterns-established:
  - "PDF-to-LLM pattern: extract text first, then send to Claude for structured parsing"
  - "R2 storage with non-blocking put: log warning on failure, don't break pipeline"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Quick Task 1: Add PDF Spend File Parsing Summary

**PDF spend file detection, text extraction (unpdf/pdf-parse), Claude Haiku tabular parsing, and R2 raw storage for the spend-ingest pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T21:54:17Z
- **Completed:** 2026-02-12T21:57:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PDF files now detected by content-type (`application/pdf`) and URL extension (`.pdf`) in both worker and local script
- Worker: unpdf extracts text, Claude Haiku parses tabular data, raw PDF stored in R2 at `spend-pdfs/{buyerId}/{hash}.pdf`
- Local: pdf-parse v2 extracts text, Claude Haiku parses tabular data
- Extracted PDF rows flow through existing normalization pipeline (column mapper, date parser, amount parser, vendor normalizer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add R2 binding and PDF detection to spend-ingest worker** - `d74b1af` (feat)
2. **Task 2: Add PDF handling to local enrich-buyer.ts script** - `eb85b26` (feat)

## Files Created/Modified
- `apps/workers/spend-ingest/src/stages/03-download-parse.ts` - PDF branch in download loop, parsePdfWithClaude, storePdfInR2, simpleHash
- `apps/workers/spend-ingest/src/types.ts` - R2Bucket binding added to Env interface
- `apps/workers/spend-ingest/wrangler.toml` - R2 bucket binding for tendhunt-enrichment-docs
- `apps/workers/spend-ingest/package.json` - Added unpdf dependency
- `apps/web/scripts/enrich-buyer.ts` - PDF detection, parsePdfText, parsePdfWithClaude, PDF branch in download loop

## Decisions Made
- Used `unpdf` for Cloudflare Workers (Workers-compatible, built on PDF.js) and `pdf-parse` v2 for local Node.js script (already installed, class API)
- R2 stores raw PDFs for audit/reference using shared `tendhunt-enrichment-docs` bucket (same as enrichment worker)
- Simple string hash for R2 key generation (no crypto needed for non-security filename hashing)
- 15000 char text cap prevents oversized Claude prompts while capturing enough tabular data
- Scanned image PDFs (< 50 chars extracted) gracefully skipped

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pdf-parse v2 TextResult return type**
- **Found during:** Task 2 (enrich-buyer.ts PDF handling)
- **Issue:** `getText()` returns `TextResult` class (not `string`), plan assumed string return
- **Fix:** Access `.text` property on the `TextResult` object
- **Files modified:** `apps/web/scripts/enrich-buyer.ts`
- **Verification:** TypeScript compiles cleanly
- **Committed in:** eb85b26 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type adjustment for pdf-parse v2 API. No scope creep.

## Issues Encountered
None

## User Setup Required
None - R2 bucket `tendhunt-enrichment-docs` already exists from enrichment worker. No new secrets needed.

## Next Phase Readiness
- PDF spend files will be parsed on next worker invocation (weekly cron Monday 3AM UTC)
- Local enrich-buyer.ts script ready for testing with PDF-serving buyers
- No regressions in CSV/ODS/XLSX handling (format detection is additive)

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (d74b1af, eb85b26) verified in git log.

---
*Plan: quick-1*
*Completed: 2026-02-12*
