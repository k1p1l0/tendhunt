# Phase 10: Live Data Pipeline - Research

**Researched:** 2026-02-11
**Domain:** Cloudflare Workers cron-based data pipeline, UK procurement API backfill/sync, MongoDB Atlas from Workers
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pull from both Find a Tender (FaT) OCDS API and Contracts Finder (CF) OCDS API
- Fetch ALL historical data available -- not just a time window
- Keep both sources when contracts overlap (same contract in both APIs stored as separate records with source attribution)
- Also sync buyer organizations and board minutes signals -- not just contracts
- Single Cloudflare Worker handles both initial backfill AND ongoing hourly sync
- First runs detect "never synced" state and backfill in chunks across multiple invocations
- Each invocation progresses through history, saves cursor/position, picks up where it left off next run
- No separate local script -- Worker is self-contained
- Target ~6 requests per minute to both APIs (max throughput within government rate limits)
- Exponential backoff on 429 responses with Retry-After header respect
- Government APIs have fixed rate limits -- cannot be increased
- When a contract references an organization not in the buyers collection, automatically create a buyer record
- Extract org name, sector, location from contract OCDS data
- New buyers created as first-class records (not flagged/provisional)
- MongoDB syncJobs collection stores sync metadata per source
- Track: last run timestamp, records fetched, errors encountered, cursor/pagination position for resume
- Enables resumable backfill -- Worker picks up where previous invocation stopped
- Cloudflare Worker with cron trigger (hourly)
- Both FaT and CF checked in the same Worker invocation on the same schedule
- No auto-scoring of new contracts -- users score manually via "Score All" or per-column
- New contracts simply appear in scanner tables on next load

### Claude's Discretion
- Worker code structure and module organization
- Exact chunk size per invocation (balance between Worker CPU limits and progress)
- OCDS field mapping refinements beyond existing mapper
- Error handling strategy for partial failures within a batch
- Whether to use Durable Objects for state or just MongoDB

### Deferred Ideas (OUT OF SCOPE)
- Auto-scoring new contracts in active scanners -- user wants to implement this themselves later
- Real-time push notifications when new high-scoring contracts arrive
- Signal extraction from newly fetched board minutes (currently signals are seeded, not live-extracted)
</user_constraints>

## Summary

Phase 10 replaces the one-time Phase 2 ingestion scripts (`scripts/ingest-fat.ts`, `scripts/ingest-cf.ts`) with a production-grade Cloudflare Worker that runs hourly via cron trigger, syncing all available UK procurement data from both Find a Tender and Contracts Finder OCDS APIs into MongoDB Atlas. The Worker must handle two modes: initial full-history backfill (chunked across multiple hourly invocations) and ongoing delta sync (fetching only new/updated records).

The critical technical challenge is the **MongoDB connectivity issue from Cloudflare Workers**. The existing codebase uses Mongoose extensively, but Mongoose does NOT work in Cloudflare Workers. The native MongoDB Node.js driver (`mongodb` v6.15+) does work as of March 2025 with the `nodejs_compat_v2` compatibility flag, but requires direct driver usage instead of Mongoose. This means the Worker must reimplement the OCDS-to-contract mapping and database operations using the native MongoDB driver rather than importing existing Mongoose models.

The backfill math is significant: Find a Tender has ~376,000 releases and Contracts Finder has ~1,000,000+ releases. At the rate-limited pace of ~6 requests/minute (100 items each), a single invocation can process ~9,000 items in its 15-minute CPU budget. Full backfill will take approximately 6-7 days of hourly Worker runs. The sync progress tracking in MongoDB's `syncJobs` collection is essential for resumability.

**Primary recommendation:** Use a standalone Cloudflare Worker with the native MongoDB driver (NOT Mongoose), cron-triggered hourly. Store sync cursor/progress in a MongoDB `syncJobs` collection. Replicate the OCDS mapper logic from Phase 2 as a pure function within the Worker. Use `nodejs_compat_v2` flag and `mongodb` v6.15+ for database connectivity. Skip Durable Objects -- MongoDB provides sufficient state management for this use case.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mongodb` | ^6.15.0 | Native MongoDB Node.js driver | Only MongoDB driver that works in CF Workers. Mongoose is NOT compatible with CF Workers runtime. Confirmed working by MongoDB PM (Alex Bevilacqua, March 2025) with `nodejs_compat_v2` flag |
| `wrangler` | ^4.4.0 | Cloudflare Workers CLI for dev/deploy | Standard CF Workers tooling, required for cron trigger configuration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@cloudflare/workers-types` | latest | TypeScript types for Workers APIs | For type-safe `ScheduledController`, `Env`, `ExecutionContext` in the scheduled handler |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native MongoDB driver | Mongoose | Mongoose does NOT work in CF Workers (missing `package.json#exports` patch, `fs/promises` issues). Would require Automattic to add official CF support. Not viable. |
| Native MongoDB driver | MongoDB Atlas Data API | Data API was **deprecated Sept 30, 2025** by MongoDB. No longer a viable option. |
| MongoDB for sync state | Durable Objects | Durable Objects add complexity (separate billing, state management API). MongoDB `syncJobs` collection is simpler and the Worker already connects to MongoDB for data writes. DO would only help with connection pooling optimization, which is premature for an hourly cron job. |
| Single Worker cron | Cloudflare Workflows | Workflows offer durable execution with steps and retries, but have a 1,000 subrequest limit (paid) per instance. At 100 items/request, that caps at 100,000 items per workflow run -- insufficient for full backfill of 1.4M records without complex orchestration. Cron Worker with resumable cursor is simpler. |

