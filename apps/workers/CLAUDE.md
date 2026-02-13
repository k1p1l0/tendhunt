# TendHunt — Cloudflare Workers

TendHunt runs **4 Cloudflare Workers** that form a data pipeline. They are independent deployable units that communicate via HTTP fire-and-forget calls.

## Worker Overview

| Worker | Directory | Cron | URL | Purpose |
|--------|-----------|------|-----|---------|
| **data-sync** | `data-sync/` | Hourly (`0 * * * *`) | `https://tendhunt-data-sync.kozak-74d.workers.dev` | Fetches contracts from FaT + CF APIs, extracts buyers |
| **enrichment** | `enrichment/` | Hourly (`0 * * * *`) | `https://tendhunt-enrichment.kozak-74d.workers.dev` | 8-stage buyer enrichment (classify, website, logo, governance, moderngov, scrape, personnel, score) |
| **spend-ingest** | `spend-ingest/` | Weekly (Mon 3AM) | `https://tendhunt-spend-ingest.kozak-74d.workers.dev` | 4-stage spend data ingest (discover, extract links, download/parse, aggregate) |
| **board-minutes** | `board-minutes/` | Hourly at :30 (`30 * * * *`) | `https://tendhunt-board-minutes.kozak-74d.workers.dev` | 2-stage signal extraction from board documents (extract signals via Claude Haiku, deduplicate) |

## Data Flow — How Workers Connect

```
  ┌─────────────┐      fire-and-forget       ┌──────────────┐     after all_complete    ┌───────────────┐
  │  data-sync  │ ──── /run-buyer?id=X ────→ │  enrichment  │ ──── /run ─────────────→ │ spend-ingest  │
  │  (hourly)   │      (new buyers only)      │  (hourly)    │     (triggers spend)     │ (weekly+chain) │
  └─────────────┘                             └──────────────┘──┐                       └───────────────┘
       │                                           │            │
       │ FaT + CF APIs → contracts + buyers        │            │  after all_complete    ┌───────────────┐
       │ bulkWrite upsert, cursor-based resume     │            └── /run ─────────────→ │ board-minutes │
       ▼                                           ▼                                    │ (hourly :30)  │
  MongoDB: contracts, buyers, syncJobs        MongoDB: buyers (enrichment fields),      └───────────────┘
                                              boarddocuments, keypersonnels,                  │
                                              enrichmentjobs, datasources               │ 2 stages per buyer
                                                                                        │ (extract → dedup)
                                              MongoDB: spendtransactions,                ▼
                                              spendsummaries,                       MongoDB: signals,
                                              spendingestjobs                       signalingestjobs
```

**Key flow:**
1. **data-sync** fetches contracts hourly from Find a Tender + Contracts Finder APIs
2. For each contract batch, it extracts buyer records via `autoExtractBuyers()` (upsert by `nameLower`)
3. **Newly created buyers** (not existing ones) trigger a fire-and-forget `fetch()` to the **enrichment worker's** `/run-buyer?id=X` endpoint
4. The **enrichment worker** runs all 8 stages for that buyer (classify, website discovery, logo/LinkedIn, governance URLs, ModernGov SOAP, HTML scrape, Claude personnel extraction, enrichment scoring)
5. After enrichment completes, the enrichment worker chains to **spend-ingest** worker's `/run-buyer?id=X` for spend data, then to **board-minutes** worker's `/run-buyer?id=X` for signal extraction
6. Additionally, the **enrichment worker's** batch cron processes remaining un-enriched buyers hourly, and when all enrichment stages complete (`all_complete`), it triggers both the **spend-ingest** worker's `/run` and the **board-minutes** worker's `/run` endpoints

## Single-Buyer Endpoints

Workers expose `/run-buyer?id=<ObjectId>` for on-demand single-buyer processing:
- **enrichment**: `GET /run-buyer?id=X` — runs all 8 enrichment stages + chains to spend-ingest + board-minutes
- **spend-ingest**: `GET /run-buyer?id=X` — runs all 4 spend stages for one buyer
- **board-minutes**: `GET /run-buyer?id=X` — runs all 2 signal extraction stages for one buyer
- **data-sync**: No single-buyer endpoint (batch-only via cron)

## Worker Secrets & Env Vars

| Worker | Secrets | Env Vars (`[vars]` in wrangler.toml) |
|--------|---------|--------------------------------------|
| data-sync | `MONGODB_URI` | `ENRICHMENT_WORKER_URL` |
| enrichment | `MONGODB_URI`, `ANTHROPIC_API_KEY`, `APIFY_API_TOKEN`, `LOGO_DEV_TOKEN` | `SPEND_INGEST_WORKER_URL`, `BOARD_MINUTES_WORKER_URL` |
| spend-ingest | `MONGODB_URI`, `ANTHROPIC_API_KEY` | — |
| board-minutes | `MONGODB_URI`, `ANTHROPIC_API_KEY` | — |

