# Phase 13: Buyer Data Enrichment - Research

**Researched:** 2026-02-11
**Domain:** UK public sector data enrichment pipeline, Cloudflare Workers, MongoDB, SOAP API integration, fuzzy matching, AI extraction
**Confidence:** HIGH

## Summary

Phase 13 enriches 2,384 UK public sector buyer organizations with deep intelligence data sourced from a curated list of 2,368 organizations in the DATA_SOURCES spec. The pipeline has 6 stages: (1) seed the DataSource collection and classify existing buyers by org type via fuzzy name matching, (2) map governance portal URLs for Tier 0 orgs (676 councils, NHS trusts, ICBs, fire/rescue, police, combined authorities, national parks), (3) call ModernGov SOAP API for councils on that platform (~85-90% of councils), (4) scrape NHS trust board paper pages and other non-ModernGov governance portals, (5) extract key personnel via Claude Haiku from governance pages, and (6) compute enrichment scores and expose data in the buyer profile UI.

The existing data-sync Worker at `workers/data-sync/` provides a proven pattern for cursor-based resumable pipelines with native MongoDB driver, rate limiting, and bulk upserts. The enrichment Worker should be a **separate Worker** (`workers/enrichment/`) using the same architectural patterns but with stage-based processing instead of source-based. The existing Buyer model has 10 fields; this phase extends it with ~12 enrichment fields and creates 4 new MongoDB collections (DataSource, BoardDocument, KeyPersonnel, EnrichmentJob).

**Primary recommendation:** Build as a separate Cloudflare Worker following the data-sync Worker patterns. Use Fuse.js for fuzzy name matching against the DataSource collection. Use fast-xml-parser for ModernGov SOAP XML responses. Use Claude Haiku for key personnel extraction. Extend the buyer profile UI with enrichment score badge in header, Board Documents tab, and Key Personnel display within the existing Contacts tab.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongodb | 6.x (native driver) | Worker DB access | Proven in data-sync Worker, no Mongoose in Workers |
| fast-xml-parser | 5.x | Parse ModernGov SOAP XML responses | Zero deps, CF Workers compatible, handles SOAP envelopes natively (Context7 verified) |
| fuse.js | 7.x | Fuzzy name matching for buyer classification | Zero deps, lightweight, configurable threshold scoring (Context7 verified) |
| @anthropic-ai/sdk | latest | Claude Haiku API for key personnel extraction | Project standard for AI features |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfjs-serverless | latest | PDF text extraction in edge runtime | For board document text extraction in Worker |
| p-limit | 6.x | Concurrency control for parallel fetch | Rate limiting across multiple domains |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fuse.js | string-similarity (dice coefficient) | Fuse.js offers more tunable threshold + multi-key search; string-similarity is simpler but less configurable |
| fast-xml-parser | htmlparser2 | htmlparser2 works in Workers but fast-xml-parser has better SOAP envelope handling and is pure JS |
| pdfjs-serverless | Cloudflare Workers AI toMarkdown() | Workers AI is simpler but adds AI dependency for basic text extraction; pdfjs-serverless is deterministic |
| Separate enrichment Worker | Extend data-sync Worker | Separate is better: different cron schedule (daily vs hourly), different rate limits, independent failure domains |

**Installation (in workers/enrichment/):**
```bash
npm install mongodb fast-xml-parser fuse.js @anthropic-ai/sdk pdfjs-serverless p-limit
```

## Architecture Patterns

### Recommended Project Structure
```
workers/enrichment/
  src/
    index.ts                    # Worker entry, scheduled handler
    types.ts                    # EnrichmentJob, DataSource, BoardDocument, KeyPersonnel types
    enrichment-engine.ts        # Stage-based pipeline orchestrator (like sync-engine.ts)
    db/
      client.ts                 # MongoDB client (copy pattern from data-sync)
      data-sources.ts           # DataSource collection CRUD
      board-documents.ts        # BoardDocument collection CRUD
      key-personnel.ts          # KeyPersonnel collection CRUD
      enrichment-jobs.ts        # EnrichmentJob collection CRUD
      buyers.ts                 # Buyer enrichment field updates
    stages/
      01-classify.ts            # Fuzzy match buyers to DataSource, set orgType
      02-governance-urls.ts     # Map democracy portal URLs from DataSource
      03-moderngov.ts           # SOAP API calls for ModernGov councils
      04-scrape.ts              # HTML scraping for NHS trusts, non-MG portals
      05-personnel.ts           # Claude Haiku extraction of key personnel
      06-score.ts               # Compute enrichmentScore, update buyer
    api-clients/
      moderngov-client.ts       # SOAP request builder + fast-xml-parser response handler
      rate-limiter.ts           # Per-domain rate limiting (reuse pattern from data-sync)
    seed/
      seed-data-sources.ts      # One-time seed of 2,368 orgs from DATA_SOURCES spec
  wrangler.toml                 # Separate worker config with daily cron + R2 binding
  package.json
```

