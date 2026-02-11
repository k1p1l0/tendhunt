# Phase 2: Data Pipeline - Research

**Researched:** 2026-02-11
**Domain:** UK procurement data APIs (Find a Tender, Contracts Finder), MongoDB ingestion, seed data generation
**Confidence:** HIGH

## Summary

Phase 2 requires ingesting real UK procurement contract notices from two government APIs (Find a Tender OCDS API and Contracts Finder OCDS API), normalizing them to the existing Mongoose Contract schema, and seeding board minutes signals and buyer contacts. Both APIs are publicly accessible under the Open Government Licence with no authentication required for OCDS read endpoints. They return OCDS 1.1.5-format JSON with cursor-based pagination and rate limits (HTTP 429 / 403 with Retry-After).

The existing Mongoose models (`Contract`, `Buyer`, `Signal`) from Phase 1 are well-designed for this ingestion. The Contract model already has `source` enum (`FIND_A_TENDER`, `CONTRACTS_FINDER`), `noticeId`, `ocid`, CPV codes, buyer fields, value ranges, and dates -- all of which map directly to OCDS release fields. The recommended approach is TypeScript scripts (run via `tsx`) rather than Python, since the project is a TypeScript/Next.js codebase, the existing Mongoose models can be imported directly, and `tsx` v4.21.0 is already available. This eliminates the need for a separate Python environment, duplicate schema definitions, and cross-language dependency management.

**Primary recommendation:** Use TypeScript ingestion scripts in a `scripts/` directory, run via `npx tsx`, importing existing Mongoose models directly. Fetch 200-500 contracts from Find a Tender OCDS API and Contracts Finder OCDS API using cursor-based pagination with rate-limit retry logic. Seed signals and buyer contacts with realistic generated data.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | ^9.2.0 | MongoDB ODM (already installed) | Existing project dependency, models already defined |
| tsx | ^4.21.0 | Run TypeScript scripts directly | Already available via npx, zero config |
| node built-in fetch | N/A | HTTP requests to APIs | Node 20 has built-in fetch, no extra dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Validate/parse API responses | Already installed; use to validate OCDS release shape before mapping |
| dotenv | (built-in via tsx) | Load .env.local for MONGODB_URI | tsx loads .env automatically; or use `--env-file=.env.local` flag |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript scripts | Python (Scrapy) | Roadmap mentions Python, but TS avoids duplicate schemas, extra runtime, cross-language complexity. Python only needed for Playwright-based scraping (not needed here -- both APIs are REST/JSON) |
| Built-in fetch | axios | axios adds a dependency; built-in fetch is sufficient for simple GET/POST JSON requests |
| Manual pagination | OCDS Kingfisher Collect | Kingfisher is a full Scrapy framework -- massive overkill for fetching 500 records from 2 APIs |

**Installation:**
```bash
# No new packages needed! All dependencies are already in the project.
# Scripts run via: npx tsx scripts/ingest-fat.ts
# If tsx is needed as devDep: npm install -D tsx
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── ingest-fat.ts           # Find a Tender OCDS ingestion
├── ingest-cf.ts            # Contracts Finder ingestion
├── seed-signals.ts         # Board minutes signal seeding
├── seed-buyers.ts          # Buyer contact seeding
├── lib/
│   ├── ocds-mapper.ts      # OCDS release → Contract document mapper
│   ├── api-client.ts       # Rate-limited fetch with retry logic
│   └── db.ts               # DB connection for scripts (imports from src/lib/mongodb.ts)
└── data/
    ├── signals.json        # Pre-generated signal seed data
    └── buyers.json         # Pre-generated buyer contact seed data
src/
├── models/                 # Existing Mongoose models (unchanged)
│   ├── contract.ts
│   ├── buyer.ts
│   ├── signal.ts
│   └── ...
└── lib/
    └── mongodb.ts          # Existing DB connection
```

