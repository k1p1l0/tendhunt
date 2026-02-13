# Phase 20: Board Minutes Signal Extraction - Research

**Researched:** 2026-02-12
**Domain:** Cloudflare Worker + LLM signal extraction + MongoDB pipeline + Next.js UI
**Confidence:** HIGH

## Summary

Phase 20 builds a **new Cloudflare Worker** (`apps/workers/board-minutes/`) that processes `BoardDocument` records for Tier 0 buyers, extracts structured buying signals using Claude Haiku, and stores them as `Signal` records linked to buyers. The existing UI infrastructure (Signal model, Signals tab on buyer profile, "meetings" scanner type) is already wired up and functional -- it just has 119 dummy/seeded signals and 0 board documents with text content (enrichment pipeline is currently at stage 2 of 8, so stages 5-6 that create BoardDocuments haven't run yet).

The reference project at `/Users/kirillkozak/Projects/board-minutes-intelligence` provides a proven signal extraction service using GPT-4o-mini with 4000-char chunking, 6 signal types, deduplication, and JSON parsing. This needs adaptation from OpenAI to Anthropic Claude Haiku (already the standard across all TendHunt workers).

**Primary recommendation:** Clone the enrichment/spend-ingest worker architecture pattern (sequential stages, cursor-based resume, `StageFn` interface, `*-engine.ts` orchestrator, `*-jobs` collection) for the new board-minutes worker. Adapt the reference project's signal extraction prompt for Claude Haiku. Enhance the existing Signal model with `boardDocumentId` and `quote` fields. Upgrade the existing SignalsTab with filtering by signal type.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mongodb` | `^6.16.0` | Direct MongoDB driver (no Mongoose in Workers) | All 3 existing workers use this |
| `@anthropic-ai/sdk` | `^0.39.0` | Claude Haiku API for signal extraction | Already in enrichment + spend-ingest workers |
| `p-limit` | `^6.2.0` | Concurrency control for Claude API calls | Pattern from enrichment Stage 5 (personnel) |
| `wrangler` | `^4.12.0` | Cloudflare Worker build/deploy | All workers |
| `@cloudflare/workers-types` | `^4.20250312.0` | Worker type definitions | All workers |
| `typescript` | `^5.8.0` | TypeScript compiler | All workers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/node` | `^22.0.0` | Node.js type definitions | Worker devDependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Haiku | GPT-4o-mini (reference project) | TendHunt standardized on Anthropic; Claude Haiku already has secret set in all workers; cheaper and no new API key needed |
| New standalone worker | Add stages to enrichment worker | User explicitly decided: new worker; keeps enrichment worker focused on buyer metadata, new worker focused on signal extraction from documents |

**Installation:**
```bash
cd apps/workers/board-minutes
bun install mongodb@^6.16.0 @anthropic-ai/sdk@^0.39.0 p-limit@^6.2.0
bun install -D @cloudflare/workers-types@^4.20250312.0 @types/node@^22.0.0 typescript@^5.8.0 wrangler@^4.12.0
```

## Architecture Patterns

### Recommended Project Structure
```
apps/workers/board-minutes/
├── src/
│   ├── index.ts                    # Worker entry (fetch/scheduled handlers, /run, /run-buyer, /debug, /health)
│   ├── signal-engine.ts            # Pipeline orchestrator (findCurrentStage, process loop)
│   ├── types.ts                    # Env, stage types, job doc interface, StageFn
│   ├── db/
│   │   ├── client.ts               # MongoDB client (copy from enrichment)
│   │   └── signal-jobs.ts          # getOrCreateJob, updateJobProgress, markComplete/Error
│   └── stages/
│       ├── 01-extract-signals.ts   # Core: chunking + Claude Haiku signal extraction per BoardDocument
│       └── 02-deduplicate.ts       # Dedup same-type signals within same buyer + time window
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Pattern 1: Worker Entry Point (from enrichment/spend-ingest)
**What:** Standard Cloudflare Worker with fetch handler (HTTP routes) + scheduled handler (cron)
**When to use:** Every TendHunt worker follows this exact pattern
**Example:**
```typescript
// Source: apps/workers/enrichment/src/index.ts (verified in codebase)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/run-buyer") { /* single-buyer processing */ }
    if (url.pathname === "/run") { /* batch processing with ?max= param */ }
    if (url.pathname === "/debug") { /* collection stats + job states */ }
    if (url.pathname === "/health") { /* health check */ }
    return new Response("tendhunt-board-minutes worker", { status: 200 });
  },
  async scheduled(_controller, env, _ctx): Promise<void> {
    await runPipeline(env);
  },
} satisfies ExportedHandler<Env>;
```

### Pattern 2: Stage Function Signature (from enrichment/spend-ingest)
**What:** All stages follow a uniform `StageFn` interface with cursor-based pagination
**When to use:** Every pipeline stage
**Example:**
```typescript
// Source: apps/workers/enrichment/src/types.ts (verified in codebase)
export type StageFn = (
  db: Db,
  env: Env,
  job: SignalJobDoc,
  maxItems: number
) => Promise<{ processed: number; errors: number; done: boolean }>;
```

### Pattern 3: Claude Haiku Extraction (from enrichment Stage 5 personnel)
**What:** Call Claude Haiku with structured prompt, parse JSON array response, handle markdown code blocks
**When to use:** Signal extraction from board document text
**Example:**
```typescript
// Source: apps/workers/enrichment/src/stages/05-personnel.ts (verified in codebase)
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20250401",
  max_tokens: 2000,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
});
const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
// Parse JSON array from response (may be surrounded by markdown)
const match = responseText.match(/\[[\s\S]*\]/);
```

### Pattern 4: Text Chunking (from reference project)
**What:** Split long document text into overlapping chunks for LLM processing
**When to use:** BoardDocument textContent can be up to 10,000 chars (truncated in Stage 4 scrape)
**Example:**
```typescript
// Source: /Users/kirillkozak/Projects/board-minutes-intelligence/tendhunt-api/src/services/signal-extraction.ts
private maxChunkChars = 4000;
private overlapChars = 200;
// Chunks text at paragraph or sentence boundaries
// Overlap prevents losing context at chunk boundaries
```

### Pattern 5: Worker Chaining (from enrichment -> spend-ingest)
**What:** Fire-and-forget HTTP call to trigger downstream worker
**When to use:** enrichment worker chains to board-minutes worker after `all_complete` or after single-buyer enrichment
**Example:**
```typescript
// Source: apps/workers/enrichment/src/index.ts lines 41-48 (verified in codebase)
if (result.stage === "all_complete") {
  console.log("All enrichment stages complete. Triggering spend ingest...");
  try {
    const spendRes = await fetch(`${env.SPEND_INGEST_WORKER_URL}/run`);
    // fire-and-forget
  } catch (err) {
    console.error("Spend ingest trigger failed:", err);
  }
}
```

### Anti-Patterns to Avoid
- **Adding stages to the enrichment worker:** User explicitly decided this should be a separate worker. Don't add signal extraction as Stage 9 of enrichment.
- **Processing all 2,384 buyers:** Focus on Tier 0 only (735 buyers with `dataSourceId`). Tier 1 buyers have no governance data and no board documents.
- **Scoring all documents simultaneously:** BoardDocuments can be 10K chars. With 4K chunk size and overlap, that's 3 chunks per doc. For 735 buyers with 3 docs each, that's ~6,600 Claude API calls. Use budget limits (maxItems) and cursor-based resume.
- **Storing raw LLM responses:** Parse and validate the JSON output before storing. The reference project's `parseSignals` and `isValidSignal` pattern is the right approach.

## Existing Infrastructure (Already Built)

### Signal Model (`apps/web/src/models/signal.ts`)
The Signal model already exists with the correct 6 signal types and all required fields:
```typescript
signalSchema = {
  organizationName: String (required, indexed),
  buyerId: ObjectId (ref: "Buyer"),
  signalType: enum ["PROCUREMENT","STAFFING","STRATEGY","FINANCIAL","PROJECTS","REGULATORY"] (required, indexed),
  title: String (required),
  insight: String (required),
  source: String,
  sourceDate: Date (indexed),
  sector: String (indexed),
  confidence: Number (0-1, default 0.8),
  // timestamps: true (createdAt, updatedAt)
}
// Text index on: title, insight
```

**Schema additions needed:**
- `boardDocumentId: ObjectId` (ref: "BoardDocument") -- link signal to source document
- `quote: String` -- verbatim quote from source text (from reference project)
- `entities: Object` -- extracted entities: companies, amounts, dates, people (from reference project)

### Signals Tab (`apps/web/src/components/buyers/signals-tab.tsx`)
Already exists and is functional. Displays signal cards with type badge (color-coded), date, title, insight, and source. Currently shows "No buying signals found" for buyers without signals.

**Enhancements needed:**
- Add signal type filter (dropdown/toggle pills for the 6 types)
- Add signal count badge per type
- Show quote if present
- Show entities if present

### Buyer Profile Page (`apps/web/src/app/(dashboard)/buyers/[id]/page.tsx`)
Already fetches signals via `fetchBuyerById()` which queries:
```typescript
Signal.find({ organizationName: buyer.name }).sort({ sourceDate: -1 }).lean()
```
**Note:** Signals are matched by `organizationName` (string match), not by `buyerId`. This means the worker needs to set both `buyerId` AND `organizationName` on new signals. The `buyerId` field exists but is not used in the query -- this should be changed to use `buyerId` for reliability.

### Scanner "meetings" Type
The "meetings" scanner type already loads Signal records:
```typescript
// apps/web/src/app/api/scanners/[id]/score/route.ts
case "meetings":
  entities = await Signal.find({}).select("organizationName signalType title insight sector sourceDate").lean();
```

Scanner columns for meetings: Organization, Signal (title), Type (signalType), Date (sourceDate).

Default AI columns: "Relevance Score" and "Buying Intent".

### Dashboard Fresh Signals Feed
`apps/web/src/components/dashboard/fresh-signals-feed.tsx` shows top AI-scored matches from scanners. This will automatically pick up new real signals once they exist.

### Existing Dummy Data
119 signals exist in the database -- these appear to be seeded dummy data (sector: "LOCAL_COUNCIL", no title/insight/organizationName visible in projection). These will need to be cleaned up or replaced when real signals flow in.

### Board Documents Collection
Currently **0 documents** in `boarddocuments` collection. The enrichment pipeline is at Stage 2 (website_discovery, 1,980 processed). Stages 3-6 (moderngov, scrape, personnel, score) have not yet run. BoardDocuments will be created by:
- **Stage 3 (moderngov):** ModernGov SOAP API calls create BoardDocument records with `extractionStatus: "pending"`
- **Stage 4 (scrape):** HTML scraping creates BoardDocuments with `extractionStatus: "extracted"` and `textContent` (up to 10,000 chars)

The board-minutes worker depends on BoardDocuments existing with `extractionStatus: "extracted"` and non-empty `textContent`.

### Buyers with DataSourceId (Tier 0)
735 buyers currently have `dataSourceId` set (matched to DataSource via enrichment Stage 1 classify). These are the Tier 0 targets.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text chunking with overlap | Custom character splitting | Port `chunkText()` from reference project | Handles paragraph/sentence boundaries, overlap prevents context loss at edges |
| Signal deduplication | Simple exact-match dedup | Port `deduplicateSignals()` from reference project | Uses keyword extraction + type for fuzzy dedup across chunks |
| JSON parsing from LLM output | Naive `JSON.parse()` | Port `parseSignals()` from reference project | Handles markdown code blocks (`\`\`\`json`), validates required fields, normalizes types |
| Pipeline orchestration | Custom state machine | Clone enrichment-engine.ts pattern | Cursor-based resume, error recovery, job tracking -- all battle-tested |
| MongoDB client for Workers | Mongoose (web app only) | Direct `mongodb` driver via `db/client.ts` pattern | Mongoose doesn't work in Cloudflare Workers; all 3 workers use raw driver |
| Rate limiting Claude API | Raw `Promise.all()` | `p-limit(2)` concurrency control | Same pattern as enrichment Stage 5 personnel extraction; prevents burning API budget |

**Key insight:** 90% of this worker is structural boilerplate cloned from the enrichment/spend-ingest workers. The only truly new logic is the signal extraction prompt + chunking + dedup, which the reference project provides proven implementations for.

## Common Pitfalls

### Pitfall 1: BoardDocuments Not Yet Available
**What goes wrong:** Worker runs but finds 0 documents to process because enrichment pipeline hasn't reached stages 3-6 yet.
**Why it happens:** Enrichment is at stage 2 (website_discovery). ModernGov (stage 3) and scrape (stage 4) create the BoardDocuments.
**How to avoid:** The worker should gracefully handle 0 documents (mark stage as complete with 0 processed). It will naturally pick up documents on next cron run after enrichment progresses. Do NOT make the board-minutes worker dependent on enrichment completion -- let them run independently.
**Warning signs:** Worker logs show "0 buyers with board documents" repeatedly.

### Pitfall 2: Signal organizationName vs buyerId Mismatch
**What goes wrong:** Signals created with `buyerId` but the buyer profile page queries by `organizationName` string match. If buyer names change or have slight variations, signals become orphaned.
**Why it happens:** `fetchBuyerById()` in `apps/web/src/lib/buyers.ts` line 102 queries `Signal.find({ organizationName: buyer.name })`.
**How to avoid:** The new worker should set BOTH `buyerId` (ObjectId) AND `organizationName` (string). Also update `fetchBuyerById()` to query by `buyerId` instead of `organizationName` for reliability.
**Warning signs:** Signals appear in the global API but not on the buyer profile page.

### Pitfall 3: Claude Token Limits with Large Documents
**What goes wrong:** Sending full 10K-char documents to Claude Haiku exceeds useful context window or produces low-quality extractions.
**Why it happens:** Board documents are truncated at 10,000 chars in scrape stage, but LLM extraction quality degrades with very long unstructured input.
**How to avoid:** Chunk at 4,000 chars with 200-char overlap (reference project pattern). Process chunks sequentially, deduplicate signals across chunks.
**Warning signs:** Very long response times, low confidence scores, duplicate signals.

### Pitfall 4: Cloudflare Worker Wall-Clock Timeout
**What goes wrong:** Worker execution exceeds Cloudflare's 30-second CPU time limit (free tier) or 30-minute wall-clock limit (paid).
**Why it happens:** Processing many buyers with multiple Claude API calls per buyer.
**How to avoid:** Use maxItems budget (e.g., 100 buyers per cron run), save cursor after EVERY batch. Same crash-safe pattern as enrichment worker.
**Warning signs:** Worker crashes mid-run without saving progress.

### Pitfall 5: Duplicate Signals Across Runs
**What goes wrong:** Same signal extracted multiple times when the worker re-processes the same BoardDocument.
**Why it happens:** No tracking of which BoardDocuments have been processed for signal extraction.
**How to avoid:** Add `signalExtractionStatus` field to BoardDocument model (like `extractionStatus` pattern), or track processed document IDs in the buyer's `enrichmentSources` array. Use `boardDocumentId` unique constraint on signals.
**Warning signs:** Signal counts inflate on each worker run.

### Pitfall 6: Enrichment Worker Env Var Not Updated
**What goes wrong:** Enrichment worker doesn't chain to board-minutes worker because `BOARD_MINUTES_WORKER_URL` env var is not set.
**Why it happens:** Forgetting to add the new env var to enrichment worker's `wrangler.toml` and set it.
**How to avoid:** Checklist item: update enrichment worker's `wrangler.toml` `[vars]` with `BOARD_MINUTES_WORKER_URL`, update `Env` interface, add chain logic in `index.ts`.
**Warning signs:** No fire-and-forget calls in enrichment worker logs.

## Code Examples

### Signal Extraction Prompt (Adapted from Reference Project for Claude Haiku)
```typescript
// Adapted from: /Users/kirillkozak/Projects/board-minutes-intelligence/tendhunt-api/src/services/signal-extraction.ts
const SYSTEM_PROMPT = `You are an expert at analyzing UK public sector board meeting minutes and extracting business intelligence signals. You always return valid JSON.

Focus on actionable signals:
- PROCUREMENT: Tenders, contracts, supplier changes, framework agreements
- STAFFING: Senior appointments, restructures, recruitment campaigns
- STRATEGY: Transformations, mergers, major policy changes
- FINANCIAL: Budgets, savings targets, cost improvement programmes
- PROJECTS: IT systems, infrastructure, digital transformation
- REGULATORY: Audits, compliance issues, inspections

Only extract signals with clear business value. Skip routine administrative items.`;

const EXTRACTION_PROMPT = `Analyze this board meeting minutes excerpt and extract business signals.

For each signal found, provide:
- signal_type: PROCUREMENT | STAFFING | STRATEGY | FINANCIAL | PROJECTS | REGULATORY
- confidence: 0.0-1.0
- title: Brief signal title (5-10 words)
- summary: Brief description (1-2 sentences)
- quote: Relevant verbatim quote (max 200 chars)
- entities: { companies: [], amounts: [], dates: [], people: [] }

Organisation: {org_name}
Sector: {sector}
Meeting date: {meeting_date}

Text:
{chunk_text}

Return a JSON array of signals. Return an empty array [] if no signals found.
Only return valid JSON, no explanation text.`;
```

### Claude Haiku Call Pattern (from enrichment Stage 5)
```typescript
// Source: apps/workers/enrichment/src/stages/05-personnel.ts (verified)
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const limit = pLimit(2);

// Inside batch processing:
const results = await Promise.allSettled(
  batch.map((buyer) =>
    limit(async () => {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20250401",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: extractionPrompt }],
      });
      // Parse response...
    })
  )
);
```

### Signal Upsert Pattern
```typescript
// Dedup key: buyerId + boardDocumentId + signalType + title hash
// Use bulkWrite with updateOne/upsert for idempotent writes
const ops = signals.map((signal) => ({
  updateOne: {
    filter: {
      buyerId: signal.buyerId,
      boardDocumentId: signal.boardDocumentId,
      signalType: signal.signalType,
      title: signal.title,
    },
    update: { $set: { ...signal, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    upsert: true,
  },
}));
await db.collection("signals").bulkWrite(ops);
```

### wrangler.toml Pattern
```toml
# Source: existing worker wrangler.toml files (verified)
name = "tendhunt-board-minutes"
main = "src/index.ts"
compatibility_date = "2025-03-20"
compatibility_flags = ["nodejs_compat_v2"]

[triggers]
crons = ["30 * * * *"]  # Every hour at :30 (offset from enrichment at :00)

# Secrets: MONGODB_URI, ANTHROPIC_API_KEY
# Set via: wrangler secret put MONGODB_URI
#          wrangler secret put ANTHROPIC_API_KEY
```

### MongoDB Collection for Job Tracking
```typescript
// Collection: signalingestjobs (same pattern as enrichmentjobs, spendingestjobs)
interface SignalJobDoc {
  _id?: ObjectId;
  stage: SignalIngestStage;        // "extract_signals" | "deduplicate"
  status: "running" | "paused" | "complete" | "error";
  cursor: string | null;           // Last processed ObjectId
  batchSize: number;
  totalProcessed: number;
  totalErrors: number;
  errorLog: string[];
  startedAt: Date;
  lastRunAt: Date;
  updatedAt: Date;
}
```

## Data Flow Architecture

### Full Pipeline Flow (After Board-Minutes Worker Exists)
```
enrichment worker (hourly)
  ├── Stages 1-8 → classify, websites, logos, governance, moderngov, scrape, personnel, score
  │   Stages 3+4 create BoardDocument records with textContent
  │
  ├── After all_complete → fire-and-forget → spend-ingest/run
  └── After all_complete → fire-and-forget → board-minutes/run  ← NEW

  └── /run-buyer?id=X → enrichment → spend-ingest/run-buyer → board-minutes/run-buyer  ← NEW chain

board-minutes worker (hourly, offset :30)
  ├── Stage 1: extract_signals
  │   Filter: buyers with Tier 0 (dataSourceId exists)
  │   AND has BoardDocuments with extractionStatus: "extracted" + textContent
  │   AND NOT already processed (tracked via buyer.enrichmentSources or doc.signalExtractionStatus)
  │   For each buyer:
  │     1. Fetch BoardDocuments (limit 5, most recent)
  │     2. For each document, chunk text at 4000 chars
  │     3. Claude Haiku extracts signals from each chunk
  │     4. Validate + normalize signals
  │     5. Upsert Signal records with buyerId, boardDocumentId
  │     6. Mark BoardDocument as processed
  │
  └── Stage 2: deduplicate
      For each buyer, deduplicate signals:
        Same signalType + similar keywords within 30-day window → keep highest confidence
```

### Key Decision: What Triggers Board-Minutes Worker?
1. **Cron (hourly at :30):** Processes any unprocessed BoardDocuments that enrichment has created
2. **Enrichment all_complete chain:** Fire-and-forget to `/run` when enrichment finishes all stages
3. **Single-buyer chain:** `/run-buyer?id=X` when enrichment finishes single-buyer enrichment
4. **Manual trigger:** `GET /run?max=100` for ad-hoc runs

### Signal Schema Additions
The existing Signal model needs these additional fields:
```typescript
boardDocumentId: { type: Schema.Types.ObjectId, ref: "BoardDocument", index: true },
quote: { type: String },               // Verbatim quote from source (max 200 chars)
entities: {
  companies: [String],
  amounts: [String],
  dates: [String],
  people: [String],
},
```

### BoardDocument Schema Addition
Track which documents have been processed for signal extraction:
```typescript
signalExtractionStatus: {
  type: String,
  enum: ["pending", "extracted", "failed"],
  default: "pending",
},
```

## Cost Estimation

### Claude Haiku API Costs
- **Model:** `claude-haiku-4-5-20250401`
- **Per chunk:** ~1,500 input tokens (system + user prompt + 4K chars) + ~500 output tokens
- **Cost:** ~$0.001/chunk (Haiku input: $0.25/M, output: $1.25/M)
- **Per buyer:** ~3 chunks avg (10K chars / 4K chunk size) = ~$0.003/buyer
- **Per full run (735 Tier 0 buyers, 3 docs each):** ~$0.003 * 735 * 3 = ~$6.60
- **Monthly (assuming weekly full runs):** ~$26.40

This is very affordable and consistent with the enrichment worker's personnel extraction cost (~$7/run).

## Signal Display Enhancements (Frontend)

### Current SignalsTab State
The existing `SignalsTab` component at `apps/web/src/components/buyers/signals-tab.tsx` displays:
- Signal type badge (color-coded per type)
- Date
- Title
- Insight text (3 lines clamp)
- Source

### Needed Enhancements
1. **Filter by signal type:** Toggle pills/buttons for each of the 6 types
2. **Signal count per type:** Show count in filter buttons
3. **Quote display:** Show verbatim quote in a blockquote style below insight
4. **Entity pills:** Show extracted entity names as small badges
5. **Board document link:** Link to source document's sourceUrl
6. **Empty state improvement:** If no signals AND no board documents exist, show "Board documents haven't been processed yet" instead of generic "No buying signals found"

### Signals API Enhancement
The existing `/api/signals` route supports:
- `q` (text search), `signalType` filter, `sector` filter
- Pagination via `page` + `pageSize`

May need `buyerId` filter parameter for buyer-specific signal queries (currently uses `organizationName`).

## Open Questions

1. **Should dummy signals be cleaned up before or during Phase 20?**
   - What we know: 119 dummy signals exist in the DB
   - What's unclear: Whether these were intentionally seeded or are test artifacts
   - Recommendation: Clean them up as part of Phase 20 deployment (add a cleanup script/migration)

2. **Should the worker also process BoardDocuments from ModernGov (Stage 3) that have `extractionStatus: "pending"`?**
   - What we know: ModernGov stage creates docs with `extractionStatus: "pending"` (no textContent yet). Scrape stage creates docs with `extractionStatus: "extracted"` and `textContent`.
   - What's unclear: Whether ModernGov docs get their textContent filled later
   - Recommendation: Only process docs with `extractionStatus: "extracted"` and non-empty `textContent`. ModernGov docs would need a separate text extraction step (e.g., downloading the PDF from `mgConvert2PDF.aspx` URLs) -- this could be a future enhancement or added as a stage in the board-minutes worker.

3. **Cron schedule offset**
   - What we know: Enrichment runs at :00, spend-ingest is weekly Mon 3AM
   - Recommendation: Run board-minutes at :30 to avoid overlapping with enrichment's :00 cron

4. **Should the enrichment worker chain to board-minutes in addition to spend-ingest?**
   - What we know: Current chain is: enrichment all_complete -> spend-ingest/run. Single-buyer: enrichment -> spend-ingest/run-buyer.
   - Recommendation: YES. Add `BOARD_MINUTES_WORKER_URL` env var to enrichment worker. Chain after spend-ingest in both batch and single-buyer flows. This ensures new board documents get processed quickly.

## Sources

### Primary (HIGH confidence)
- `apps/workers/enrichment/src/index.ts` -- Worker entry point pattern, chaining to spend-ingest
- `apps/workers/enrichment/src/enrichment-engine.ts` -- Pipeline orchestrator pattern
- `apps/workers/enrichment/src/types.ts` -- Env, StageFn, EnrichmentJobDoc interfaces
- `apps/workers/enrichment/src/stages/05-personnel.ts` -- Claude Haiku extraction pattern with p-limit(2)
- `apps/workers/enrichment/src/stages/04-scrape.ts` -- HTML text extraction, BoardDocument creation
- `apps/workers/enrichment/src/stages/03-moderngov.ts` -- ModernGov BoardDocument creation
- `apps/workers/enrichment/src/db/enrichment-jobs.ts` -- Job CRUD with cursor tracking
- `apps/workers/enrichment/src/db/client.ts` -- MongoDB client for Workers
- `apps/workers/spend-ingest/src/index.ts` -- Identical worker entry pattern + single-buyer flow
- `apps/workers/spend-ingest/src/types.ts` -- SpendJobDoc, StageFn interfaces
- `apps/web/src/models/signal.ts` -- Existing Signal model schema
- `apps/web/src/models/board-document.ts` -- Existing BoardDocument model schema
- `apps/web/src/models/buyer.ts` -- Buyer model with enrichment fields
- `apps/web/src/components/buyers/signals-tab.tsx` -- Existing SignalsTab UI component
- `apps/web/src/components/buyers/buyer-tabs.tsx` -- Buyer profile tab structure
- `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` -- Buyer profile page (signal data loading)
- `apps/web/src/lib/buyers.ts` -- `fetchBuyerById()` signal query logic
- `apps/web/src/app/api/signals/route.ts` -- Signals API with filtering
- `apps/web/src/components/scanners/table-columns.ts` -- Scanner meetings column definitions
- `apps/web/src/app/api/scanners/route.ts` -- Scanner default AI columns for meetings
- All 3 `wrangler.toml` files -- Worker configuration patterns

### Secondary (MEDIUM confidence)
- `/Users/kirillkozak/Projects/board-minutes-intelligence/tendhunt-api/src/services/signal-extraction.ts` -- Reference signal extraction service (GPT-4o-mini, chunking, dedup, JSON parsing)
- `/Users/kirillkozak/Projects/board-minutes-intelligence/tendhunt-api/src/types/index.ts` -- Reference Signal/ExtractedSignal types

### Tertiary (LOW confidence)
- MongoDB live data: 0 boarddocuments, 119 signals (dummy), 735 Tier 0 buyers, enrichment at stage 2 -- this is a point-in-time snapshot that will change as enrichment progresses

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- identical to all 3 existing workers, no new libraries needed
- Architecture: HIGH -- direct clone of enrichment/spend-ingest worker patterns
- Signal extraction logic: HIGH -- proven reference implementation exists, only LLM provider swap needed
- Frontend enhancements: HIGH -- existing components just need filtering and additional fields
- Pitfalls: HIGH -- identified from actual codebase patterns and data state

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable architecture, unlikely to change)