**App-side additions:**
```
src/
  models/
    data-source.ts              # Mongoose schema for DataSource
    board-document.ts           # Mongoose schema for BoardDocument
    key-personnel.ts            # Mongoose schema for KeyPersonnel
    enrichment-job.ts           # Mongoose schema for EnrichmentJob
    buyer.ts                    # Extended with enrichment fields
  lib/
    buyers.ts                   # Extended to fetch board docs + key personnel
  components/buyers/
    buyer-header.tsx            # Extended with enrichment score badge
    buyer-tabs.tsx              # Add "Board Documents" and "Key Personnel" tabs
    board-documents-tab.tsx     # New: list of board documents with links
    key-personnel-tab.tsx       # New: grid of key personnel cards
    enrichment-badge.tsx        # New: enrichment score circular badge
```

### Pattern 1: Stage-Based Pipeline with Cursor Resumability
**What:** Each enrichment stage processes buyers in batches (e.g., 100 at a time), saves a cursor after each batch to the EnrichmentJob document, and resumes from cursor on next invocation. Stages run sequentially within a single Worker invocation but can span multiple invocations.
**When to use:** For any multi-step data pipeline that must be crash-safe and resumable within Cloudflare Worker CPU time limits.
**Example:**
```typescript
// Source: Pattern derived from workers/data-sync/src/sync-engine.ts
export type EnrichmentStage =
  | "classify" | "governance_urls" | "moderngov"
  | "scrape" | "personnel" | "score";

export interface EnrichmentJob {
  _id?: ObjectId;
  stage: EnrichmentStage;
  status: "running" | "paused" | "complete" | "error";
  cursor: string | null;     // Last processed buyer _id
  batchSize: number;
  totalProcessed: number;
  totalErrors: number;
  errorLog: string[];
  startedAt: Date;
  lastRunAt: Date;
  updatedAt: Date;
}

async function processStage(
  db: Db,
  job: EnrichmentJob,
  stageFn: (db: Db, buyers: BuyerDoc[]) => Promise<number>,
  maxPerRun: number
): Promise<{ processed: number; errors: number; done: boolean }> {
  let processed = 0;
  let errors = 0;

  while (processed < maxPerRun) {
    // Fetch next batch of buyers after cursor
    const filter: Record<string, unknown> = {};
    if (job.cursor) {
      filter._id = { $gt: new ObjectId(job.cursor) };
    }

    const batch = await db.collection("buyers")
      .find(filter)
      .sort({ _id: 1 })
      .limit(job.batchSize)
      .toArray();

    if (batch.length === 0) return { processed, errors, done: true };

    try {
      const batchErrors = await stageFn(db, batch);
      errors += batchErrors;
    } catch (err) {
      errors++;
      // Log but continue
    }

    processed += batch.length;
    const lastId = batch[batch.length - 1]._id.toString();

    // Save cursor after EVERY batch (crash-safe)
    await updateJobProgress(db, job._id!, {
      cursor: lastId,
      totalProcessed: job.totalProcessed + processed,
      totalErrors: job.totalErrors + errors,
    });

    job.cursor = lastId;
  }

  return { processed, errors, done: false };
}
```

### Pattern 2: ModernGov SOAP Client (HTTP POST, No WSDL Library)
**What:** ModernGov's SOAP API is simple enough to call via raw HTTP POST with XML body, avoiding heavy SOAP libraries. The response XML is parsed with fast-xml-parser.
**When to use:** For all ModernGov API calls. The API exposes methods at `/mgWebService.asmx` including: GetMeetings, GetMeeting, GetCommitteesByUser, GetCouncillorsByWard, GetCouncillorsByWardId, GetWebCastMeetings, GetElectionResults, GetServerDiagnostics.
**Example:**
```typescript
// Source: Verified from ModernGov WSDL and fast-xml-parser Context7 docs
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,  // Strips soap:, mg: prefixes
  attributeNamePrefix: "@_",
});

interface ModernGovMeeting {
  id: number;
  committeeId: number;
  committeeName: string;
  date: string;
  title: string;
  location: string;
}

async function getMeetings(
  baseUrl: string, // e.g., "https://democracy.camden.gov.uk"
  startDate: string,
  endDate: string
): Promise<ModernGovMeeting[]> {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetMeetings xmlns="http://tempuri.org/">
      <sStartDate>${startDate}</sStartDate>
      <sEndDate>${endDate}</sEndDate>
    </GetMeetings>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(`${baseUrl}/mgWebService.asmx`, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": "http://tempuri.org/GetMeetings",
    },
    body: soapBody,
  });

  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Navigate SOAP envelope to get meeting data
  const meetingsData = parsed?.Envelope?.Body?.GetMeetingsResponse?.GetMeetingsResult;
  if (!meetingsData) return [];

  // Parse the inner XML (ModernGov returns XML-in-XML)
  const innerParsed = parser.parse(meetingsData);
  const meetings = innerParsed?.meetings?.meeting;

  return Array.isArray(meetings) ? meetings : meetings ? [meetings] : [];
}
```