**Installation:**
```bash
# New Worker project (separate from Next.js app)
npm create cloudflare@latest -- workers/data-sync --type=hello-world --ts
cd workers/data-sync
npm install mongodb
```

## Architecture Patterns

### Recommended Project Structure
```
workers/
└── data-sync/
    ├── wrangler.toml          # Cron trigger config, env vars, compatibility flags
    ├── package.json           # mongodb dependency
    ├── tsconfig.json          # TypeScript config
    └── src/
        ├── index.ts           # Worker entry point: scheduled() handler
        ├── sync-engine.ts     # Core sync logic: backfill detection, chunk processing, cursor management
        ├── api-clients/
        │   ├── fat-client.ts  # Find a Tender OCDS API client (pagination, rate limiting)
        │   └── cf-client.ts   # Contracts Finder OCDS API client (pagination, rate limiting)
        ├── mappers/
        │   └── ocds-mapper.ts # OCDS release → Contract document mapper (port from Phase 2)
        ├── db/
        │   ├── client.ts      # MongoDB native driver connection (MongoClient singleton)
        │   ├── contracts.ts   # Contract collection operations (bulkWrite upsert)
        │   ├── buyers.ts      # Buyer collection operations (auto-extract + upsert)
        │   └── sync-jobs.ts   # SyncJob CRUD (cursor tracking, progress, errors)
        └── types.ts           # Shared TypeScript interfaces (OcdsRelease, SyncJob, Contract, Buyer)
```

### Pattern 1: Resumable Chunked Backfill via SyncJob
**What:** Each hourly Worker invocation reads its current position from a MongoDB `syncJobs` document, fetches a chunk of data from the API, writes results to MongoDB, and updates the cursor position. The next invocation picks up where the previous one stopped.
**When to use:** For the full historical backfill (first N runs) and for regular delta sync (after backfill completes).
**Example:**
```typescript
// src/sync-engine.ts
interface SyncJob {
  _id?: ObjectId;
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER";
  status: "backfilling" | "syncing" | "error";
  cursor: string | null;          // API pagination cursor for resume
  lastSyncedDate: Date | null;    // For delta sync: last updatedFrom/publishedFrom
  totalFetched: number;           // Running total across all invocations
  lastRunAt: Date;
  lastRunFetched: number;         // Items fetched in most recent run
  lastRunErrors: number;          // Errors in most recent run
  errorLog: string[];             // Last N error messages
  createdAt: Date;
  updatedAt: Date;
}

async function processSyncJob(
  db: Db,
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER",
  maxItemsPerRun: number = 9000
): Promise<{ fetched: number; errors: number; done: boolean }> {
  const syncJobs = db.collection<SyncJob>("syncJobs");

  // Get or create sync job
  let job = await syncJobs.findOne({ source });
  if (!job) {
    job = {
      source,
      status: "backfilling",
      cursor: null,
      lastSyncedDate: null,
      totalFetched: 0,
      lastRunAt: new Date(),
      lastRunFetched: 0,
      lastRunErrors: 0,
      errorLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SyncJob;
    const result = await syncJobs.insertOne(job);
    job._id = result.insertedId;
  }

  // Determine mode: backfill (has cursor or never completed) vs delta sync
  const isBackfill = job.status === "backfilling";

  let fetched = 0;
  let errors = 0;
  let currentCursor = job.cursor;
  let done = false;

  while (fetched < maxItemsPerRun) {
    const { releases, nextCursor } = await fetchPage(source, {
      cursor: currentCursor,
      // For delta sync, use date filter
      dateFrom: isBackfill ? undefined : job.lastSyncedDate?.toISOString(),
    });

    if (releases.length === 0) {
      done = true;
      break;
    }

    // Map and upsert
    const { upserted, errored } = await processReleases(db, releases, source);
    fetched += releases.length;
    errors += errored;
    currentCursor = nextCursor;

    // Save progress after each page (crash-safe)
    await syncJobs.updateOne(
      { _id: job._id },
      {
        $set: {
          cursor: currentCursor,
          totalFetched: job.totalFetched + fetched,
          lastRunAt: new Date(),
          lastRunFetched: fetched,
          lastRunErrors: errors,
          updatedAt: new Date(),
        },
      }
    );

    if (!nextCursor) {
      done = true;
      break;
    }
  }

  // If backfill complete, switch to sync mode
  if (done && isBackfill) {
    await syncJobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "syncing",
          cursor: null,
          lastSyncedDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  return { fetched, errors, done };
}
```

