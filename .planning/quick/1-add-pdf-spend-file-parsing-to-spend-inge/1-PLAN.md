---
phase: quick-pdf-spend
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/workers/spend-ingest/src/types.ts
  - apps/workers/spend-ingest/wrangler.toml
  - apps/workers/spend-ingest/package.json
  - apps/workers/spend-ingest/src/stages/03-download-parse.ts
  - apps/web/scripts/enrich-buyer.ts
autonomous: true
must_haves:
  truths:
    - "PDF spend files are detected and parsed into SpendTransaction records"
    - "Raw PDFs are stored in R2 for reference with key pattern spend-pdfs/{buyerId}/{filename}"
    - "Extracted PDF text is sent to Claude Haiku to produce structured tabular spend data"
    - "PDF-extracted rows go through the same normalization pipeline as CSV/ODS/XLSX data"
    - "The local enrich-buyer.ts script also handles PDF files"
  artifacts:
    - path: "apps/workers/spend-ingest/src/stages/03-download-parse.ts"
      provides: "PDF detection, text extraction, Claude Haiku parsing, R2 storage"
      contains: "pdf"
    - path: "apps/workers/spend-ingest/src/types.ts"
      provides: "R2Bucket binding in Env interface"
      contains: "R2Bucket"
    - path: "apps/workers/spend-ingest/wrangler.toml"
      provides: "R2 bucket binding configuration"
      contains: "r2_buckets"
    - path: "apps/web/scripts/enrich-buyer.ts"
      provides: "PDF handling in local enrichment script"
      contains: "pdf"
  key_links:
    - from: "apps/workers/spend-ingest/src/stages/03-download-parse.ts"
      to: "Claude Haiku API"
      via: "Anthropic SDK for PDF text -> structured spend data"
      pattern: "anthropic.*messages\\.create"
    - from: "apps/workers/spend-ingest/src/stages/03-download-parse.ts"
      to: "R2 bucket"
      via: "env.DOCS.put() for raw PDF storage"
      pattern: "env\\.DOCS\\.put"
---

<objective>
Add PDF spend file parsing to the spend-ingest Cloudflare Worker pipeline.

Purpose: Many UK public sector buyers publish spending data as PDFs instead of CSV/ODS/XLSX. Currently these files are silently skipped, losing valuable spend intelligence. This adds PDF detection, text extraction, Claude Haiku tabular parsing, and R2 storage.

Output: Updated Stage 3 (download-parse) that handles PDF files end-to-end, plus R2 binding for raw PDF storage.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/workers/spend-ingest/src/stages/03-download-parse.ts
@apps/workers/spend-ingest/src/types.ts
@apps/workers/spend-ingest/wrangler.toml
@apps/workers/spend-ingest/package.json
@apps/workers/spend-ingest/src/normalization/column-mapper.ts
@apps/workers/spend-ingest/CLAUDE.md
@apps/workers/enrichment/wrangler.toml
@apps/web/scripts/enrich-buyer.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add R2 binding and PDF detection to spend-ingest worker</name>
  <files>
    apps/workers/spend-ingest/src/types.ts
    apps/workers/spend-ingest/wrangler.toml
    apps/workers/spend-ingest/package.json
    apps/workers/spend-ingest/src/stages/03-download-parse.ts
  </files>
  <action>
1. **Update `types.ts`** — Add `DOCS: R2Bucket` to the `Env` interface (same pattern as enrichment worker `apps/workers/enrichment/src/types.ts`).

2. **Update `wrangler.toml`** — Add R2 bucket binding matching the enrichment worker's existing bucket:
```toml
[[r2_buckets]]
binding = "DOCS"
bucket_name = "tendhunt-enrichment-docs"
```

3. **Install `unpdf`** — Add `unpdf` to `package.json` dependencies. This is a Cloudflare Workers-compatible PDF text extraction library built on PDF.js. Do NOT use `pdf-parse` (Node.js-only, requires `fs`). Run `cd apps/workers/spend-ingest && pnpm add unpdf`.

4. **Update `detectFileFormat()`** in `03-download-parse.ts` — Add `"pdf"` to the `FileFormat` union type. Add detection:
   - Content-type: `application/pdf`
   - URL extension: `.pdf`