### Pattern 3: Fuzzy Name Matching with Fuse.js
**What:** Match buyer names (from contracts data) to canonical org names in DataSource collection using fuzzy matching with tuned thresholds.
**When to use:** Stage 1 (classify) -- matching ~2,384 buyer names against 2,368 DataSource names.
**Example:**
```typescript
// Source: Fuse.js Context7 docs (fusejs.io)
import Fuse from "fuse.js";

interface DataSourceEntry {
  name: string;
  orgType: string;
  democracyPortalUrl?: string;
  platform?: string;
  region?: string;
}

function classifyBuyers(
  buyers: { _id: string; name: string }[],
  dataSources: DataSourceEntry[]
): Map<string, { orgType: string; dataSourceName: string; score: number }> {
  const fuse = new Fuse(dataSources, {
    keys: ["name"],
    threshold: 0.3,        // Strict-ish: allows minor spelling differences
    ignoreLocation: true,   // Don't penalize position in string
    includeScore: true,
    minMatchCharLength: 3,
  });

  const results = new Map();

  for (const buyer of buyers) {
    // Normalize: strip common suffixes like "Council", "Borough", "NHS Trust"
    const normalized = buyer.name
      .replace(/\b(the|council|borough|of|city|royal)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const matches = fuse.search(normalized);
    if (matches.length > 0 && matches[0].score !== undefined && matches[0].score < 0.3) {
      results.set(buyer._id, {
        orgType: matches[0].item.orgType,
        dataSourceName: matches[0].item.name,
        score: 1 - matches[0].score, // Convert to 0-1 confidence
      });
    }
  }

  return results;
}
```

### Pattern 4: Per-Domain Rate Limiting
**What:** Different domains have different rate limits. The enrichment Worker must respect per-domain delays, not a single global rate limit.
**When to use:** Stages 3 and 4 (ModernGov and website scraping).
**Example:**
```typescript
// Source: Pattern extending workers/data-sync/src/api-clients/rate-limiter.ts
const DOMAIN_DELAYS: Record<string, number> = {
  "moderngov": 2000,     // 1 req/2s per domain (polite for council sites)
  "nhs.uk": 2000,        // 1 req/2s for NHS trusts
  "gov.uk": 1000,        // 1 req/s for gov.uk
  "default": 3000,       // Conservative default
};

const lastRequestTime = new Map<string, number>();

async function fetchWithDomainDelay(url: string): Promise<Response> {
  const domain = new URL(url).hostname;
  const delayKey = Object.keys(DOMAIN_DELAYS).find(k => domain.includes(k)) ?? "default";
  const delay = DOMAIN_DELAYS[delayKey];

  const lastTime = lastRequestTime.get(domain) ?? 0;
  const elapsed = Date.now() - lastTime;
  if (elapsed < delay) {
    await new Promise(r => setTimeout(r, delay - elapsed));
  }

  lastRequestTime.set(domain, Date.now());
  return fetchWithBackoff(url); // Reuse existing backoff logic
}
```

### Anti-Patterns to Avoid
- **Processing all 2,384 buyers in a single Worker invocation:** CPU time limit is 300s (paid). Use cursor-based batching across multiple invocations.
- **Single retry strategy for all domains:** Different sites have different rate limits and error patterns. Use per-domain configuration.
- **Storing raw HTML in MongoDB:** Store only extracted structured data. Raw HTML goes to R2 if needed for re-processing.
- **Running classification AND enrichment in the same stage:** Classification (fuzzy matching) should complete for ALL buyers before enrichment stages begin, since enrichment strategies depend on orgType.
- **Making SOAP calls without SOAPAction header:** ModernGov requires the SOAPAction HTTP header or requests silently fail.
- **Assuming all councils use ModernGov:** Only ~85-90% do. The remaining use CMIS, Jadu, or custom systems. The pipeline must handle non-ModernGov gracefully (skip/fallback).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Custom Levenshtein distance | fuse.js | Edge cases with UK org naming conventions (The, Borough of, Council, etc.), threshold tuning, multi-key matching |
| XML/SOAP parsing | Regex-based XML extraction | fast-xml-parser | SOAP envelopes have nested XML, namespace prefixes, CDATA sections -- regex will break on edge cases |
| PDF text extraction | Raw buffer parsing | pdfjs-serverless | PDF format is complex, encrypted PDFs, font encoding, multi-page handling |
| Rate limiting with backoff | Simple setTimeout | Reuse data-sync rate-limiter.ts + extend with per-domain tracking | Exponential backoff, Retry-After header parsing, 429/403/503 handling |
| Cursor-based pagination | Custom offset tracking | Reuse data-sync sync-engine.ts pattern | Crash-safe resume, progress tracking, error logging |