### Pattern 2: Native MongoDB Driver Connection in Workers
**What:** Use the `mongodb` npm package directly (not Mongoose) with constrained connection pool settings suited to the serverless Worker environment.
**When to use:** All database operations in the Worker.
**Example:**
```typescript
// src/db/client.ts
import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;

export async function getDb(mongoUri: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 1,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  }
  // MongoClient.connect() is idempotent in v6+
  await client.connect();
  return client.db("tendhunt");
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
```

### Pattern 3: Worker Entry Point with Cron Handler
**What:** Export a `scheduled()` handler that Cloudflare invokes on the cron schedule. Process both FaT and CF in sequence within a single invocation.
**When to use:** The Worker's main entry point.
**Example:**
```typescript
// src/index.ts
import { getDb, closeDb } from "./db/client";
import { processSyncJob } from "./sync-engine";

interface Env {
  MONGODB_URI: string;
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const db = await getDb(env.MONGODB_URI);

    try {
      // Process Find a Tender (allocate ~60% of budget)
      const fatResult = await processSyncJob(db, "FIND_A_TENDER", 5400);
      console.log(`FaT: fetched=${fatResult.fetched}, errors=${fatResult.errors}, done=${fatResult.done}`);

      // Process Contracts Finder (allocate ~40% of budget)
      const cfResult = await processSyncJob(db, "CONTRACTS_FINDER", 3600);
      console.log(`CF: fetched=${cfResult.fetched}, errors=${cfResult.errors}, done=${cfResult.done}`);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      await closeDb();
    }
  },
} satisfies ExportedHandler<Env>;
```

### Pattern 4: Buyer Auto-Extraction from Contract Data
**What:** When processing incoming contracts, check if the buyer organization already exists in the `buyers` collection. If not, auto-create a buyer record from the OCDS party data.
**When to use:** During contract upsert processing.
**Example:**
```typescript
// src/db/buyers.ts
import type { Db } from "mongodb";

interface BuyerRecord {
  name: string;
  orgId: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  contractCount: number;
  contacts: never[];  // Empty -- populated by other sources
  createdAt: Date;
  updatedAt: Date;
}

export async function autoExtractBuyers(
  db: Db,
  contracts: Array<{ buyerName: string; buyerRegion?: string; sector?: string; buyerOrgId?: string }>
): Promise<number> {
  const buyers = db.collection<BuyerRecord>("buyers");
  const uniqueBuyers = new Map<string, BuyerRecord>();

  for (const contract of contracts) {
    const orgId = contract.buyerOrgId || `auto-${slugify(contract.buyerName)}`;
    if (!uniqueBuyers.has(orgId)) {
      uniqueBuyers.set(orgId, {
        name: contract.buyerName,
        orgId,
        sector: contract.sector,
        region: contract.buyerRegion,
        contractCount: 0,
        contacts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (uniqueBuyers.size === 0) return 0;

  const ops = Array.from(uniqueBuyers.values()).map((buyer) => ({
    updateOne: {
      filter: { orgId: buyer.orgId },
      update: {
        $setOnInsert: buyer,  // Only set on new documents, don't overwrite enriched data
        $inc: { contractCount: 1 },
      },
      upsert: true,
    },
  }));

  const result = await buyers.bulkWrite(ops, { ordered: false });
  return result.upsertedCount;
}
```