5. **Add `parsePdfWithClaude()` function** in `03-download-parse.ts` — This function:
   - Takes `pdfBuffer: ArrayBuffer`, `env: Env`, `buyerId: string`, `csvUrl: string`
   - Uses `unpdf`'s `extractText()` to get raw text from the PDF buffer (import `{ extractText } from "unpdf"`)
   - If extracted text is too short (< 50 chars), return empty result (scanned image PDFs can't be parsed)
   - Calls Claude Haiku (`claude-haiku-4-5-20251001` via `@anthropic-ai/sdk`) with a prompt that:
     - Provides the extracted PDF text (truncated to 15000 chars)
     - Asks Claude to identify tabular spending data and return it as a JSON array of objects
     - Each object must have: `date`, `amount`, `vendor`, and optionally `category`, `department`, `reference`
     - System prompt: "You are extracting structured spending transaction data from a UK public sector PDF document. The PDF contains tabular spending data (payments over 25k or 500). Extract each row as a JSON object. If the PDF does not contain tabular spending data, return an empty array []."
   - Parses Claude's JSON response (use the same `match(/\[[\s\S]*\]/)` pattern used elsewhere in the codebase)
   - Returns `{ data: Record<string, string>[]; headers: string[] }` matching the same shape as CSV/spreadsheet parsing, so downstream column mapping and normalization work unchanged
   - For headers, derive them from the first parsed object's keys

6. **Add `storePdfInR2()` function** — Takes `env: Env`, `buyerId: string`, `pdfUrl: string`, `buffer: ArrayBuffer`. Stores the PDF in R2 with key `spend-pdfs/{buyerId}/{urlHash}.pdf` where urlHash is a simple hash of the URL (use a basic string hash, NOT crypto). Returns the R2 key string.

7. **Update the main download loop in `downloadAndParseCsvs()`** — In the format detection block (around line 184-231), add a `pdf` branch:
   - When `format === "pdf"`:
     - Read response as `ArrayBuffer`
     - Call `storePdfInR2(env, buyer._id!.toString(), csvUrl, buffer)` to store raw PDF
     - Call `parsePdfWithClaude(buffer, env, buyer._id!.toString(), csvUrl)` to extract structured data
     - Set `parsedData` and `parsedHeaders` from the result
     - Log: `Parsed PDF file: ${parsedData.length} rows extracted via Claude`
   - The extracted data then flows through the existing column mapping and normalization pipeline unchanged

8. **Important edge cases to handle:**
   - PDFs with no extractable text (scanned images) — return empty, skip gracefully
   - Very large PDFs — cap text extraction at 15000 chars for Claude prompt
   - Claude returns empty array — skip file, continue to next
   - R2 put failure — log warning but don't fail the whole buyer processing
  </action>
  <verify>
    Run `cd apps/workers/spend-ingest && pnpm typecheck` — must pass with no errors.
    Verify `detectFileFormat("application/pdf", "https://example.com/spend.pdf")` would return `"pdf"`.
    Verify R2Bucket is in the Env interface.
    Verify wrangler.toml has the r2_buckets section.
  </verify>
  <done>
    Stage 3 detects PDF format, extracts text via unpdf, sends to Claude Haiku for structured parsing, stores raw PDF in R2, and feeds extracted rows through the existing normalization pipeline. TypeScript compiles cleanly.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add PDF handling to local enrich-buyer.ts script</name>
  <files>
    apps/web/scripts/enrich-buyer.ts
  </files>
  <action>
1. **Add `pdf-parse` to apps/web** if not already installed — The local script runs in Node.js (not Workers), so `pdf-parse` works fine here. Check if it's already a dependency of `apps/web`. If not, run `cd apps/web && pnpm add pdf-parse && pnpm add -D @types/pdf-parse`.

2. **Update `detectFileFormat()`** in `enrich-buyer.ts` (around line 739) — Add `"pdf"` to the `FileFormat` union. Add detection for `application/pdf` content-type and `.pdf` URL extension.

3. **Add `parsePdfText()` function** — Uses `pdf-parse` (Node.js) to extract text from a Buffer. Returns the raw text string.

4. **Add `parsePdfWithClaude()` function** — Same Claude Haiku prompt as the worker version:
   - Takes raw PDF text + anthropic client
   - Sends to `claude-haiku-4-5-20251001` asking for structured JSON array of spend transactions
   - Parses response into `{ data: Record<string, string>[]; fields: string[] }` (matching the local script's existing shape)

5. **Update the download/parse loop in `runSpendIngest()`** (around line 983-1005) — Add a `pdf` branch:
   - When `format === "pdf"`:
     - Read response as `arrayBuffer()`, convert to `Buffer`
     - Extract text via `pdf-parse`
     - If text too short (< 50 chars), skip
     - Call Claude Haiku to parse tabular data
     - Set `parsedData` and `headers` from result
     - Log the extraction
   - Data then flows through existing column mapping + normalization

6. **No R2 storage in local script** — The local script doesn't have R2 access. Just parse and ingest.
  </action>
  <verify>
    Run `cd apps/web && npx tsc --noEmit --skipLibCheck` — verify no type errors in the enrich-buyer.ts script.
    Verify `detectFileFormat("application/pdf", "https://example.com/spend.pdf")` returns `"pdf"` in the local script's version.
  </verify>
  <done>
    The local enrich-buyer.ts script detects PDF files, extracts text via pdf-parse, sends to Claude Haiku for structured parsing, and feeds extracted rows through the existing normalization pipeline.
  </done>
</task>

</tasks>

<verification>
1. `cd apps/workers/spend-ingest && pnpm typecheck` passes
2. `cd apps/web && pnpm typecheck` passes (or at minimum `npx tsc --noEmit --skipLibCheck` for the script)
3. `detectFileFormat("application/pdf", "https://example.com/spend.pdf")` returns `"pdf"` in both the worker and local script
4. The worker's Env interface includes `DOCS: R2Bucket`
5. `wrangler.toml` has `[[r2_buckets]]` binding for `tendhunt-enrichment-docs`
6. The `unpdf` package is in worker's `package.json`, `pdf-parse` is in web's `package.json`
7. PDF branch in download loop feeds into the same column mapping pipeline as CSV/ODS/XLSX
</verification>

<success_criteria>
- PDF files detected by content-type and URL extension in both worker and local script
- Worker: unpdf extracts text, Claude Haiku parses tabular data, raw PDF stored in R2
- Local: pdf-parse extracts text, Claude Haiku parses tabular data
- Extracted PDF data flows through existing normalization (column mapper, date parser, amount parser, vendor normalizer)
- No regressions in CSV/ODS/XLSX handling
- TypeScript compiles cleanly in both packages
</success_criteria>

<output>
After completion, create `.planning/quick/1-add-pdf-spend-file-parsing-to-spend-inge/1-SUMMARY.md`
</output>