**Key insight:** The existing data-sync Worker provides battle-tested patterns for cursor-based resumability, rate limiting, and bulk MongoDB operations. Port these patterns rather than building from scratch.

## Common Pitfalls

### Pitfall 1: ModernGov SOAP API Returns XML-in-XML
**What goes wrong:** ModernGov SOAP responses wrap the actual data as an XML string inside the SOAP envelope's `<GetMeetingsResult>` element. Naive parsing gets a string, not structured data.
**Why it happens:** ASP.NET web services serialize the return value as escaped XML text within the SOAP envelope.
**How to avoid:** Parse the SOAP envelope first, extract the inner XML string from the result element, then parse it again with fast-xml-parser. Double-parse is expected.
**Warning signs:** Getting a single string instead of an array of meetings.

### Pitfall 2: Buyer Name Mismatch Between Contracts and DataSource
**What goes wrong:** Buyer names from Find a Tender/Contracts Finder don't exactly match the canonical names in the DataSource spec. Example: "London Borough of Camden" vs "Camden" vs "Camden Council".
**Why it happens:** Different government systems use different naming conventions. FaT uses the formal registered name; council websites use informal names.
**How to avoid:** Pre-normalize both sides before fuzzy matching: strip common prefixes/suffixes ("The", "Borough", "Council", "NHS Trust", "Foundation Trust", etc.), lowercase, trim. Set Fuse.js threshold to 0.3 (strict but allowing abbreviation differences). Log unmatched buyers for manual review.
**Warning signs:** Fuzzy match rate below 80%. Expected: 85-95% auto-match.

### Pitfall 3: Cloudflare Worker CPU Time Limit
**What goes wrong:** Worker hits the 300-second (5-minute) CPU time limit when processing too many buyers in one invocation.
**Why it happens:** CPU time excludes I/O wait, but XML parsing, fuzzy matching, and AI extraction are CPU-intensive.
**How to avoid:** Process in small batches (50-100 buyers per batch), save cursor after each batch. For AI extraction, offload to Claude Haiku batch API and check results on next invocation.
**Warning signs:** Worker timeouts in Cloudflare logs. Monitor CPU time per invocation.

### Pitfall 4: MongoDB Atlas Free Tier Storage Limit
**What goes wrong:** Adding 4 new collections with 2,384+ documents each plus board documents approaches the 512 MB free tier limit.
**Why it happens:** Board documents with full text content can be large.
**How to avoid:** Store PDF/HTML content in R2, only store metadata + extracted text summary in MongoDB. Estimate: DataSource (~2.4K docs * 1KB = 2.4MB), BoardDocument (~5K docs * 5KB = 25MB), KeyPersonnel (~10K docs * 1KB = 10MB), EnrichmentJob (<1KB). Total: ~40MB additional. Safe, but monitor.
**Warning signs:** MongoDB Atlas storage approaching 400MB.

### Pitfall 5: R2 Bucket Binding Missing in Worker
**What goes wrong:** Worker can't store board documents to R2 because the binding wasn't configured in wrangler.toml.
**Why it happens:** The data-sync Worker doesn't use R2; the new enrichment Worker needs it for document storage.
**How to avoid:** Add R2 bucket binding in wrangler.toml: `[[r2_buckets]] binding = "DOCS" bucket_name = "tendhunt-enrichment-docs"`.
**Warning signs:** "R2 binding not found" error at runtime.

### Pitfall 6: CMIS Councils Treated as ModernGov
**What goes wrong:** ~15-20 councils use CMIS instead of ModernGov. Attempting SOAP API calls against CMIS endpoints returns 404 or wrong data.
**Why it happens:** The DATA_SOURCES spec clearly labels each council's platform, but code may skip this check.
**How to avoid:** The DataSource documents must include a `platform` field ("ModernGov", "CMIS", "Custom", "Jadu"). Stage 3 (ModernGov) filters to platform === "ModernGov" only. CMIS and Custom councils are handled by Stage 4 (scraping) with different URL patterns.
**Warning signs:** High error rate in Stage 3 logs.

