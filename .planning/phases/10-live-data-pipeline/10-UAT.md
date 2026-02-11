---
status: complete
phase: 10-live-data-pipeline
source: 10-01-SUMMARY.md, 10-02-SUMMARY.md
started: 2026-02-11T19:15:00Z
updated: 2026-02-11T19:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. TypeScript Compilation
expected: `cd workers/data-sync && npx tsc --noEmit` completes with zero errors
result: pass

### 2. Wrangler Build
expected: `cd workers/data-sync && npx wrangler deploy --dry-run --outdir dist` bundles successfully
result: pass
note: 1855 KiB / 240 KiB gzipped, only benign whatwg-url import warning

### 3. Set MONGODB_URI Secret
expected: `wrangler secret put MONGODB_URI` confirms "Success"
result: pass
note: Auto-created Worker placeholder on first secret set

### 4. Deploy Worker
expected: Worker deploys with cron trigger `0 * * * *`
result: pass
note: Deployed to https://tendhunt-data-sync.kozak-74d.workers.dev, schedule confirmed

### 5. Trigger First Sync Run
expected: Sync handler runs, logs show FaT and CF processing with fetched counts
result: pass
note: Initial deploy had API parameter bug (stage vs stages). Fixed and redeployed. Test script verified 200 FaT + 200 CF items with 0 errors.

### 6. Verify SyncJobs in MongoDB
expected: syncJobs collection has 2 documents with status, cursor, totalFetched
result: pass
note: FaT job totalFetched=1000 (error status from initial bug, cursor saved for resume). CF job totalFetched=200, status=backfilling, cursor saved.

### 7. Verify Contracts Ingested
expected: New contracts in contracts collection with valid fields
result: pass
note: FaT contracts with title, buyerName (Highland Council, University of Glasgow, Nottinghamshire CC), sector, status. CF contracts with ONS, Fylde Borough Council, ULTH NHS Trust.

### 8. Verify Buyers Auto-Extracted
expected: New buyer records with orgId, name, contractCount > 0
result: pass
note: Top buyers: MoD (498), NHS England (487), DES (456), Network Rail (456), HMRC (423). Auto-extracted with $setOnInsert non-destructive upsert.

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Fixes Applied During Testing

### Fix 1: FaT API parameter name `stage` → `stages`
- **File:** workers/data-sync/src/api-clients/fat-client.ts
- **Issue:** FaT API changed parameter from `stage` (singular) to `stages` (plural). API returns 400 with message "Request parameter 'stage' is not recognised, allowed parameters are: stages, limit, cursor, updatedFrom, updatedTo"
- **Fix:** Changed `&stage=tender` to `&stages=tender` and `&stage=award` to `&stages=award`

### Fix 2: CF API base URL path
- **File:** workers/data-sync/src/api-clients/cf-client.ts
- **Issue:** Base URL was `/Published/OCDS/Search` (404). Correct path is `/Published/Notices/OCDS/Search`
- **Fix:** Updated CF_BASE constant

### Fix 3: CF pagination uses links.next full URLs
- **File:** workers/data-sync/src/api-clients/cf-client.ts
- **Issue:** CF client expected bare cursor tokens. Actual API returns `links.next` with full URLs (same pattern as FaT).
- **Fix:** Changed cursor handling to follow full URL from `data.links?.next` instead of bare token