## Deploying Workers

```bash
cd apps/workers/data-sync && npx wrangler deploy
cd apps/workers/enrichment && npx wrangler deploy
cd apps/workers/spend-ingest && npx wrangler deploy
cd apps/workers/board-minutes && npx wrangler deploy
```

## Debugging Workers

```bash
# Live logs
wrangler tail --name tendhunt-data-sync
wrangler tail --name tendhunt-enrichment
wrangler tail --name tendhunt-spend-ingest
wrangler tail --name tendhunt-board-minutes

# Debug endpoints (all workers except data-sync expose GET /debug with collection stats + job states)
curl https://tendhunt-enrichment.kozak-74d.workers.dev/debug
curl https://tendhunt-spend-ingest.kozak-74d.workers.dev/debug
curl https://tendhunt-board-minutes.kozak-74d.workers.dev/debug

# Manual trigger
curl https://tendhunt-enrichment.kozak-74d.workers.dev/run?max=100
curl https://tendhunt-spend-ingest.kozak-74d.workers.dev/run?max=50
curl https://tendhunt-board-minutes.kozak-74d.workers.dev/run?max=50
```

---

## Data-Sync Worker

Cloudflare Worker that syncs UK government contracts from two OCDS APIs into MongoDB. Runs **hourly** via cron, processing up to 9,000 items per invocation (5,400 FaT + 3,600 CF) with cursor-based crash-safe resume.

### Data Sources

| Source | API | Budget | Key Params |
|--------|-----|--------|------------|
| Find a Tender (FaT) | `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages` | 5,400 items (60%) | `updatedFrom`, `stages` (tender/award separately), `limit=100` |
| Contracts Finder (CF) | `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search` | 3,600 items (40%) | `publishedFrom`, `stages` (comma-separated), `limit=100` |

**FaT dual-stage fetch**: FaT rejects comma-separated stages. Uses closure variable + synthetic `"STAGE:award"` cursor to fetch tender and award stages sequentially within a single sync pass.

### Key Files

| File | Purpose |
|------|---------|
| `data-sync/src/index.ts` | Worker entry point, cron handler, budget allocation |
| `data-sync/src/sync-engine.ts` | Core page loop — cursor resume, error recovery, buyer extraction + enrichment trigger |
| `data-sync/src/api-clients/fat-client.ts` | FaT API client (dual-stage, full-URL pagination) |
| `data-sync/src/api-clients/cf-client.ts` | CF API client (combined stages, date-filtered) |
| `data-sync/src/db/buyers.ts` | `autoExtractBuyers()` — upsert by `nameLower`, returns new buyer IDs for enrichment |
| `data-sync/src/db/contracts.ts` | `upsertContracts()` — bulkWrite with `noticeId` dedup |
| `data-sync/src/db/sync-jobs.ts` | Sync job CRUD — cursor tracking, error recovery |
| `data-sync/src/mappers/ocds-mapper.ts` | OCDS release → TendHunt contract schema mapping |

### MongoDB Collections (Data-Sync)

| Collection | Key Fields | Purpose |
|------------|-----------|---------|
| `syncJobs` | source, status, cursor, totalFetched | Tracks backfill/sync progress per source |
| `contracts` | noticeId (unique), source, buyerId, title, status | Government contract notices |
| `buyers` | nameLower (unique), orgId, contractCount | Auto-extracted buyer organizations |

### Error Recovery

The sync engine handles error states automatically:
- `status: "error"` with cursor → resumes backfilling from cursor position
- `status: "error"` without cursor → resumes syncing from `lastSyncedDate`
- Per-release try/catch ensures individual bad records don't kill the batch
- Progress saved to MongoDB after EVERY page for crash-safe resume

---

## Enrichment Worker

An 8-stage Cloudflare Worker that enriches UK public sector buyers with governance data, board documents, and key personnel. Runs **hourly** via cron, processing 500 buyers per invocation with cursor-based resume.

### DataSource Seeding

The `DataSource` collection is seeded from a spec file in this repo:
- **Source**: `.planning/DATA_SOURCES.md`
- **Script**: `apps/web/scripts/seed-data-sources.ts`
- **Run**: `DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/seed-data-sources.ts`
- **Result**: ~2,361 documents (672 Tier 0, 1,693 Tier 1), idempotent via bulkWrite upsert on `name`

The seed script parses markdown tables from DATA_SOURCES.md covering **20 categories** of UK public sector organisations:

| Category | orgType | Count (approx) |
|----------|---------|-----------------|
| London Borough Councils | `local_council_london` | 33 |
| Metropolitan Borough Councils | `local_council_metro` | 36 |
| County Councils | `local_council_county` | 21 |
| Unitary Authorities | `local_council_unitary` | 59 |
| District Councils | `local_council_district` | 164 |
| Sui Generis Councils | `local_council_sui_generis` | 4 |
| NHS Ambulance Trusts | `nhs_trust_ambulance` | 10 |
| NHS Acute Trusts (7 regions) | `nhs_trust_acute` | ~130 |
| NHS Mental Health Trusts | `nhs_trust_mental_health` | 44 |
| NHS Community Healthcare | `nhs_trust_community` | 11 |
| NHS ICBs (7 regions) | `nhs_icb` | 42 |
| Fire & Rescue Services | `fire_rescue` | 44 |
| Police & Crime Commissioners | `police_pcc` | 40 |
| Combined Authorities | `combined_authority` | 11 |
| National Park Authorities | `national_park` | 10 |
| Multi-Academy Trusts | `mat` | ~1,400 |
| Universities | `university` | ~170 |
| FE Colleges | `fe_college` | ~90 |
| Healthcare Regulators | `alb` | ~15 |
| Arms-Length Bodies | `alb` | ~30 |

Each DataSource record includes: `name`, `orgType`, `region`, `democracyPortalUrl`, `boardPapersUrl`, `platform` (ModernGov/CMIS/Custom/Jadu/None), `website`, `tier`, `status`.

### 8-Stage Pipeline

Stages run sequentially. Each stage processes all buyers before the next begins. The `EnrichmentJob` collection tracks cursor position per stage for crash-safe resume.

| Stage | File | What it does |
|-------|------|-------------|
| 1. `classify` | `enrichment/src/stages/01-classify.ts` | Fuzzy-match buyer names → DataSource via Fuse.js (threshold 0.3, 16 strip patterns for UK org name normalization). Sets `orgType`, `dataSourceId`, governance URLs. |
| 2. `website_discovery` | `enrichment/src/stages/01b-website-discovery.ts` | Google Search via Apify to find missing buyer websites. |
| 3. `logo_linkedin` | `enrichment/src/stages/01c-logo-linkedin.ts` | logo.dev CDN + LinkedIn company search + og:image for buyer logos. |
| 4. `governance_urls` | `enrichment/src/stages/02-governance-urls.ts` | Propagate `democracyPortalUrl`, `boardPapersUrl`, `platform` from DataSource to matched buyers. |
| 5. `moderngov` | `enrichment/src/stages/03-moderngov.ts` | Call ModernGov SOAP API for buyers on ModernGov platform. Fetch recent meetings + committees, upsert `BoardDocument` records. Uses double XML parse (SOAP envelope → inner result). |
| 6. `scrape` | `enrichment/src/stages/04-scrape.ts` | HTML scrape governance pages for non-ModernGov orgs. Extract board document links, descriptions, meeting dates. |
| 7. `personnel` | `enrichment/src/stages/05-personnel.ts` | Claude Haiku extracts key personnel from scraped content. p-limit(2) concurrency. Upserts `KeyPersonnel` records with role, confidence score. |
| 8. `score` | `enrichment/src/stages/06-score.ts` | Compute weighted enrichment score (0–100): orgType(15) + governance(10) + boardPapers(10) + website(5) + description(5) + staff(10) + budget(10) + personnel(20) + docs(15). |

### Rate Limiting

Per-domain rate limiter (`enrichment/src/api-clients/rate-limiter.ts`) with exponential backoff:
- `moderngov` domains: 2s delay
- `nhs.uk`: 2s delay
- `gov.uk`: 1s delay
- Default: 3s delay
- Retries on 429/503/network errors (max 3, respects `Retry-After` header)

### MongoDB Collections (Enrichment)

| Collection | Model File | Purpose |
|------------|-----------|---------|
| `DataSource` | `apps/web/src/models/data-source.ts` | Seed data — UK public sector orgs with governance URLs |
| `BoardDocument` | `apps/web/src/models/board-document.ts` | Scraped board papers/meeting docs per buyer |
| `KeyPersonnel` | `apps/web/src/models/key-personnel.ts` | Extracted key people (CEO, CFO, etc.) per buyer |
| `EnrichmentJob` | `apps/web/src/models/enrichment-job.ts` | Pipeline state — cursor, stage, progress tracking |

### Buyer Schema Extensions

The `Buyer` model (`apps/web/src/models/buyer.ts`) was extended with 12 enrichment fields:
`orgType`, `orgSubType`, `dataSourceId`, `democracyPortalUrl`, `democracyPlatform`, `boardPapersUrl`, `staffCount`, `annualBudget`, `enrichmentScore`, `enrichmentSources`, `lastEnrichedAt`, `enrichmentVersion`
