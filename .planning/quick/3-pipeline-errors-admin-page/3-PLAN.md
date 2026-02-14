---
phase: quick
plan: 3
type: execute
---

# Pipeline Errors Admin Page

## Context

Workers (enrichment, spend-ingest, board-minutes) silently fail for some buyers — Apify 403s, ModernGov unreachable, Google Sheets can't parse, etc. Currently these are only visible in Cloudflare worker logs (wrangler tail). Need a persistent error log in the admin panel.

## Plan

### 1. MongoDB Collection: `pipelineErrors`

```
{
  worker: "enrichment" | "spend-ingest" | "board-minutes" | "data-sync",
  stage: string (e.g. "website_discovery", "moderngov", "extract_links"),
  buyerId: ObjectId,
  buyerName: string,
  errorType: "api_403" | "timeout" | "parse_error" | "unreachable" | "no_data" | "other",
  message: string,
  url?: string (the URL that failed),
  createdAt: Date,
  resolvedAt?: Date (null = unresolved)
}

Index: { worker: 1, createdAt: -1 }
Index: { buyerId: 1 }
Index: { errorType: 1 }
```

### 2. Worker Error Reporting

Add `reportPipelineError(db, { worker, stage, buyerId, buyerName, errorType, message, url })` utility function. Call it from each stage's catch block instead of just console.warn.

Key places to instrument:
- `enrichment/stages/01b-website-discovery.ts` — Apify 403
- `enrichment/stages/01c-logo-linkedin.ts` — Apify 403, logo.dev failures
- `enrichment/stages/03-moderngov.ts` — ModernGov unreachable
- `enrichment/stages/04-scrape.ts` — HTTP 403/404
- `enrichment/stages/05-personnel.ts` — Claude API errors
- `spend-ingest/stages/01-discover.ts` — no transparency page found
- `spend-ingest/stages/02-extract-links.ts` — no CSV links found, Google Sheets parse fail
- `spend-ingest/stages/03-download-parse.ts` — CSV parse errors

### 3. Admin API + Page

- GET `/api/pipeline-errors?worker=&stage=&errorType=&page=&pageSize=`
- New admin page at `/pipeline-errors` with:
  - Filter by worker, stage, error type
  - Table: buyer name (linked), worker, stage, error type, message, date
  - "Resolve" button to mark as resolved
  - Count badges per worker in the sidebar

### 4. Sidebar Nav Update

Add "Pipeline Errors" nav item with error count badge (unresolved count).