### Anti-Patterns to Avoid
- **Importing Mongoose models in the Worker:** Mongoose does NOT work in CF Workers. Always use the native `mongodb` driver. Port the schema validation to plain TypeScript interfaces.
- **Not saving cursor after each page:** If the Worker crashes or hits CPU limit mid-batch, unsaved cursor position means re-fetching the entire chunk on the next run.
- **Using wall-clock time as CPU budget estimator:** Worker CPU time and wall clock time are different. Network I/O (fetch calls) does NOT count toward CPU time. The 15-minute CPU limit is generous for this workload since most time is spent waiting on API responses and DB writes.
- **Sharing a MongoClient across invocations without closing:** CF Workers do not guarantee isolate reuse. Always create a fresh connection and close it in `finally`. Set `maxPoolSize: 1` and `minPoolSize: 0`.
- **Fetching without date parameters for backfill:** The Find a Tender API behavior without `updatedFrom` is undocumented. Use `updatedFrom=2021-01-01T00:00:00` (FaT launch date) as the starting point for backfill. For CF, use `publishedFrom=2016-11-01T00:00:00`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MongoDB connectivity in CF Workers | Mongoose adapter/shim | Native `mongodb` v6.15+ driver | Mongoose is not CF-compatible. The native driver works with `nodejs_compat_v2`. Attempting to patch Mongoose is fragile. |
| Rate limiting with backoff | Simple fixed delay | Exponential backoff reading `Retry-After` header | Gov APIs return 429 with `Retry-After`. Fixed delays waste time or get you blocked. |
| Resumable pagination | In-memory cursor tracking | MongoDB `syncJobs` collection | Workers are stateless. Cursor MUST survive across invocations. MongoDB provides crash-safe persistence. |
| OCDS field mapping | Ad-hoc field access | Typed mapper function (port from Phase 2) | OCDS has deeply nested optional fields. A typed mapper catches edge cases systematically. |
| Duplicate detection | Query-before-insert | `bulkWrite` with `updateOne` + `upsert: true` on `{source, noticeId}` compound index | Atomic, idempotent, handles concurrent writes. Same pattern proven in Phase 2. |

**Key insight:** The biggest "don't hand-roll" is the MongoDB connectivity. Do NOT attempt to make Mongoose work in CF Workers. The native driver is the only path that works, and it's been confirmed by MongoDB's own product team.

## Common Pitfalls

### Pitfall 1: Mongoose Does Not Work in Cloudflare Workers
**What goes wrong:** Importing Mongoose in a CF Worker build fails with `fs/promises` module errors, or the browser bundle gets loaded instead of the Node.js bundle.
**Why it happens:** Mongoose relies on Node.js APIs that CF Workers either doesn't support or polyfills imperfectly. The Mongoose GitHub issue (#14613) confirms "we haven't tested Mongoose with Cloudflare Workers at all."
**How to avoid:** Use the native `mongodb` driver v6.15+. Set `compatibility_flags = ["nodejs_compat_v2"]` and `compatibility_date` to a recent date (2025-03-20 or later). Define TypeScript interfaces that mirror the existing Mongoose schemas but don't import them.
**Warning signs:** Build errors mentioning `fs/promises`, `node:async_hooks`, or `Cannot find module 'mongoose'`. Runtime errors about missing Node.js built-ins.

### Pitfall 2: MongoDB Atlas Data API is Deprecated
**What goes wrong:** Planning to use the MongoDB Atlas Data API (HTTP REST interface) which seemed like the perfect CF Workers solution.
**Why it happens:** MongoDB deprecated the Data API on September 30, 2025. The documentation is now marked as "(Deprecated)" and the service is no longer available.
**How to avoid:** Use the native MongoDB driver with TCP socket support (available since `nodejs_compat_v2`).
**Warning signs:** HTTP 404 or 410 responses from Atlas Data API endpoints.

### Pitfall 3: Worker CPU Time Exceeded During Backfill
**What goes wrong:** The Worker hits the 15-minute CPU time limit mid-batch and gets terminated, losing progress.
**Why it happens:** Over-ambitious chunk sizes, or misunderstanding CPU time vs wall-clock time.
**How to avoid:** Save cursor position to MongoDB after EVERY page fetch (not just at the end of the run). Set a conservative `maxItemsPerRun` (9,000 items = ~90 pages). Note: network I/O does NOT count toward CPU time -- most of the "time" is waiting for API responses and DB writes, which is wall-clock time, not CPU time. The actual CPU usage for JSON parsing and mapping is relatively low.
**Warning signs:** Worker logs showing "Worker exceeded CPU time limit" or incomplete sync runs.

### Pitfall 4: Find a Tender API Rejects Comma-Separated Stages
**What goes wrong:** Passing `stages=tender,award` to the FaT API returns 0 results.
**Why it happens:** Unlike Contracts Finder, the FaT API does NOT support comma-separated stage parameters. This was discovered and documented during Phase 2 (Plan 02-01).
**How to avoid:** Fetch each stage separately for FaT (tender, then award). Contracts Finder supports `stages=tender,award` in a single request.
**Warning signs:** Zero releases returned despite wide date ranges.