### Pitfall 7: Not Handling Abolished/Merged Councils
**What goes wrong:** Some councils in the DATA_SOURCES spec are marked as "Absorbed into X Council 2023" or "Abolished 2021". Attempting to fetch their URLs returns 404/redirect.
**Why it happens:** Local government reorganization merges councils periodically.
**How to avoid:** DataSource seed must skip entries marked as abolished/N/A. The classification stage must map old buyer names to successor organizations.
**Warning signs:** Multiple 404s on council governance URLs.

## Code Examples

### MongoDB Collection Schemas

```typescript
// Source: Pattern from existing models in src/models/
// DataSource -- seeded from DATA_SOURCES spec
const dataSourceSchema = new Schema({
  name: { type: String, required: true, unique: true },     // Canonical org name
  orgType: {
    type: String, required: true,
    enum: [
      "local_council_london", "local_council_metro", "local_council_county",
      "local_council_unitary", "local_council_district", "local_council_sui_generis",
      "nhs_trust_acute", "nhs_trust_mental_health", "nhs_trust_community",
      "nhs_trust_ambulance", "nhs_icb",
      "fire_rescue", "police_pcc", "combined_authority", "national_park",
      "mat", "university", "fe_college", "alb",
    ]
  },
  region: { type: String },
  democracyPortalUrl: { type: String },
  boardPapersUrl: { type: String },
  platform: { type: String, enum: ["ModernGov", "CMIS", "Custom", "Jadu", "None"] },
  website: { type: String },
  parentOrg: { type: String },            // For sub-orgs (fire -> county council)
  tier: { type: Number, default: 0 },     // 0 = current (676), 1 = expansion (1692)
  status: { type: String, enum: ["active", "abolished", "merged"], default: "active" },
  successorOrg: { type: String },         // If abolished/merged
}, { timestamps: true });

// BoardDocument -- stores metadata, content in R2
const boardDocumentSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
  dataSourceName: { type: String, required: true },
  title: { type: String, required: true },
  meetingDate: { type: Date },
  committeeId: { type: String },
  committeeName: { type: String },
  documentType: { type: String, enum: ["minutes", "agenda", "report", "board_pack"] },
  sourceUrl: { type: String, required: true },
  r2Key: { type: String },               // R2 storage key
  textContent: { type: String },          // Extracted text (truncated for MongoDB)
  textLength: { type: Number },
  extractionStatus: { type: String, enum: ["pending", "extracted", "failed"], default: "pending" },
}, { timestamps: true });

// KeyPersonnel -- extracted from governance pages
const keyPersonnelSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
  name: { type: String, required: true },
  title: { type: String },               // "Chief Procurement Officer", "Director of Finance"
  role: { type: String, enum: [
    "chief_executive", "director", "board_member", "procurement_lead",
    "finance_director", "cfo", "cto", "chair", "councillor", "committee_chair"
  ]},
  department: { type: String },
  email: { type: String },
  phone: { type: String },
  sourceUrl: { type: String },
  extractionMethod: { type: String, enum: ["moderngov_api", "website_scrape", "claude_haiku"] },
  confidence: { type: Number, min: 0, max: 100 },
  verifiedAt: { type: Date },
}, { timestamps: true });

// EnrichmentJob -- tracks pipeline progress
const enrichmentJobSchema = new Schema({
  stage: {
    type: String, required: true,
    enum: ["classify", "governance_urls", "moderngov", "scrape", "personnel", "score"]
  },
  status: { type: String, enum: ["running", "paused", "complete", "error"], default: "running" },
  cursor: { type: String, default: null },
  batchSize: { type: Number, default: 100 },
  totalProcessed: { type: Number, default: 0 },
  totalErrors: { type: Number, default: 0 },
  errorLog: [{ type: String }],
  startedAt: { type: Date, default: Date.now },
  lastRunAt: { type: Date },
}, { timestamps: true });
```

### Extended Buyer Schema Fields
```typescript
// Source: Extending existing src/models/buyer.ts
// Add these fields to the existing buyerSchema:
{
  // Classification
  orgType: { type: String, index: true },    // Matched from DataSource
  orgSubType: { type: String },              // e.g., "acute", "mental_health" for NHS
  dataSourceId: { type: Schema.Types.ObjectId, ref: "DataSource" },

  // Governance portals
  democracyPortalUrl: { type: String },
  democracyPlatform: { type: String },       // "ModernGov", "CMIS", etc.
  boardPapersUrl: { type: String },

  // Financial/size data
  staffCount: { type: Number },
  annualBudget: { type: Number },

  // Enrichment metadata
  enrichmentScore: { type: Number, min: 0, max: 100 },
  enrichmentSources: [{ type: String }],     // ["data_source", "moderngov", "scrape"]
  lastEnrichedAt: { type: Date },
  enrichmentVersion: { type: Number, default: 0 },
}
```