### Pattern 1: OCDS-to-Contract Mapper
**What:** A pure function that maps an OCDS release object to the Contract Mongoose document shape.
**When to use:** Every time an API response release needs to be transformed before DB insert.
**Example:**
```typescript
// scripts/lib/ocds-mapper.ts
import type { IContract } from "@/models/contract";

interface OcdsRelease {
  ocid: string;
  id: string;
  date: string;
  tag: string[];
  tender: {
    id: string;
    title: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    tenderPeriod?: { endDate?: string };
    classification?: { id: string; description?: string; scheme?: string };
    items?: Array<{
      classification?: { id: string; description?: string };
    }>;
  };
  parties?: Array<{
    name: string;
    id: string;
    roles?: string[];
    address?: { region?: string; locality?: string };
  }>;
  buyer?: { name: string; id?: string };
}

export function mapOcdsToContract(
  release: OcdsRelease,
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER"
): Partial<IContract> {
  const buyer = release.parties?.find((p) => p.roles?.includes("buyer"));
  const cpvCodes = release.tender?.items
    ?.map((item) => item.classification?.id)
    .filter(Boolean) as string[];

  return {
    ocid: release.ocid,
    noticeId: release.id,
    source,
    sourceUrl: source === "FIND_A_TENDER"
      ? `https://www.find-tender.service.gov.uk/Notice/${release.id}`
      : `https://www.contractsfinder.service.gov.uk/Notice/${release.id}`,
    title: release.tender?.title ?? "Untitled",
    description: release.tender?.description,
    status: mapStatus(release.tender?.status),
    stage: mapStage(release.tag),
    buyerName: buyer?.name ?? release.buyer?.name ?? "Unknown",
    buyerRegion: buyer?.address?.region,
    cpvCodes: cpvCodes ?? [],
    sector: deriveSectorFromCpv(cpvCodes?.[0]),
    valueMin: release.tender?.value?.amount,
    valueMax: release.tender?.value?.amount,
    currency: release.tender?.value?.currency ?? "GBP",
    publishedDate: release.date ? new Date(release.date) : undefined,
    deadlineDate: release.tender?.tenderPeriod?.endDate
      ? new Date(release.tender.tenderPeriod.endDate)
      : undefined,
    rawData: release,
  };
}
```

### Pattern 2: Rate-Limited API Client with Cursor Pagination
**What:** A reusable fetch wrapper that handles cursor-based pagination and respects rate limits (HTTP 429/403).
**When to use:** All API calls to Find a Tender and Contracts Finder.
**Example:**
```typescript
// scripts/lib/api-client.ts
interface PaginatedResponse<T> {
  releases: T[];
  cursor?: string;
}