### Pitfall 5: Find a Tender Uses `links.next` Not Bare Cursors
**What goes wrong:** Building pagination URLs by appending `?cursor=TOKEN` fails with HTTP 400.
**Why it happens:** The FaT API returns a full URL in `links.next` (not a bare cursor token). Phase 2 discovered this: "FaT API uses links.next full URLs for pagination (not bare cursor tokens)."
**How to avoid:** For FaT, follow `response.links.next` as a complete URL. For CF, use the bare cursor token with URL construction. The api-client must support both patterns.
**Warning signs:** HTTP 400 errors with "cursor must match returned nextCursor."

### Pitfall 6: Connection Pooling Waste in Serverless
**What goes wrong:** Setting high `maxPoolSize` on MongoClient in a CF Worker wastes connections and can cause connection storms on MongoDB Atlas M0 (500 connection limit).
**Why it happens:** Each Worker invocation creates a new isolate. Connection pools don't persist across invocations.
**How to avoid:** Set `maxPoolSize: 1`, `minPoolSize: 0`, `serverSelectionTimeoutMS: 5000`. Always `client.close()` in a `finally` block. An hourly cron Worker creates only 1 connection per hour -- far below M0 limits.
**Warning signs:** MongoDB Atlas showing high connection count, or "MongoServerSelectionError: Server selection timed out."

### Pitfall 7: Contracts Finder Data Quality Issues
**What goes wrong:** Mapping crashes on empty buyer names, missing classifications, unrealistic dates.
**Why it happens:** Contracts Finder OCDS implementation has documented data quality issues (OCP Data Registry): "empty critical fields like supplier names", "unrealistic date fields", "duplicate supplier IDs."
**How to avoid:** The mapper must use null-safe access (`?.`) for ALL optional OCDS fields. Wrap individual release mapping in try/catch to prevent one bad record from killing the batch. Default buyer name to "Unknown", empty CPV array, etc.
**Warning signs:** Runtime errors like "Cannot read properties of undefined" during batch processing.

## Code Examples

Verified patterns from official sources:

### Wrangler Configuration for Cron Worker with MongoDB
```toml
# workers/data-sync/wrangler.toml
name = "tendhunt-data-sync"
main = "src/index.ts"
compatibility_date = "2025-03-20"
compatibility_flags = ["nodejs_compat_v2"]

[triggers]
crons = ["0 * * * *"]  # Every hour at minute 0

[limits]
cpu_ms = 900000  # 15 minutes (maximum for hourly cron)

# MONGODB_URI stored as secret via: wrangler secret put MONGODB_URI
```
Source: Cloudflare Workers cron trigger docs + Alex Bevilacqua's MongoDB+Workers blog post (March 2025)

### Native MongoDB Driver Upsert (replacing Mongoose bulkWrite)
```typescript
// Port of Phase 2 Mongoose pattern to native driver
import type { Db, BulkWriteResult } from "mongodb";

interface MappedContract {
  source: string;
  noticeId: string;
  ocid?: string;
  title: string;
  description?: string;
  status: string;
  stage: string;
  buyerName: string;
  buyerRegion?: string;
  cpvCodes: string[];
  sector?: string;
  valueMin?: number;
  valueMax?: number;
  currency: string;
  publishedDate?: Date;
  deadlineDate?: Date;
  sourceUrl?: string;
  rawData: unknown;
}

export async function upsertContracts(
  db: Db,
  contracts: MappedContract[]
): Promise<BulkWriteResult> {
  const collection = db.collection("contracts");

  const ops = contracts.map((doc) => ({
    updateOne: {
      filter: { source: doc.source, noticeId: doc.noticeId },
      update: {
        $set: {
          ...doc,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  return collection.bulkWrite(ops, { ordered: false });
}
```
Source: MongoDB Node.js Driver v6.14 bulkWrite docs + Phase 2 Mongoose pattern adapted

### Rate-Limited Fetch with Exponential Backoff
```typescript
// src/api-clients/rate-limiter.ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithBackoff(
  url: string,
  maxRetries: number = 5
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "0", 10);
      // Exponential backoff: 10s, 20s, 40s, 80s, 160s
      const backoff = retryAfter > 0
        ? retryAfter * 1000
        : Math.min(10000 * Math.pow(2, attempt), 300000);
      console.warn(
        `Rate limited (${res.status}). Attempt ${attempt + 1}/${maxRetries}. ` +
        `Waiting ${backoff / 1000}s...`
      );
      await sleep(backoff);
      continue;
    }

    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

// Polite delay between requests (~6 req/min = 10s between requests)
export async function fetchWithDelay(
  url: string,
  delayMs: number = 10000
): Promise<Response> {
  const res = await fetchWithBackoff(url);
  await sleep(delayMs);
  return res;
}
```
Source: Phase 2 api-client.ts pattern + gov API rate limit documentation