### Worker Wrangler Configuration
```toml
# workers/enrichment/wrangler.toml
name = "tendhunt-enrichment"
main = "src/index.ts"
compatibility_date = "2025-03-20"
compatibility_flags = ["nodejs_compat_v2"]

[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC

[[r2_buckets]]
binding = "DOCS"
bucket_name = "tendhunt-enrichment-docs"

# Secrets: MONGODB_URI, ANTHROPIC_API_KEY
# Set via: wrangler secret put MONGODB_URI
#          wrangler secret put ANTHROPIC_API_KEY
```

### Claude Haiku Key Personnel Extraction
```typescript
// Source: Pattern from Phase 3 onboarding AI analysis
import Anthropic from "@anthropic-ai/sdk";

interface ExtractedPerson {
  name: string;
  title: string;
  role: string;
  department?: string;
  email?: string;
  confidence: number;
}

async function extractKeyPersonnel(
  client: Anthropic,
  pageText: string,
  orgName: string
): Promise<ExtractedPerson[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20250401",
    max_tokens: 1024,
    system: `You are extracting key personnel from UK public sector organization web pages.
Extract ONLY people with procurement-relevant roles: chief executives, directors,
board members, procurement leads, finance directors. Return JSON array.`,
    messages: [{
      role: "user",
      content: `Organization: ${orgName}

Page content:
${pageText.slice(0, 8000)}

Extract key personnel as JSON array with fields: name, title, role (one of: chief_executive, director, board_member, procurement_lead, finance_director, cfo, chair), department (if mentioned), email (if found), confidence (0-100).`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}
```

### Enrichment Score Calculation
```typescript
// Enrichment score = weighted sum of data completeness
function computeEnrichmentScore(buyer: Record<string, unknown>): number {
  const weights: [string, number][] = [
    ["orgType", 15],
    ["democracyPortalUrl", 10],
    ["boardPapersUrl", 10],
    ["website", 5],
    ["description", 5],
    ["staffCount", 10],
    ["annualBudget", 10],
    ["keyPersonnelCount", 20],  // From KeyPersonnel collection
    ["boardDocumentCount", 15], // From BoardDocument collection
  ];

  let score = 0;
  for (const [field, weight] of weights) {
    const value = buyer[field];
    if (value !== null && value !== undefined && value !== 0 && value !== "") {
      score += weight;
    }
  }
  return score; // 0-100
}
```

## Don't Hand-Roll (Additional Detail)

### ModernGov SOAP API Methods Reference

Based on WSDL analysis, the following methods are available. Call via HTTP POST to `/mgWebService.asmx`:

| Method | Parameters | Returns | Use Case |
|--------|-----------|---------|----------|
| GetMeetings | sStartDate, sEndDate | Meeting list (XML) | Discover recent meetings per council |
| GetMeeting | lMeetingId | Meeting details + attachments | Get agenda/minutes links |
| GetCommitteesByUser | (none) | Committee list | Discover all committees |
| GetCouncillorsByWard | lWardId | Councillor list | Key personnel discovery |
| GetCouncillorsByPostcode | sPostcode | Councillor list | Alternative personnel lookup |
| GetWebCastMeetings | sStartDate, sEndDate | Webcast meetings | Identify recorded meetings |

**SOAPAction header format:** `http://tempuri.org/{MethodName}`

### DataSource Seed Data Breakdown

From DATA_SOURCES spec analysis:

| Category | Count | Platform | Tier |
|----------|-------|----------|------|
| London Borough Councils | 33 | ~90% ModernGov | 0 |
| Metropolitan Borough Councils | 36 | ~90% ModernGov | 0 |
| County Councils | 21 | ~85% ModernGov | 0 |
| Unitary Authorities | 62 | ~85% ModernGov | 0 |
| District Councils | 164 | ~95% ModernGov | 0 |
| Sui Generis | 2 | Mixed | 0 |
| NHS Trusts (all types) | 214 | No standard (website scrape) | 0 |
| Integrated Care Boards | 42 | No standard (website scrape) | 0 |
| Fire and Rescue | 44 | Mixed (some ModernGov) | 0 |
| Police and Crime Commissioners | 37 | Custom websites | 0 |
| Combined Authorities | 12 | Mixed (some ModernGov) | 0 |
| National Park Authorities | 10 | Mixed (1 ModernGov) | 0 |
| Multi-Academy Trusts | 1,154 | Various | 1 |
| Universities | 165 | Various | 1 |
| FE Colleges | 228 | Various | 1 |
| Healthcare Regulators | 10 | Various | 1 |
| Major ALBs | 135 | Various | 1 |
| **TOTAL** | **~2,368** | | |