export async function fetchAllPages<T>(
  baseUrl: string,
  params: Record<string, string>,
  maxItems: number = 500
): Promise<T[]> {
  const allItems: T[] = [];
  let cursor: string | undefined;

  while (allItems.length < maxItems) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetchWithRetry(url.toString());
    const data: PaginatedResponse<T> = await res.json();

    allItems.push(...data.releases);
    cursor = data.cursor;

    if (!cursor || data.releases.length === 0) break;

    // Polite delay between requests
    await sleep(500);
  }

  return allItems.slice(0, maxItems);
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
      console.warn(`Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }

    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

### Pattern 3: Upsert-Based Ingestion with bulkWrite
**What:** Use Mongoose `bulkWrite` with `updateOne` + `upsert: true` to insert new records and update existing ones idempotently.
**When to use:** Every ingestion script, so re-running is safe and won't create duplicates.
**Example:**
```typescript
// Idempotent upsert pattern
import Contract from "@/models/contract";

const ops = contracts.map((contract) => ({
  updateOne: {
    filter: { source: contract.source, noticeId: contract.noticeId },
    update: { $set: contract },
    upsert: true,
  },
}));

const result = await Contract.bulkWrite(ops, { ordered: false });
console.log(
  `Inserted: ${result.upsertedCount}, Updated: ${result.modifiedCount}`
);
```

### Anti-Patterns to Avoid
- **Duplicating Mongoose models in scripts:** Import directly from `@/models/contract` -- never redefine schemas in scripts.
- **Using insertMany without dedup:** Always use `bulkWrite` with `upsert: true` so scripts are idempotent and re-runnable.
- **Storing full rawData for every document:** The rawData field stores the original OCDS release, which can be 5-10 KB per document. For 500 docs this is ~5 MB max -- fine for M0 tier. But do not expand this to thousands without checking storage.
- **Ignoring the `source + noticeId` unique compound index:** The Contract model already has `{ source: 1, noticeId: 1 }` as a unique index. This is the dedup key -- always filter by it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OCDS data parsing | Custom JSON traversal | Typed mapper function with Zod validation | OCDS has nested, optional fields with multiple possible shapes; a typed mapper catches edge cases |
| Rate limiting | Simple setTimeout | Retry loop reading Retry-After header | Both APIs return 429/403 with Retry-After; ignoring it gets you blocked |
| Deduplication | Manual DB query before insert | `bulkWrite` with `upsert: true` on compound index | Atomic, idempotent, handles concurrent runs |
| Sector classification | CPV-to-sector mapping table | Hardcoded top-level CPV division mapping (2-digit prefix) | CPV codes follow a standardized tree; map the first 2 digits to sector names |

**Key insight:** Both APIs return paginated OCDS JSON. The hard part is not fetching -- it is correctly mapping the nested OCDS structure to the flat Contract model while handling missing/optional fields gracefully.

## Common Pitfalls

### Pitfall 1: Find a Tender API Authentication Confusion
**What goes wrong:** The Find a Tender site documents TWO separate API categories. The REST API (notice submission, status, search) requires a CDP-Api-Key. The OCDS endpoints (`/api/1.0/ocdsReleasePackages` and `/api/1.0/ocdsRecordPackages`) are PUBLIC read endpoints under Open Government Licence.
**Why it happens:** The REST API documentation page shows authentication requirements prominently, making developers think ALL endpoints need auth.
**How to avoid:** Use ONLY the OCDS endpoints: `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages`. No API key needed. This is confirmed by the OCP Data Registry and the Kingfisher Collect project (which scrapes without auth).
**Warning signs:** Getting 401/403 errors -- if this happens, you are hitting the wrong endpoint (the eSender REST API, not the OCDS public data API).

### Pitfall 2: Contracts Finder V1 vs V2 vs OCDS Endpoints
**What goes wrong:** Contracts Finder has THREE API surfaces: V1 search (deprecated), V2 `search_notices` (POST, richer), and the OCDS search (`Published/Notices/OCDS/Search` -- GET, public). Using the wrong one adds unnecessary complexity.
**Why it happens:** Documentation lists all three without clearly marking which is best for OCDS consumption.
**How to avoid:** Use the OCDS search endpoint: `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search`. It returns the same OCDS release package format as Find a Tender, making the mapper reusable. Parameters: `publishedFrom`, `publishedTo`, `stages`, `limit`, `cursor`.
**Warning signs:** Needing OAuth tokens or POST bodies -- you are using the V2 search API instead of the OCDS endpoint.

### Pitfall 3: OCDS Field Inconsistencies Between Sources
**What goes wrong:** Find a Tender (OCDS 1.1.5 compliant) and Contracts Finder (OCDS ~1.0-1.1 hybrid) return slightly different structures. Contracts Finder may have empty buyer names, missing classifications, or different party role strings.
**Why it happens:** Contracts Finder's OCDS implementation predates Find a Tender and has documented data quality issues (duplicate supplier IDs, empty critical fields, unrealistic dates).
**How to avoid:** The mapper function must handle: missing `buyer`/`parties` gracefully (fallback to "Unknown"), missing `tender.value` (set both min/max to null), missing `tender.classification` (empty CPV array). Add explicit null checks for every optional field.
**Warning signs:** Runtime errors like "Cannot read properties of undefined" during mapping.

### Pitfall 4: Rate Limiting on Both APIs
**What goes wrong:** Making rapid sequential requests triggers rate limits. Find a Tender returns HTTP 429 with `Retry-After` header. Contracts Finder returns HTTP 403 and requires a 5-minute wait.
**Why it happens:** These are government services with modest infrastructure, not high-throughput APIs.
**How to avoid:** Add a 500ms minimum delay between requests. Read and respect the `Retry-After` header. Fetch in date-windowed batches (e.g., 1 month at a time) to keep response sizes manageable. 500 contracts requires only 5-10 API calls (100 per page) -- feasible in under 2 minutes with polite delays.
**Warning signs:** Getting 429 or 403 responses. Contracts Finder 403 may not include a Retry-After header -- default to 300 seconds (5 minutes).

### Pitfall 5: MongoDB Atlas M0 Storage Limits
**What goes wrong:** Exceeding the 512 MB M0 free tier storage limit.
**Why it happens:** Storing full rawData per contract (5-10 KB each) plus indexes can add up.
**How to avoid:** With 500 contracts at ~5 KB each = 2.5 MB data + ~1 MB indexes + 100 signals at ~1 KB + 100 buyers at ~2 KB = well under 10 MB total. The M0 tier is more than sufficient. Only concern would be if rawData is excluded or if data volume grows to 10,000+ documents.
**Warning signs:** MongoDB returning `MongoServerError: you are over your space quota`.

### Pitfall 6: tsx Path Aliases Not Resolving
**What goes wrong:** Importing `@/models/contract` in scripts fails because tsx does not automatically resolve tsconfig paths.
**Why it happens:** tsx does not read `paths` from tsconfig.json by default.
**How to avoid:** Use the `--tsconfig` flag: `npx tsx --tsconfig tsconfig.json scripts/ingest-fat.ts`. Alternatively, register a paths resolver: `tsx` with `tsconfig-paths` or use relative imports in scripts (`../src/models/contract`).
**Warning signs:** `ERR_MODULE_NOT_FOUND` or `Cannot find module '@/models/contract'`.

## Code Examples

Verified patterns from official sources:

### Fetching from Find a Tender OCDS API
```typescript
// Source: https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages
// Endpoint: GET /api/1.0/ocdsReleasePackages
// Parameters: limit (1-100), cursor, updatedFrom, updatedTo, stages
// No authentication required
// Response: OCDS release package with releases[] array

const FAT_BASE = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";

const url = new URL(FAT_BASE);
url.searchParams.set("limit", "100");
url.searchParams.set("stages", "tender");
// Fetch last 30 days of notices
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
url.searchParams.set("updatedFrom", thirtyDaysAgo.toISOString().slice(0, 19));

const res = await fetch(url.toString());
const data = await res.json();
// data.releases is an array of OCDS release objects
// data.cursor is the pagination token for next page (if exists)
```

### Fetching from Contracts Finder OCDS API
```typescript
// Source: https://www.contractsfinder.service.gov.uk/apidocumentation/Notices/1/GET-Published-Notice-OCDS-Search
// Endpoint: GET /Published/Notices/OCDS/Search
// Parameters: publishedFrom, publishedTo, stages, limit (1-100), cursor
// No authentication required
// Response: OCDS release package with releases[] array

const CF_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";

const url = new URL(CF_BASE);
url.searchParams.set("limit", "100");
url.searchParams.set("stages", "tender,award");
url.searchParams.set("publishedFrom", "2025-12-01T00:00:00");
url.searchParams.set("publishedTo", "2026-02-11T00:00:00");

const res = await fetch(url.toString());
const data = await res.json();
// data.releases is an array of OCDS release objects
// Same OCDS structure as Find a Tender (minor field differences)
```

### Mongoose bulkWrite Upsert Pattern
```typescript
// Source: Mongoose 9.x docs -- https://mongoosejs.com/docs/api/model.html#Model.bulkWrite()
// Use updateOne + upsert for idempotent ingestion
// The { ordered: false } option continues on errors (e.g., validation failures)

import Contract from "@/models/contract";

const ops = mappedContracts.map((doc) => ({
  updateOne: {
    filter: { source: doc.source, noticeId: doc.noticeId },
    update: { $set: doc },
    upsert: true,
  },
}));

const result = await Contract.bulkWrite(ops, { ordered: false });
console.log(`Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
```

### Running Scripts with tsx
```bash
# Run ingestion script with path alias support
npx tsx --tsconfig tsconfig.json scripts/ingest-fat.ts

# Or with env file loading
npx tsx --env-file=.env.local scripts/ingest-fat.ts

# Add to package.json scripts for convenience
# "scripts": {
#   "ingest:fat": "tsx --env-file=.env.local scripts/ingest-fat.ts",
#   "ingest:cf": "tsx --env-file=.env.local scripts/ingest-cf.ts",
#   "seed:signals": "tsx --env-file=.env.local scripts/seed-signals.ts",
#   "seed:buyers": "tsx --env-file=.env.local scripts/seed-buyers.ts"
# }
```

### CPV Code to Sector Mapping
```typescript
// CPV (Common Procurement Vocabulary) codes follow EU standard
// First 2 digits indicate division/sector
// Source: https://simap.ted.europa.eu/cpv
const CPV_SECTOR_MAP: Record<string, string> = {
  "03": "Agriculture & Forestry",
  "09": "Energy",
  "14": "Mining",
  "15": "Food & Beverages",
  "18": "Clothing & Textiles",
  "22": "Publishing & Printing",
  "24": "Chemicals",
  "30": "IT Equipment",
  "31": "Electrical Equipment",
  "32": "Telecoms",
  "33": "Medical Equipment",
  "34": "Transport Equipment",
  "35": "Security & Defence",
  "37": "Musical & Sports Equipment",
  "38": "Laboratory Equipment",
  "39": "Furniture",
  "41": "Water",
  "42": "Industrial Machinery",
  "43": "Mining Machinery",
  "44": "Construction Materials",
  "45": "Construction",
  "48": "Software",
  "50": "Repair & Maintenance",
  "51": "Installation",
  "55": "Hospitality",
  "60": "Transport",
  "63": "Transport Support",
  "64": "Postal & Telecom",
  "65": "Utilities",
  "66": "Financial Services",
  "70": "Real Estate",
  "71": "Architecture & Engineering",
  "72": "IT Services",
  "73": "R&D",
  "75": "Public Administration",
  "76": "Oil & Gas",
  "77": "Agriculture Services",
  "79": "Business Services",
  "80": "Education",
  "85": "Health & Social",
  "90": "Environmental Services",
  "92": "Recreation & Culture",
  "98": "Other Services",
};

export function deriveSectorFromCpv(cpvCode?: string): string | undefined {
  if (!cpvCode) return undefined;
  const division = cpvCode.slice(0, 2);
  return CPV_SECTOR_MAP[division];
}
```

## API Reference Summary

### Find a Tender OCDS API
| Aspect | Detail |
|--------|--------|
| **Endpoint** | `GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages` |
| **Auth** | None (public, Open Government Licence v3.0) |
| **Parameters** | `limit` (1-100), `cursor`, `updatedFrom`, `updatedTo` (YYYY-MM-DDTHH:MM:SS), `stages` (planning,tender,award) |
| **Response** | OCDS 1.1.5 release package JSON |
| **Pagination** | Cursor-based (base64 token in `cursor` field) |
| **Rate Limit** | HTTP 429 with `Retry-After` header; HTTP 503 with `Retry-After` |
| **Data Volume** | ~162,000 tenders since Jan 2021 |
| **Coverage** | UK above-threshold procurements (post-Brexit replacement for OJEU/TED) |

### Contracts Finder OCDS API
| Aspect | Detail |
|--------|--------|
| **Endpoint** | `GET https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search` |
| **Auth** | None for OCDS search (public) |
| **Parameters** | `publishedFrom`, `publishedTo` (ISO 8601), `stages` (planning,tender,award,implementation), `limit` (1-100, default 100), `cursor` |
| **Response** | OCDS ~1.0-1.1 release package JSON |
| **Pagination** | Cursor-based |
| **Rate Limit** | HTTP 403 with 5-minute cooldown (no Retry-After header) |
| **Data Volume** | ~577,000 tenders since Nov 2016 |
| **Coverage** | UK below-threshold and some above-threshold procurements |

### Key Differences Between APIs
| Aspect | Find a Tender | Contracts Finder |
|--------|--------------|-----------------|
| OCDS compliance | Full 1.1.5 | Partial (~1.0 with some 1.1) |
| Date filtering | `updatedFrom`/`updatedTo` | `publishedFrom`/`publishedTo` |
| Rate limit response | 429 + Retry-After | 403 (wait 5 min) |
| Data quality | Higher (newer system) | Lower (documented issues: empty fields, duplicates) |
| Procurement scope | Above-threshold (high value) | Below and above threshold |

## Seed Data Strategy

### Board Minutes Signals (DATA-04)
**Target:** 50-100 pre-processed signal documents in the `signals` collection.
**Format:** Must match the existing Signal Mongoose model schema.
**Approach:** Generate realistic seed data as a JSON file, covering:
- All 6 signal types: PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY
- Multiple sectors: Health, IT, Construction, Education, Defence, Environment
- Multiple organizations: NHS trusts, local councils, government departments
- Realistic date range: last 6 months
- Confidence scores: 0.6-0.95 range

**Example seed signal:**
```json
{
  "organizationName": "NHS England",
  "signalType": "PROCUREMENT",
  "title": "Digital transformation programme approved for Phase 2 funding",
  "insight": "Board minutes from Jan 2026 meeting indicate approval of GBP 12M for Phase 2 of the digital patient records transformation. RFP expected Q2 2026.",
  "source": "NHS England Board Meeting Minutes - January 2026",
  "sourceDate": "2026-01-15T00:00:00Z",
  "sector": "Health & Social",
  "confidence": 0.85
}
```

### Buyer Contacts (DATA-05)
**Target:** 50-100 buyer organizations with contacts in the `buyers` collection.
**Public data sources available:**
1. **GOV.UK appointments** -- Public appointments register (names, roles, organizations)
2. **NHS board members** -- Each NHS trust publishes board member names and roles on their website. NHS England publishes a register of interests with names and titles.
3. **Council committee pages** -- Local councils publish committee membership lists. Open Council Data UK provides councillor names, wards, and emails.
4. **Companies House** -- Public Data API provides officer appointments for public bodies
5. **data.gov.uk** -- Various organizational datasets

**Practical approach for hackathon:** Generate realistic-but-synthetic seed data rather than scraping live government websites. This avoids:
- Scraping complexity and fragility (each NHS trust has a different website layout)
- Data freshness issues
- Potential legal grey areas around personal data aggregation
- Time cost of building scrapers for 50+ different website formats

**Seed buyer contacts should include:**
- `name` (organization): Real UK public sector organization names
- `sector`: Mapped to realistic sectors
- `region`: Real UK regions
- `website`: Real organization URLs
- `contacts[]`: Realistic names, titles (e.g., "Head of Procurement", "Chief Digital Officer"), plausible emails (firstname.lastname@org.gov.uk pattern)
- `contractCount`: Will be computed/updated after contract ingestion

**Note:** The existing Buyer model has `contacts[].linkedIn` field but per project constraints "No LinkedIn scraping" -- leave this field empty in seed data.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UK used OJEU/TED for above-threshold notices | Find a Tender replaced TED post-Brexit (Jan 2021), enhanced under Procurement Act 2023 (Feb 2025) | Feb 2025 | New notice types (UK1-UK4), enhanced OCDS compliance, new Supplier Information Service |
| Contracts Finder V1 API | V2 API + OCDS endpoints | ~2020 | V1 deprecated; V2 adds SME/VCSE filters; OCDS endpoint is simplest for data consumption |
| Python scrapers for procurement data | TypeScript for API-based ingestion | Project decision | Python Scrapy only needed for HTML scraping (Playwright); REST JSON APIs are simpler with native fetch |

**Deprecated/outdated:**
- Contracts Finder V1 API (`POST Searches/Search`) -- use V2 or OCDS endpoint instead
- OJEU/TED for UK notices -- replaced by Find a Tender since Jan 2021
- The Roadmap's mention of "Python (Scrapy + Playwright)" for these API calls -- Playwright is only needed for JavaScript-rendered pages, which neither API requires

## Open Questions

1. **Find a Tender post-Procurement Act 2023 API changes**
   - What we know: The enhanced FTS launched Feb 24, 2025 with new notice types (UK1-UK4). The OCDS API endpoint appears to remain at the same URL.
   - What's unclear: Whether the OCDS API response format has changed for new notice types. The `stages` parameter may have new values.
   - Recommendation: Fetch a small batch first (limit=5) and inspect the response structure before building the full mapper. Handle unknown fields gracefully.

2. **Contracts Finder OCDS endpoint pagination reliability**
   - What we know: The endpoint supports cursor pagination with limit=100.
   - What's unclear: Whether the cursor token expires, and the exact behavior when no more results exist (empty releases array? missing cursor field?).
   - Recommendation: Test pagination manually with a small date range. Handle both empty array and missing cursor as "end of results."

3. **tsx path alias resolution**
   - What we know: tsx v4.21.0 is available. tsconfig has `paths: { "@/*": ["./src/*"] }`.
   - What's unclear: Whether `tsx --tsconfig tsconfig.json` is sufficient to resolve `@/` paths, or if additional configuration (like `tsconfig-paths`) is needed.
   - Recommendation: Test with a minimal script first. Fallback: use relative paths in scripts (e.g., `../../src/models/contract`).

4. **Buyer `contractCount` field updates**
   - What we know: The Buyer model has a `contractCount` field. After ingesting contracts, this should be updated to reflect the actual number of contracts per buyer.
   - What's unclear: Whether to update this during contract ingestion or as a separate post-processing step.
   - Recommendation: Run a separate aggregation pipeline after all contracts are ingested to compute and update `contractCount` for each buyer.

## Sources

### Primary (HIGH confidence)
- Find a Tender OCDS API docs: https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages -- endpoint, parameters, response format, rate limits
- Contracts Finder OCDS API docs: https://www.contractsfinder.service.gov.uk/apidocumentation/Notices/1/GET-Published-Notice-OCDS-Search -- endpoint, parameters, response format
- Contracts Finder V2 API docs: https://www.contractsfinder.service.gov.uk/apidocumentation/Notices/2/POST-rest-searches-search -- V2 notice fields reference
- OCDS 1.1.5 Release Schema: https://standard.open-contracting.org/latest/en/schema/release/ -- canonical field structure
- OCDS Release Schema JSON: https://standard.open-contracting.org/schema/1__1__5/release-schema.json -- full field definitions
- OCP Data Registry - Find a Tender: https://data.open-contracting.org/en/publication/41 -- confirmed public access, data volume, Open Government Licence
- OCP Data Registry - Contracts Finder: https://data.open-contracting.org/en/publication/128 -- confirmed public access, data volume, data quality notes
- MongoDB Atlas M0 limits: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ -- 512 MB storage, 500 connections
- Mongoose 9.x bulkWrite docs: https://mongoosejs.com/docs/api/model.html -- Context7 verified

### Secondary (MEDIUM confidence)
- Kingfisher Collect spiders (uk_fts, united_kingdom_contracts_finder): https://kingfisher-collect.readthedocs.io/en/latest/spiders.html -- confirms no auth needed for OCDS endpoints
- GOV.UK Procurement Act 2023 factsheet: https://assets.publishing.service.gov.uk/media/67bdf4e489b4a58925ac6d53/20250224_Act_Now__Find_a_Tender_Factsheet_v3.0_FINAL.pdf -- Feb 2025 platform changes
- tsx documentation: https://tsx.is/ -- runtime behavior, env loading

### Tertiary (LOW confidence)
- NHS trust board membership data availability: https://www.ethnicity-facts-figures.service.gov.uk/workforce-and-business/workforce-diversity/nhs-trust-board-membership/latest/ -- data exists but individual trust scraping impractical for hackathon
- Open Council Data UK: https://opencouncildata.co.uk/datasets.php -- councillor data available but subscription required for bulk download
- Find a Tender REST API How-To Guide: https://www.find-tender.service.gov.uk/apidocumentation/api-how-to-guide -- documents authenticated eSender API (NOT the OCDS public API we use)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Node.js fetch + Mongoose bulkWrite is well-documented, existing models map cleanly to OCDS
- Architecture: HIGH -- Scripts directory pattern is standard for Next.js projects, tsx is proven
- API endpoints: HIGH -- Verified through official docs, OCP Data Registry, and Kingfisher Collect
- OCDS field mapping: MEDIUM -- OCDS 1.1.5 schema is documented, but Contracts Finder has known data quality issues; real responses may have unexpected shapes
- Seed data strategy: HIGH -- JSON seed files are straightforward; no external dependencies
- Pitfalls: HIGH -- Rate limits, auth confusion, and field inconsistencies are well-documented

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- APIs are stable government services)
