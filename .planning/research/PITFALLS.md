# Pitfalls Research: Ofsted Timeline Intelligence

## 1. Post-September 2024 Overall Grade Removal

**Risk:** High
**Phase impact:** Data ingestion, downgrade detection, filtering

Since September 2024, Ofsted no longer assigns an "Overall Effectiveness" grade for state-funded schools. The `overallEffectiveness` field will be NULL for any inspection after this date. This means:

- "Downgrade" cannot be defined as "overall grade went from 2 to 3" for new inspections
- Must compare individual sub-judgement grades instead
- Timeline visualization needs to handle mixed data (old inspections with overall, new without)
- Filters that say "Requires Improvement" need to work on sub-judgements

**Warning signs:** Queries returning 0 results for recent inspections when filtering on overallEffectiveness.

**Prevention:**
- Define "downgrade" as: any sub-judgement grade increased (worse) compared to previous inspection's corresponding sub-judgement
- Compute a synthetic "worst rating" field (max of all sub-judgements) for simplified filtering
- Show sub-judgement breakdown in UI, not just overall
- Test with post-Sep-2024 inspection data specifically

## 2. CSV Column Name Inconsistency Across Years

**Risk:** Medium
**Phase impact:** History ingestion

GOV.UK CSV column names have changed over the years:
- Old: "Achievement", "Quality of teaching", "Overall effectiveness"
- New: "Quality of education", "Behaviour and attitudes", "Overall effectiveness" (then removed)
- Some columns added/removed between years

Different CSV files (2005-2015 consolidated vs yearly files) may use different column names for the same data.

**Warning signs:** Ingestion script silently producing NULL values for fields that should have data.

**Prevention:**
- Map column names per CSV file/era (pre-2019, 2019-2024, post-2024)
- Log unmapped columns during ingestion
- Validate that key fields (URN, inspection date, at least one rating) are present per row
- Test with one file from each era before running full ingestion

## 3. PDF Report Access Failures

**Risk:** Medium
**Phase impact:** AI report analysis

Ofsted report PDFs are hosted at `files.ofsted.gov.uk`. Potential issues:
- Rate limiting on PDF downloads
- Old reports may have moved or been removed
- Some reports are HTML-only (no PDF)
- PDF text extraction may fail on scanned/image-based PDFs (rare for Ofsted)
- `reportUrl` in the CSV may point to GOV.UK page, not direct PDF

**Warning signs:** 403/404 errors fetching PDFs, empty text after extraction.

**Prevention:**
- Cache downloaded PDFs (R2 or local .cache/)
- Implement retry with backoff for failed downloads
- Fallback: if PDF unavailable, score based on available metadata only
- Map from URN to `reports.ofsted.gov.uk/provider/{type}/{URN}` page to discover PDF links
- Store `reportFileId` in inspectionHistory for direct `files.ofsted.gov.uk` access

## 4. Duplicate Inspections in History

**Risk:** Medium
**Phase impact:** History ingestion

When ingesting from multiple CSV files spanning overlapping periods, the same inspection may appear in multiple files. Without deduplication, a school could show the same inspection twice in its timeline.

**Warning signs:** Timeline showing duplicate entries on the same date.

**Prevention:**
- Deduplicate by `inspectionNumber` (unique per inspection in the CSV data)
- If inspectionNumber unavailable, deduplicate by URN + inspectionDate
- Sort inspectionHistory by date descending after merge
- Add a uniqueness check before pushing to the array

## 5. Scanner Type Registration Cascade

**Risk:** Medium
**Phase impact:** Scanner integration

Adding a new scanner type ("schools") touches many files in the existing codebase:
- `models/scanner.ts` -- type union
- `table-columns.ts` -- column definitions
- `glide-columns.ts` -- column conversion
- `cell-content.ts` -- cell rendering
- Scanner page -- filter controls
- Scanner API routes -- query builders
- Sculptor tools -- may reference scanner types

Missing any one of these creates a runtime error or silent failure.

**Warning signs:** TypeScript errors about missing case in switch statements (if exhaustive checks exist), or "unknown scanner type" at runtime.

**Prevention:**
- Search codebase for all references to existing scanner types ("rfps", "meetings", "buyers") before starting
- Create a checklist of every file that needs updating
- Use TypeScript exhaustive switch checks so the compiler catches missing cases

## 6. Downgrade Window Query Performance

**Risk:** Low-Medium
**Phase impact:** Scanner filtering

The primary use case is "show me schools downgraded in the last N months." If we compute this dynamically (comparing current vs previous ratings per query), it's expensive on 22k schools. If we pre-compute `lastDowngradeDate`, the index makes it fast.

**Warning signs:** Scanner page loading slowly (>2s) with downgrade filters.

**Prevention:**
- Pre-compute `lastDowngradeDate`, `ratingDirection` during ingestion
- Index `lastDowngradeDate` in MongoDB
- Avoid runtime comparison of ratings arrays in aggregation pipelines
- Test query performance with `explain()` on the actual collection

## 7. Inspection History Array Size

**Risk:** Low
**Phase impact:** Data model

Most schools have 2-6 inspections over 20 years. But some long-running schools could have 8-10+ inspections. The embedded array approach works fine for this size, but:

**Warning signs:** Document size approaching 16MB MongoDB limit (extremely unlikely with inspection data).

**Prevention:**
- Monitor max array length during ingestion
- Each inspection entry is ~200 bytes, so even 20 inspections = ~4KB -- negligible
- No action needed unless a school somehow has 100+ inspections

## 8. Ofsted Report Card Format Change (November 2025)

**Risk:** Low
**Phase impact:** AI report analysis, timeline

From November 2025, Ofsted is introducing "report cards" with a new format. This may change:
- Report structure (sections, headings)
- Rating categories (new areas like "achievement", "inclusion")
- PDF format/layout

**Warning signs:** AI analysis scoring dropping in quality, reports not matching expected structure.

**Prevention:**
- Keep AI prompts flexible (don't hardcode section names)
- Monitor report structure changes in Ofsted's published guidance
- The AI column approach naturally adapts since prompts can be updated by users

---
*Researched: 2026-02-14*