**ModernGov coverage for councils:** ~270-280 of 317 councils (~85-90%)
**CMIS councils:** ~15-20 councils (Birmingham, Essex, Walsall, Sunderland, Cambridge, Norfolk, Stoke-on-Trent, Hull, Dudley, Cheshire West, Luton, Warrington, Wiltshire, East Suffolk, Rochford)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full WSDL library (soap-node) | Raw HTTP POST + fast-xml-parser | 2024+ | Avoids heavy Node.js deps, Works in CF Workers |
| Global rate limiter | Per-domain rate limiter | Standard practice | Respects different site limits |
| Process all in one run | Cursor-based multi-invocation | Proven in data-sync Worker | Crash-safe, fits CF CPU limits |
| Store HTML in MongoDB | HTML to R2, metadata to MongoDB | Atlas free tier awareness | Stays within 512MB limit |
| Cloudflare Workers AI | Direct Claude Haiku API | 2025+ | More control, structured outputs, batch API available |

**Deprecated/outdated:**
- `soap` npm package: Too heavy for Workers, requires Node.js stream/http modules not available in CF Workers
- `moderngov` PyPI package: Python only, not usable in this TypeScript stack
- Single-pass enrichment: Doesn't work at 2,384 org scale within Worker limits

## Open Questions

1. **How many ModernGov councils will return data via SOAP API?**
   - What we know: ~85-90% of councils run ModernGov, but some may have SOAP API disabled or require auth.
   - What's unclear: Actual API availability per council (some may block non-browser requests).
   - Recommendation: Build Stage 3 to be resilient -- log failures, don't fail the pipeline. Fall back to Stage 4 (scraping) for councils where SOAP API is unavailable. Run a validation pass on 10 sample councils first.

2. **Should Tier 1 expansion orgs (MATs, universities, etc.) be seeded in DataSource now?**
   - What we know: Success criteria say "2,368 UK public sector orgs from DATA_SOURCES spec" which includes Tier 1.
   - What's unclear: Whether to enrich Tier 1 orgs in this phase or just seed them for future phases.
   - Recommendation: Seed ALL 2,368 DataSource entries but only run enrichment stages on Tier 0 (676 orgs) in this phase. Tier 1 enrichment would be a follow-up phase since those orgs have no standard governance API.

3. **How should the enrichment Worker handle the Claude Haiku API rate limit?**
   - What we know: Claude Haiku has generous rate limits but costs money per call (~$0.01 per org for key personnel extraction).
   - What's unclear: Whether to use real-time API or batch API (50% discount, 24hr processing).
   - Recommendation: Use real-time API with p-limit(2) concurrency for the initial build. The 676 Tier 0 orgs at $0.01/org = ~$7 per run. If cost becomes an issue, migrate to batch API later.

4. **What is the exact structure of ModernGov SOAP responses?**
   - What we know: The WSDL is at `/mgWebService.asmx?WSDL`. Methods include GetMeetings, GetMeeting, etc. Responses are XML wrapped in SOAP envelopes.
   - What's unclear: Exact field names in the inner XML vary between ModernGov versions.
   - Recommendation: Build a discovery script that calls 3-5 sample councils and logs the raw XML responses. Use these to define TypeScript interfaces for ModernGov data types. Handle missing/extra fields gracefully.

5. **How to handle the UI for buyers with zero enrichment data?**
   - What we know: Existing buyer profile has 4 tabs (Contracts, Contacts, Signals, Attributes). New tabs (Board Documents, Key Personnel) may be empty for unenriched buyers.
   - What's unclear: Whether to show empty tabs or hide them.
   - Recommendation: Show tabs with "No data yet" empty states and an enrichment progress indicator. The enrichmentScore badge in the header provides context for how enriched this buyer is.

## Recommended Plan Breakdown

Based on this research, the phase should be broken into **6 plans**:

### Plan 1: Models + DataSource Seeding + Buyer Schema Extension
- Create 4 new Mongoose models (DataSource, BoardDocument, KeyPersonnel, EnrichmentJob)
- Extend Buyer model with enrichment fields
- Create seed script/data for 2,368 DataSource entries from DATA_SOURCES spec
- Create API endpoint to trigger seeding (or run as one-time script)
- **Effort:** 1-2 days

