# Spend Ingest Worker

Cloudflare Worker that ingests UK public sector transparency spending data (over £25k/£500 reports) into MongoDB. Weekly cron (Monday 3AM UTC), 200 buyers per invocation, cursor-based resume.

**Secrets**: `MONGODB_URI`, `ANTHROPIC_API_KEY` (set via `wrangler secret put`)

## 4-Stage Pipeline

| Stage | File | What it does |
|-------|------|-------------|
| 1. `discover` | `stages/01-discover.ts` | Find transparency/spending pages on buyer websites. **Three-tier probing**: (1) GOV.UK dept-specific publication URLs via `GOVUK_DEPT_SLUG_MAP`, (2) orgType pattern paths via `getPatternsForOrgType`, (3) Claude Haiku AI fallback on homepage HTML. |
| 2. `extract_links` | `stages/02-extract-links.ts` | Extract CSV/ODS download URLs from discovered transparency pages. **GOV.UK two-level**: follows `/government/publications/` HTML pages → resolves to `assets.publishing.service.gov.uk/media/` download URLs. 12+ regex patterns with scoring + AI fallback. |
| 3. `download_parse` | `stages/03-download-parse.ts` | Download files, detect format (CSV/ODS/XLSX), parse via PapaParse or SheetJS, normalize columns via hybrid mapper (11 known schemas + Claude Haiku fallback), bulk-upsert `SpendTransaction` records. |
| 4. `aggregate` | `stages/04-aggregate.ts` | MongoDB `$facet` aggregation: category/vendor/monthly breakdowns → upsert `SpendSummary`. |

Stages are orchestrated by `spend-engine.ts` which runs them in order, tracking progress in `SpendIngestJob` collection.

## GOV.UK Central Government Discovery

Central government departments (MoD, HMRC, etc.) each have their **own** spending publication pages. There is NO single cross-department collection page. The `/government/collections/spending-over-25-000` page is HMRC-specific.

### Discovery order (Stage 1)

1. **Dept-specific paths** (`getGovukDeptPaths()` in `patterns/transparency-urls.ts`): Uses `GOVUK_DEPT_SLUG_MAP` to map buyer names → GOV.UK URL slugs. Probes paths like `/government/publications/mod-spending-over-25000-january-to-december-{year}`. Base URL is always `https://www.gov.uk`.
2. **OrgType pattern paths** (`getPatternsForOrgType()`): Generic paths per org type (local councils, NHS trusts, etc.). Resolves subtypes: `local_council_london` → `local_council` patterns.
3. **Claude Haiku AI fallback**: Fetches homepage HTML, extracts nav/footer, asks Claude to find transparency page URL.

### Buyer link filtering

`filterLinksToBuyer()` in `stages/01-discover.ts` filters GOV.UK collection page links to the current buyer using:
- Slugified buyer name keywords
- `DEPT_ABBREVIATION_MAP` for known abbreviations (MoD → `mod`, HMRC → `hmrc`, etc.)
- Fallback: if zero links match any keyword, returns all links

### GOV.UK publication page following

`followGovukPublicationPages()` in `stages/02-extract-links.ts`:
- Identifies `/government/publications/` URLs in buyer's csvLinks
- Fetches each (max 24), extracts download URLs matching `assets.publishing.service.gov.uk/media/` or `/government/uploads/`
- Replaces publication HTML URLs with actual download URLs
- Runs BEFORE the existing regex extraction

## File Format Support

Stage 3 detects format via `detectFileFormat(contentType, url)`:

| Format | Content-Type | Parser |
|--------|-------------|--------|
| CSV | `text/csv`, `text/plain`, `application/csv` | PapaParse (`response.text()`) |
| ODS | `application/vnd.oasis.opendocument.spreadsheet`, `.ods` | SheetJS `xlsx` (`response.arrayBuffer()`) |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `.xlsx` | SheetJS `xlsx` (`response.arrayBuffer()`) |
| Unknown | `application/octet-stream` | Falls back to URL extension check |

Both CSV and ODS/XLSX paths produce identical `{ data: Record<string, string>[]; headers: string[] }` shape so downstream normalization is format-agnostic.

## Column Normalization

### Known schemas (`normalization/known-schemas.ts`)

11 schemas ordered by specificity (most specific first):