### OCDS Mapper (Native Driver Version)
```typescript
// src/mappers/ocds-mapper.ts
// Port of scripts/lib/ocds-mapper.ts for use in CF Worker
// Key difference: returns plain objects (not Mongoose documents)

interface OcdsRelease {
  ocid: string;
  id: string;
  date: string;
  tag: string[];
  tender?: {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    tenderPeriod?: { endDate?: string };
    classification?: { id?: string; description?: string };
    items?: Array<{
      classification?: { id?: string; description?: string };
    }>;
  };
  parties?: Array<{
    name: string;
    id?: string;
    roles?: string[];
    address?: { region?: string; locality?: string };
  }>;
  buyer?: { name?: string; id?: string };
}

// Same CPV_SECTOR_MAP from Phase 2 ocds-mapper.ts
// (35+ divisions covering all CPV 2-digit codes)

export function mapOcdsToContract(
  release: OcdsRelease,
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER"
) {
  const buyer = release.parties?.find((p) => p.roles?.includes("buyer"));
  const cpvCodes = [
    ...(release.tender?.items
      ?.map((item) => item.classification?.id)
      .filter(Boolean) as string[] ?? []),
    ...(release.tender?.classification?.id ? [release.tender.classification.id] : []),
  ];

  return {
    ocid: release.ocid,
    noticeId: release.id,
    source,
    sourceUrl: source === "FIND_A_TENDER"
      ? `https://www.find-tender.service.gov.uk/Notice/${release.id}`
      : `https://www.contractsfinder.service.gov.uk/Notice/${release.id}`,
    title: release.tender?.title ?? "Untitled",
    description: release.tender?.description ?? null,
    status: mapStatus(release.tender?.status),
    stage: mapStage(release.tag),
    buyerName: buyer?.name ?? release.buyer?.name ?? "Unknown",
    buyerRegion: buyer?.address?.region ?? null,
    cpvCodes,
    sector: deriveSectorFromCpv(cpvCodes[0]),
    valueMin: release.tender?.value?.amount ?? null,
    valueMax: release.tender?.value?.amount ?? null,
    currency: release.tender?.value?.currency ?? "GBP",
    publishedDate: release.date ? new Date(release.date) : null,
    deadlineDate: release.tender?.tenderPeriod?.endDate
      ? new Date(release.tender.tenderPeriod.endDate)
      : null,
    rawData: release,
  };
}
```

## Backfill Math & Capacity Planning

### Data Volumes (as of Feb 2026)
| Source | Tenders | Awards | Total Releases (est.) | Since |
|--------|---------|--------|----------------------|-------|
| Find a Tender | 162,773 | 213,870 | ~376,000 | Jan 2021 |
| Contracts Finder | 577,852 | 423,898 | ~1,000,000 | Nov 2016 |
| **Total** | | | **~1,376,000** | |

### Per-Invocation Budget (Hourly Cron, Paid Plan)
| Resource | Limit | Usage Pattern |
|----------|-------|---------------|
| CPU time | 15 minutes | Most time is I/O wait (fetch + DB), not CPU. JSON parsing ~1ms/release. |
| Subrequests | 10,000 | Each API page = 1 fetch. Each DB bulkWrite = 1+ operations. ~90 API pages + ~90 DB writes = ~180 subrequests per run. Well within limit. |
| Memory | 128 MB | 100 releases at ~5KB each = 500KB per page. Streaming pages, not accumulating. Fine. |
| Wall clock | No hard limit | ~15 minutes at 6 req/min rate limit |

### Backfill Timeline
| Phase | Items | Pages (100/page) | Time per run | Runs needed | Days |
|-------|-------|------------------|-------------|-------------|------|
| FaT backfill | ~376,000 | ~3,760 | 90 pages/hour | ~42 | ~1.75 |
| CF backfill | ~1,000,000 | ~10,000 | 90 pages/hour | ~111 | ~4.6 |
| **Total backfill** | ~1,376,000 | ~13,760 | | ~153 | **~6.4 days** |

After backfill, delta sync is fast: typically <100 new releases per hour from both APIs combined.

### MongoDB Atlas M0 Storage Impact
| Data | Size Estimate |
|------|---------------|
| 1.4M contracts @ ~3KB each (without rawData) | ~4.2 GB |
| 1.4M contracts @ ~8KB each (with rawData) | ~11.2 GB |
| M0 free tier limit | 512 MB |

**CRITICAL:** Full historical backfill with rawData will exceed the M0 512 MB limit by a wide margin. Options:
1. **Upgrade to M2/M5/M10** ($9-57/month) for 2-10 GB storage
2. **Strip rawData** from stored documents (reduce to ~3KB each, still over 512 MB for full data)
3. **Limit historical depth** (e.g., last 2 years only = ~250K records = ~750 MB without rawData)
4. **Drop rawData field** and store only mapped fields (~3KB * 1.4M = ~4.2 GB, still needs M10)

Recommendation: Discuss with user. Most practical for M0: store last 1-2 years (~250K records) without rawData (~750 MB), or upgrade to M2 ($9/month) for 2 GB.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MongoDB Atlas Data API (HTTP) for CF Workers | Native MongoDB driver via TCP sockets | March 2025 (mongodb 6.15+ with `nodejs_compat_v2`) | Data API deprecated Sept 2025. Native driver is now the only option. |
| One-time scripts for data seeding (Phase 2) | Cloudflare Worker cron for continuous sync | This phase | Replaces manual `npm run ingest:fat` / `npm run ingest:cf` |
| Mongoose for all MongoDB operations | Native driver in Workers, Mongoose in Next.js app | This phase | Workers environment requires native driver. Next.js app continues to use Mongoose. |

**Deprecated/outdated:**
- MongoDB Atlas Data API: Deprecated September 30, 2025. DO NOT USE.
- MongoDB Realm SDK: Also deprecated as part of Atlas App Services EOL.
- `nodejs_compat` (v1) flag: Superseded by `nodejs_compat_v2`. Use the v2 flag with a compatibility date >= 2024-09-23.

## Open Questions

1. **MongoDB Atlas M0 storage limits vs full backfill**
   - What we know: Full historical data (1.4M records with rawData) would require ~11 GB. Even without rawData, ~4.2 GB. M0 free tier is 512 MB.
   - What's unclear: User's willingness to upgrade Atlas tier or limit historical depth.
   - Recommendation: Start with a limited backfill (e.g., last 2 years, no rawData) to stay within M0. Add a configurable `BACKFILL_START_DATE` env var so it can be adjusted. Flag this as a decision point for the user.

2. **Find a Tender API behavior without updatedFrom parameter**
   - What we know: The API docs list `updatedFrom` as optional. Kingfisher Collect's spider defaults to `2021-01-01T00:00:00`.
   - What's unclear: Whether omitting `updatedFrom` returns ALL records from Jan 2021 or returns nothing / recent only.
   - Recommendation: Use explicit `updatedFrom=2021-01-01T00:00:00` for backfill to be safe. This matches Kingfisher Collect's behavior and ensures deterministic results.

3. **Contracts Finder pagination reliability for deep historical fetches**
   - What we know: CF has ~1M releases since Nov 2016. Cursor pagination works for small date ranges (tested in Phase 2 with 60-day window).
   - What's unclear: Whether cursors remain valid across many hours/days of backfill. Whether pagination works for 10,000+ pages.
   - Recommendation: If cursor errors occur during deep backfill, fall back to date-windowed fetching (e.g., 1-month chunks). Save both cursor AND current date window in syncJob for recovery.

4. **Worker cold start + MongoDB connection latency**
   - What we know: Each hourly invocation creates a new connection (~2s for cold connect). Alex Bevilacqua notes Durable Objects can reduce this to ~300ms via connection reuse.
   - What's unclear: Whether 2s cold connect per hour is acceptable (it likely is for an hourly batch job).
   - Recommendation: Accept 2s cold connect overhead for now. An hourly cron job spending 2s on connection setup out of 15 minutes is negligible (<0.3% overhead). Durable Objects optimization is premature.

## Discretion Recommendations

### Worker Code Structure
**Recommendation:** Separate Worker project under `workers/data-sync/` (not inside the Next.js app). This follows the existing pattern (`landing/workers/blog-proxy/`). The Worker has its own `package.json`, `wrangler.toml`, and `tsconfig.json`. It does NOT import from `src/` (different runtime, different bundler).

### Chunk Size Per Invocation
**Recommendation:** 9,000 items per invocation (split 5,400 FaT + 3,600 CF). This is ~90 API requests at 100 items/page, completing in ~15 minutes at 6 req/min rate. Conservative enough to stay within CPU limits, aggressive enough to complete backfill in ~6.4 days.

### OCDS Field Mapping
**Recommendation:** Port the existing mapper from `scripts/lib/ocds-mapper.ts` almost verbatim. Change: return plain objects instead of Mongoose partial types. Keep the same CPV sector map, status mapping, stage mapping, and null-safe access patterns. Don't refine beyond what Phase 2 proved works.

### Error Handling for Partial Failures
**Recommendation:** Per-release try/catch (same pattern proven in Phase 2 Plan 02-02). Failed individual releases are logged to `syncJob.errorLog[]` (keep last 100 entries) and skipped. `bulkWrite({ ordered: false })` continues on individual document errors. The overall invocation succeeds even if some records fail. Persistent failures for a specific release get skipped on subsequent runs since cursor advances past them.

### Durable Objects vs MongoDB for State
**Recommendation:** Use MongoDB only. Durable Objects would add complexity (separate binding, billing, state management API) for marginal benefit. The `syncJobs` collection in MongoDB provides:
- Crash-safe cursor persistence (written after each page)
- Cross-invocation state (survives Worker restarts)
- Observable progress (queryable from the Next.js app)
- Simpler deployment (no DO class binding in wrangler.toml)
The only advantage of DO would be connection pooling (~300ms vs ~2000ms connect time), which is irrelevant for an hourly batch job.

## Sources

### Primary (HIGH confidence)
- Alex Bevilacqua (MongoDB Product Manager), "Cloudflare Workers and MongoDB" (March 2025): https://alexbevi.com/blog/2025/03/25/cloudflare-workers-and-mongodb/ -- Confirmed native MongoDB driver v6.15+ works with `nodejs_compat_v2`. Exact wrangler.toml config and code pattern.
- Cloudflare Workers Limits docs: https://developers.cloudflare.com/workers/platform/limits/ -- CPU time (15 min for hourly cron), subrequests (10,000 paid), memory (128 MB)
- Cloudflare Workers Cron Triggers docs: https://developers.cloudflare.com/workers/configuration/cron-triggers/ -- Cron syntax, wrangler config, scheduled handler API
- Cloudflare Workers Scheduled Handler docs: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/ -- TypeScript handler signature, `ScheduledController`, `ExecutionContext`
- MongoDB Node.js Driver v6.14 bulkWrite docs: https://www.mongodb.com/docs/drivers/node/v6.14/usage-examples/bulkwrite/ -- Native driver bulkWrite pattern
- MongoDB Atlas Data API deprecation notice: https://www.mongodb.com/community/forums/t/mongodb-atlas-data-api-and-custom-https-endpoints-end-of-life-and-deprecation/296686 -- Confirmed EOL September 30, 2025
- OCP Data Registry - Find a Tender: https://data.open-contracting.org/en/publication/41 -- 162,773 tenders, 213,870 awards, data quality notes
- OCP Data Registry - Contracts Finder: https://data.open-contracting.org/en/publication/128 -- 577,852 tenders, 423,898 awards, data quality notes
- Phase 2 Research & Plans: `.planning/phases/02-data-pipeline/02-RESEARCH.md`, `02-01-PLAN.md`, `02-02-PLAN.md` -- API endpoints, pagination patterns, field mapping, rate limit behavior

### Secondary (MEDIUM confidence)
- Cloudflare workerd GitHub Discussion #2721: https://github.com/cloudflare/workerd/discussions/2721 -- Community reports on MongoDB driver + Workers compatibility, Mongoose export patch workaround
- Mongoose GitHub Issue #14613: https://github.com/Automattic/mongoose/issues/14613 -- Official Mongoose maintainer confirms no CF Workers support, no Realm driver planned
- Cloudflare Workflows Limits docs: https://developers.cloudflare.com/workflows/reference/limits/ -- 1,000 subrequest limit makes Workflows unsuitable for large backfills
- Kingfisher Collect spider docs: https://kingfisher-collect.readthedocs.io/en/latest/spiders.html -- FaT spider defaults to `from_date=2021-01-01T00:00:00`, uses LinksSpider pagination pattern

### Tertiary (LOW confidence)
- Cloudflare Blog "A year of improving Node.js compatibility" (2025): https://blog.cloudflare.com/nodejs-workers-2025/ -- General Node.js compatibility improvements, but specific MongoDB details not confirmed from this source
- Find a Tender API docs: https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages -- Parameter list confirmed, but behavior without date filters is undocumented

## Metadata

**Confidence breakdown:**
- MongoDB connectivity from CF Workers: HIGH -- Confirmed by MongoDB PM's March 2025 blog post with working code + wrangler config
- Worker cron trigger mechanics: HIGH -- Official CF docs, well-documented API with TypeScript types
- Backfill math and capacity: MEDIUM-HIGH -- Based on OCP Data Registry counts (independently verified) and CF Workers limits (official docs). Actual throughput may vary with API responsiveness.
- OCDS mapper port: HIGH -- Same logic as Phase 2, proven to work with both APIs
- M0 storage limits: HIGH -- Official MongoDB docs. Full backfill WILL exceed M0. This is a user decision point.
- Mongoose incompatibility: HIGH -- Confirmed by Mongoose maintainers (GitHub #14613) and multiple community reports

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- APIs stable, CF Workers compatibility flags are versioned)