### Plan 2: Enrichment Worker Scaffold + Stage 1 (Classification)
- Scaffold `workers/enrichment/` with same structure as data-sync
- Port MongoDB client, rate limiter patterns
- Implement Stage 1: Fuse.js fuzzy matching of 2,384 buyers against DataSource
- Write classification results to Buyer.orgType, Buyer.dataSourceId
- EnrichmentJob tracking for Stage 1
- **Effort:** 1-2 days

### Plan 3: Stage 2 (Governance URLs) + Stage 3 (ModernGov SOAP)
- Stage 2: Copy democracyPortalUrl, boardPapersUrl, platform from matched DataSource to Buyer
- Stage 3: ModernGov SOAP client with fast-xml-parser, fetch committees/meetings/minutes
- Store BoardDocument records for meeting minutes found via API
- Per-domain rate limiting
- **Effort:** 2-3 days

### Plan 4: Stage 4 (Website Scraping) + Stage 5 (Key Personnel)
- Stage 4: HTML scraping for NHS trust board paper pages and non-ModernGov councils
- Download PDFs to R2, extract text with pdfjs-serverless
- Stage 5: Claude Haiku extraction of key personnel from governance pages
- Store KeyPersonnel records
- **Effort:** 2-3 days

### Plan 5: Stage 6 (Enrichment Scoring) + Pipeline Wiring
- Compute enrichmentScore for all buyers
- Wire all stages into enrichment-engine.ts with sequential stage execution
- Wire daily cron trigger in wrangler.toml
- Add manual trigger endpoint for testing
- Error handling, logging, dead letter patterns
- **Effort:** 1-2 days

### Plan 6: Buyer Profile UI Enhancement
- Enrichment score badge in BuyerHeader (circular progress indicator)
- Add "Board Documents" tab to BuyerTabs with document list
- Add "Key Personnel" tab to BuyerTabs with personnel cards
- Extend BuyerHeader with orgType badge, staff count, annual budget
- Update lib/buyers.ts to fetch board documents and key personnel
- Show enrichmentSources and lastEnrichedAt in Attributes tab
- **Effort:** 1-2 days

**Total estimated effort: 8-14 days**

## Sources

### Primary (HIGH confidence)
- `/websites/fusejs_io` (Context7) - Fuzzy matching configuration, threshold scoring, ignoreLocation option
- `/naturalintelligence/fast-xml-parser` (Context7) - SOAP envelope parsing, removeNSPrefix, XMLParser API
- `workers/data-sync/src/` (Codebase) - Proven patterns for cursor-based sync, rate limiting, MongoDB native driver in CF Workers
- `src/models/buyer.ts` (Codebase) - Current Buyer schema with 10 fields
- `src/components/buyers/` (Codebase) - Current buyer profile UI with 4 tabs
- `/Users/kirillkozak/Projects/board-minutes-intelligence/specs/DATA_SOURCES.md` - Complete list of 2,368 orgs with URLs, platforms, and categories

### Secondary (MEDIUM confidence)
- [Cloudflare Workers Node.js Compatibility 2025](https://blog.cloudflare.com/nodejs-workers-2025/) - fast-xml-parser, fuse.js Workers compatibility
- [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless) - Serverless PDF.js for edge environments
- [ModernGov WSDL](https://moderngov.sutton.gov.uk/mgWebService.asmx?op=GetMeeting) - SOAP API method signatures
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) - Storage cost estimates
- `files/research_notes/uk_public_sector_data_sources.md` - API authentication, rate limits, data freshness
- `files/research_notes/scraping_enrichment_strategies.md` - Cost estimates, pipeline architecture
- `files/research_notes/enrichment_pipeline_best_practices.md` - Competitor analysis, confidence scoring

### Tertiary (LOW confidence)
- ModernGov SOAP API inner XML structure - Based on community repos (symroe/CouncillorData, DemocracyClub/LGSF), not official docs. Needs validation against live endpoints.
- CMIS API availability - No documentation found. May need to fall back to HTML scraping for CMIS councils.
- Claude Haiku structured output schema compliance - Training data claim. Needs validation with actual extraction prompts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in Context7 with CF Workers compatibility confirmed
- Architecture: HIGH - Closely follows proven data-sync Worker patterns from the same codebase
- Pitfalls: HIGH - Based on actual codebase analysis and documented CF Worker limits
- ModernGov SOAP specifics: MEDIUM - API exists and methods are documented in WSDL, but inner XML format needs validation against live endpoints
- Cost estimates: MEDIUM - Based on research notes which cite official pricing pages

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, known APIs)