| Schema | Key Detection Headers | Maps To |
|--------|----------------------|---------|
| `govuk_mod_spending_25k` | Payment Date, Total, Supplier Name, Transaction Number | MoD ODS files |
| `govuk_spending_25k` | Date, Amount, Supplier, Transaction Number | HMRC CSV files |
| `devon_pattern` | Expense Area, Expense Type, Supplier Name | Devon council |
| `rochdale_pattern` | Directorate, Purpose, Effective Date | Rochdale council |
| `ipswich_pattern` | Service Area Categorisation, Expenses Type | Ipswich council |
| `manchester_pattern` | Service Area, Net Amount, Invoice Payment Date | Manchester council |
| `eden_pattern` | Expense Area, Body Name, Supplier Name | Eden council |
| `generic1_pattern` | Department, Total (inc. VAT), Payee Name | Generic pattern 1 |
| `generic2_pattern` | Service, Value, Supplier, Date Paid | Generic pattern 2 |
| `generic3_pattern` | Cost Centre, Subjective, Net, Creditor Name | Generic pattern 3 |
| `nhs_pattern` | Budget Code, Net Amount, Invoice Date | NHS trusts |

### AI fallback (`normalization/column-mapper.ts`)

When no schema matches, Claude Haiku maps columns. Results cached in-memory by sorted headers hash. Model: `claude-haiku-4-5-20251001`.

### Other normalizers

| File | What |
|------|------|
| `normalization/date-parser.ts` | ISO, DD/MM/YYYY, DD-Mon-YY, DD-Mon-YYYY, Mon DD YYYY |
| `normalization/amount-parser.ts` | £ symbols, parentheses-negative, CR/DR prefix, commas |
| `normalization/vendor-normalizer.ts` | Strip Ltd/Limited/PLC/Inc/LLP, lowercase, trim |
| `normalization/category-taxonomy.ts` | 25 high-level categories via keyword matching |

## URL Pattern Registry (`patterns/transparency-urls.ts`)

Org types → URL paths to probe:

| Org Type | Example Paths |
|----------|--------------|
| `local_council` | `/transparency/spending`, `/payments-over-500` |
| `nhs_trust` | `/about-us/spending-over-25000` |
| `nhs_icb` | `/about-us/how-we-spend-public-money` |
| `central_government` | `/government/collections/spending-over-25-000` |
| `fire_rescue` | `/about-us/transparency` |
| `police_pcc` | `/transparency/spending` |
| + 5 more | university, fe_college, mat, alb, national_park |

Subtype resolution: `local_council_london` → `local_council` → patterns.

## CSV Link Scoring (`patterns/csv-patterns.ts`)

12 weighted regex patterns scored and summed per URL. Anchor text keywords give +3 bonus. Patterns:

`file_extension` (10), `download_export` (8), `govuk_attachment` (7), `data_gov_uk` (9), `document_mgmt` (5), `wp_uploads` (7), `drupal_files` (7), `period_named` (9), `stream_download` (5), `file_id` (4), `sharepoint` (5), `content_download` (6).

## MongoDB Collections

| Collection | Key Fields | Purpose |
|------------|-----------|---------|
| `spendtransactions` | buyerId, date, vendor, amount, reference, sourceFile | Individual spend records. Compound dedup key. Max 5,000 per buyer. |
| `spendsummaries` | buyerId, totalSpend, totalTransactions, categoryBreakdown, vendorBreakdown, monthlyTotals | Pre-computed aggregates per buyer. |
| `spendingestjobs` | stage, status, cursor, totalProcessed | Pipeline progress tracking. |

## Rate Limiting

Uses shared `fetchWithDomainDelay()` from `api-clients/rate-limiter.ts`:
- `gov.uk`: 1s delay
- `nhs.uk`: 2s delay
- Default: 3s delay
- Retries on 429/503/network errors (max 3, respects `Retry-After`)

## Test Script

```bash
cd apps/web && DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-spend-single.ts "Ministry of Defence"
```

Runs all 4 stages for one buyer with inlined worker logic (avoids import path issues between `apps/web` and `apps/workers`). Limits to 3 files in test mode.

### Reset buyer state before re-testing

```js
db.buyers.updateOne(
  { name: "Ministry of Defence" },
  { $unset: { transparencyPageUrl: "", csvLinks: "", csvLinksExtracted: "", spendDataIngested: "", spendDataAvailable: "", discoveryMethod: "" } }
)
db.spendtransactions.deleteMany({ buyerId: ObjectId("698bd008cbb950ded69293b4") })
db.spendsummaries.deleteMany({ buyerId: ObjectId("698bd008cbb950ded69293b4") })
```

### Verified results (MoD, 2026-02-12)

- Stage 1: Dept-specific path found on 3rd probe (`mod-spending-over-25000-january-to-december-2025`)
- Stage 2: 12 ODS download URLs from `assets.publishing.service.gov.uk`
- Stage 3: 1,499 transactions from 3 months of ODS files, £2.2B total
- Stage 4: 17 categories (Defence Equipment and Support, Defence Infrastructure, Strategic Command, etc.), 50+ vendors (BAE Systems, Leidos, Aspire Defence, etc.)
