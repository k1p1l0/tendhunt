# Phase 11: Invoice & Spend Data Intelligence - Research

**Researched:** 2026-02-12
**Domain:** UK public sector transparency spending data ingestion, CSV normalization, spend analytics & charting, opportunity surfacing
**Confidence:** MEDIUM-HIGH

## Summary

This phase ingests UK local authority transparency spending data (over GBP 500 CSV reports) for the ~2,384 buyers already in the TendHunt database. The work divides into four domains: (1) AI-assisted discovery of transparency/spending pages on buyer websites, (2) CSV download and normalization into a unified schema despite wildly inconsistent column naming across councils, (3) a new "Spending" tab on buyer profiles with four interactive chart/table views, and (4) on-the-fly opportunity surfacing that matches spend data against the current user's company profile.

The biggest technical challenge is CSV column normalization. UK councils publish spending data in at least 5 distinct column schemas (Devon: "Expense Area"/"Expense Type"; Rochdale: "DIRECTORATE"/"PURPOSE"; Ipswich: "Service Area Categorisation"/"Expenses Type"; Manchester: "Service Area"/"Expenses Type"; plus arbitrary custom formats). A hybrid approach using a pattern library for known schemas plus Claude Haiku fallback for unrecognized columns is the recommended strategy.

**Primary recommendation:** Build a new Cloudflare Worker (`workers/spend-ingest/`) following the exact architectural pattern of the existing enrichment pipeline (stages, cursor-based resume, rate limiting, batch processing). Use Recharts 3.x via shadcn/ui chart components for the frontend. Implement a hybrid CSV normalization strategy with ~10 known column mappings plus AI fallback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Scope: Only ingest spend data for buyers already in the database (~2,384 existing buyers), not all UK councils
- Discovery method: AI-assisted agent crawl -- for each buyer with a website, an agent identifies the transparency/spending page and extracts CSV download links. Similar approach to the board-minutes-intelligence project
- Historical depth: Ingest everything available -- grab all published CSV files regardless of date range
- Placement: New dedicated "Spending" tab on buyer profile (alongside Contracts, Contacts, Signals, Board Documents, Key Personnel, Attributes)
- Tab content includes ALL four views: Top spend categories, Spend over time, Top vendors list, Spend breakdown table
- Filter approach: Similar to the Contracts Finder filter UI (filter chips/dropdowns) -- filter by category, amount range, date range, vendor
- Charts: Interactive -- hover tooltips, clickable segments that filter the table below, date range selection on timeline
- All four opportunity types: Recurring spend patterns, Category match to user profile, Vendor concentration risk, Spend growth signals
- Profile match placement: Hero section at top of Spending tab
- Computation: On-the-fly when user views the buyer profile
- Recurring spend: Show pattern only, do NOT predict timing
- Opportunity data also feeds into Vibe Scanner buyer scoring

### Claude's Discretion
- CSV column normalization strategy (AI mapping, pattern library, or hybrid)
- Specific chart library choice (recharts, nivo, etc.)
- Spend category taxonomy/normalization approach
- How to handle malformed or incomplete CSV data
- Exact visual design of opportunity cards

### Deferred Ideas (OUT OF SCOPE)
- New "Spend / Invoicing" scanner type -- A 4th scanner type in the Vibe Scanner. This extends the scanner system and should be its own phase.
- Predict procurement timing -- Using historical spend patterns to predict specific months when a buyer will procure in a category. Deferred in favor of showing patterns only.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.7.x | Interactive charts (bar, line, area) | shadcn/ui's blessed chart library; v3 has native React 19 support (dropped react-is dependency) |
| shadcn/ui `chart` | latest | Chart wrapper components (ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend) | Already used in project; provides dark mode, theming, and consistent styling out of the box |
| PapaParse | 5.5.x | CSV parsing in Worker (streaming support) | De facto CSV parser for JS; handles malformed input gracefully; works in Cloudflare Workers via streaming adapter |
| MongoDB (mongodb driver) | 6.16.x | Spend data storage | Already used in workers/enrichment/ and workers/data-sync/ |
| @anthropic-ai/sdk | 0.39.x (worker) / 0.74.x (app) | AI column mapping + transparency page discovery | Already in both workers/enrichment/ and main app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Fuse.js | 7.1.x | Fuzzy vendor name deduplication | Already in workers/enrichment/; needed to normalize vendor names across CSV files |
| p-limit | 6.2.x (worker) | Concurrency control for CSV downloads | Already in workers/enrichment/; limit concurrent fetches to avoid rate limiting |
| Apify (cheerio-scraper) | - | Website crawling for transparency page discovery | Already integrated via api-clients/apify.ts; the cheerio-scraper actor is free (pay for compute only), 12.5K users, 4.98 rating |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts 3.x | Nivo | Nivo is more opinionated and heavier; Recharts is already the shadcn/ui standard |
| PapaParse | csv-parse | csv-parse is more streaming-native for Node but PapaParse has better malformed input handling and works in browser+worker |
| Separate spend-ingest Worker | Adding stages to enrichment Worker | Enrichment Worker is already 8 stages; spend ingestion is a different concern (different cron schedule, different data source). Separate Worker is cleaner |

**Installation (main app):**
```bash
npm install recharts
npx shadcn@latest add chart
```

**Installation (new worker):**
```bash
cd workers/spend-ingest
npm install mongodb papaparse @anthropic-ai/sdk p-limit fuse.js
npm install -D @types/papaparse @cloudflare/workers-types typescript wrangler
```

## Architecture Patterns

### Recommended Project Structure
```
workers/spend-ingest/           # New Cloudflare Worker for spend data ingestion
├── src/
│   ├── index.ts                # Entry point (cron + /run endpoint)
│   ├── spend-engine.ts         # Pipeline orchestrator (like enrichment-engine.ts)
│   ├── types.ts                # SpendIngestStage, SpendJobDoc, SpendTransactionDoc, etc.
│   ├── stages/
│   │   ├── 01-discover.ts      # Find transparency/spending pages on buyer websites
│   │   ├── 02-extract-links.ts # Extract CSV download URLs from transparency pages
│   │   ├── 03-download-parse.ts # Download CSVs, parse with PapaParse, normalize columns
│   │   └── 04-aggregate.ts     # Compute per-buyer spend summaries (categories, vendors, trends)
│   ├── db/
│   │   ├── client.ts           # MongoDB connection (copy from enrichment)
│   │   ├── buyers.ts           # Buyer batch reads
│   │   ├── spend-jobs.ts       # SpendIngestJob CRUD (cursor, progress)
│   │   └── spend-data.ts       # SpendTransaction + SpendSummary CRUD
│   ├── api-clients/
│   │   ├── rate-limiter.ts     # Per-domain rate limiter (copy from enrichment)
│   │   └── apify.ts            # Apify actor client (copy from enrichment)
│   └── normalization/
│       ├── column-mapper.ts    # Hybrid column normalization (pattern library + AI fallback)
│       ├── known-schemas.ts    # ~10 known council CSV column mappings
│       └── category-taxonomy.ts # Spend category normalization
├── wrangler.toml
├── package.json
└── tsconfig.json

src/models/
├── spend-transaction.ts        # Individual spending records (new)
└── spend-summary.ts            # Pre-computed per-buyer aggregates (new)

src/components/buyers/
├── spending-tab.tsx            # Main spending tab container (new)
├── spending-hero.tsx           # Profile match hero card (new)
├── spend-categories-chart.tsx  # Bar chart of top categories (new)
├── spend-timeline-chart.tsx    # Line chart of spend over time (new)
├── spend-vendors-table.tsx     # Top vendors ranked table (new)
├── spend-breakdown-table.tsx   # Filterable transaction table (new)
├── spend-opportunities.tsx     # Opportunity cards (new)
└── spend-filters.tsx           # Filter chips for spend breakdown (new)

src/lib/
└── spend-analytics.ts          # On-the-fly computation: profile matching, patterns, signals (new)

src/app/api/buyers/[id]/
└── spending/route.ts           # API route for spend data + analytics (new)
```

### Pattern 1: Multi-Stage Pipeline with Cursor Resume (Established Pattern)
**What:** Sequential stages with cursor-based batch processing, crash-safe resume across Worker invocations.
**When to use:** For the spend ingestion pipeline -- same pattern as `workers/enrichment/`.
**Example:**
```typescript
// Source: workers/enrichment/src/enrichment-engine.ts (existing codebase)
export type SpendIngestStage = "discover" | "extract_links" | "download_parse" | "aggregate";

export const STAGE_ORDER: SpendIngestStage[] = [
  "discover",
  "extract_links",
  "download_parse",
  "aggregate",
];

// Each stage: (db, env, job, maxItems) => { processed, errors, done }
```

### Pattern 2: Hybrid CSV Column Normalization
**What:** A pattern library of ~10 known council CSV schemas with AI fallback for unknown formats.
**When to use:** Stage 3 (download_parse) when normalizing varied CSV column names to a unified schema.
**Example:**
```typescript
// Known schema patterns (covers ~60-70% of councils)
const KNOWN_SCHEMAS: ColumnMapping[] = [
  {
    // Devon pattern: "Expense Area", "Expense Type", "Amount", "Supplier Name", "Date"
    detect: (headers) => headers.includes("Expense Area") && headers.includes("Expense Type"),
    map: {
      date: "Date",
      amount: "Amount",
      vendor: "Supplier Name",
      category: "Expense Area",
      subcategory: "Expense Type",
      department: "Name",        // body name column
      reference: "Transaction Number",
    },
  },
  {
    // Rochdale pattern: "DIRECTORATE", "PURPOSE", "AMOUNT (£)", "SUPPLIER NAME"
    detect: (headers) => headers.some(h => h.toUpperCase() === "DIRECTORATE"),
    map: {
      date: "EFFECTIVE DATE",
      amount: "AMOUNT (£)",
      vendor: "SUPPLIER NAME",
      category: "PURPOSE",
      department: "DIRECTORATE",
      reference: "TRANSACTION No.",
    },
  },
  {
    // Ipswich pattern: "Service Area Categorisation", "Expenses Type"
    detect: (headers) => headers.includes("Service Area Categorisation"),
    map: {
      date: "Date",
      amount: "Amount",
      vendor: "Supplier Name",
      category: "Service Area Categorisation",
      subcategory: "Expenses Type",
      department: "Responsible Unit",
      reference: "Transaction Number",
    },
  },
  // ... ~7 more known patterns
];

// AI fallback for unrecognized schemas
async function mapColumnsWithAI(
  headers: string[],
  sampleRows: string[][],
  anthropicApiKey: string
): Promise<ColumnMapping["map"]> {
  // Claude Haiku maps unknown headers to our unified schema
  // See "Code Examples" section for full implementation
}
```

### Pattern 3: Two-Tier Storage (Transactions + Summaries)
**What:** Store individual transactions for drill-down, but pre-compute per-buyer summaries for fast chart rendering.
**When to use:** Always. Raw transactions can be millions of rows; aggregates enable sub-second chart loading.
**Example:**
```typescript
// SpendTransaction: individual rows (potentially millions)
interface SpendTransaction {
  _id?: ObjectId;
  buyerId: ObjectId;
  date: Date;
  amount: number;                  // GBP, net of VAT
  vendor: string;                  // normalized vendor name
  vendorNormalized: string;        // lowercased, stripped
  category: string;                // normalized spend category
  subcategory?: string;
  department?: string;             // council department/directorate
  reference?: string;              // transaction number
  sourceFile: string;              // which CSV this came from
  rawColumns?: Record<string, string>; // original CSV row for debugging
}

// SpendSummary: pre-computed per-buyer aggregates (one per buyer)
interface SpendSummary {
  _id?: ObjectId;
  buyerId: ObjectId;
  totalTransactions: number;
  totalSpend: number;
  dateRange: { earliest: Date; latest: Date };
  categoryBreakdown: Array<{ category: string; total: number; count: number }>;
  vendorBreakdown: Array<{ vendor: string; total: number; count: number }>;
  monthlyTotals: Array<{ year: number; month: number; total: number }>;
  topVendors: Array<{ vendor: string; total: number; percentage: number }>;
  lastComputedAt: Date;
}
```

### Pattern 4: On-the-fly Opportunity Computation
**What:** Compute opportunity insights at request time by comparing buyer spend data against the user's company profile.
**When to use:** When rendering the Spending tab hero section and opportunity cards.
**Example:**
```typescript
// Source: Follows existing pattern from src/lib/buyers.ts fetchBuyerById
async function computeSpendOpportunities(
  buyerId: string,
  userProfile: ICompanyProfile
): Promise<SpendOpportunities> {
  const [summary, transactions] = await Promise.all([
    SpendSummary.findOne({ buyerId }).lean(),
    SpendTransaction.find({ buyerId }).sort({ date: -1 }).limit(5000).lean(),
  ]);

  return {
    profileMatch: computeProfileMatch(summary, userProfile),
    recurringPatterns: detectRecurringSpend(transactions),
    vendorConcentration: analyzeVendorConcentration(summary),
    spendGrowthSignals: detectSpendGrowth(summary),
  };
}
```

### Anti-Patterns to Avoid
- **Storing raw CSV text in MongoDB:** Individual transactions are already structured data; do NOT store entire CSV files. Parse, normalize, and store individual rows.
- **Fetching all transactions for charts:** Use pre-computed SpendSummary for charts. Only fetch raw transactions for the drill-down breakdown table (with pagination).
- **Single monolithic Worker for everything:** Do NOT add spend ingestion stages to the existing enrichment Worker. It already has 8 stages with its own cron schedule. Create a separate Worker.
- **Synchronous CSV processing in the main app:** CSV parsing and ingestion MUST happen in the background Worker, never in Next.js API routes or server components.
- **Trying to predict which URL pattern a council uses:** Every council has a different URL structure for their transparency page. The AI discovery agent must browse each site individually.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom CSV parser | PapaParse 5.5.x | Handles quoted fields, escaped commas, malformed rows, BOM markers, mixed line endings. Edge cases are brutal. |
| Chart components | Custom SVG/Canvas charts | Recharts 3.x via shadcn/ui chart | Responsive containers, tooltips, legends, dark mode, animations -- hundreds of edge cases |
| Vendor name dedup | Custom string matching | Fuse.js 7.x (already in enrichment Worker) | "ACME LTD" vs "Acme Limited" vs "ACME CONSULTING LIMITED" -- fuzzy matching with tunable threshold |
| Rate limiting | Custom per-domain throttling | Copy existing rate-limiter.ts from enrichment Worker | Already handles exponential backoff, Retry-After headers, per-domain delays |
| Column header matching | Rigid exact-match mapping | Hybrid pattern library + Claude Haiku AI fallback | Councils use wildly inconsistent naming; even "known" councils change format between years |

**Key insight:** The spend data domain is deceptively messy. Every council publishes in a slightly different format (7+ known column schemas discovered in research), dates use inconsistent formats (DD-Mon-YY, DD/MM/YYYY, YYYY-MM-DD), amounts may have currency symbols or parentheses for negatives, and supplier names are never normalized. Hand-rolling any of the parsing/matching logic will result in constant breakage.

## Common Pitfalls

### Pitfall 1: MongoDB Atlas Free Tier Storage Limit (512 MB)
**What goes wrong:** With ~2,384 buyers potentially having years of monthly spending CSVs, individual transaction storage could easily exceed 512 MB. A single council might publish 2,000+ rows/month for 7+ years = ~170K transactions per buyer. Even at ~200 bytes per transaction, 2,384 buyers * 170K rows * 200 bytes = ~81 GB -- completely impossible on free tier.
**Why it happens:** Optimistic storage estimation without considering the volume of historical spend data.
**How to avoid:** Implement a tiered approach:
  1. Store SpendSummary (aggregates) for ALL buyers -- ~1 KB per buyer = ~2.4 MB total
  2. Store SpendTransactions for ONLY the last 12-24 months per buyer, or cap at N transactions per buyer
  3. Use the `sourceFile` field to track which CSVs were processed without storing every row
  4. Consider: only store transactions when the user actually views a buyer (lazy ingestion)
**Warning signs:** Database storage growing faster than expected; slow queries on SpendTransaction collection.

### Pitfall 2: CSV Date Format Inconsistency
**What goes wrong:** Date parsing fails silently or produces wrong dates. Rochdale uses "12-Nov-25" (DD-Mon-YY), Devon uses various formats, some councils use "25/11/2025" (DD/MM/YYYY), others use ISO 8601.
**Why it happens:** No standard date format in the UK Transparency Code. Each council's finance system exports differently.
**How to avoid:** Build a robust date parser that tries multiple formats in priority order:
  1. ISO 8601 (YYYY-MM-DD)
  2. DD/MM/YYYY
  3. DD-Mon-YY and DD-Mon-YYYY
  4. MM/DD/YYYY (rare but some councils use it)
  5. Fallback: skip the row and log it
**Warning signs:** Transactions showing up in year 2025 instead of 2019 (two-digit year ambiguity), or all dates being null.

### Pitfall 3: Negative Amounts and Refunds
**What goes wrong:** Spend totals are incorrect because refunds/credits are not handled. Some councils use parentheses "(1,234.56)" for negative amounts, others use "-1234.56", some prefix with "CR".
**Why it happens:** Accounting convention varies between council finance systems.
**How to avoid:** Amount parsing must handle: parentheses as negative, CR/DR prefixes, currency symbols (GBP), comma thousands separators, and negative sign. Filter out or flag refunds separately in aggregation.
**Warning signs:** Category totals that seem too low, or individual transaction amounts that don't match expectations.

### Pitfall 4: Transparency Page Discovery Failure Rate
**What goes wrong:** The AI agent cannot find the transparency/spending page for many buyers, especially NHS trusts, MATs, and ALBs which are not local councils.
**Why it happens:** The UK Transparency Code only applies to local authorities. NHS trusts, universities, and ALBs may publish spending data voluntarily or not at all. Different org types have different transparency obligations.
**How to avoid:**
  1. Prioritize local councils (orgType starting with "local_council_*") -- these are legally required to publish
  2. For NHS trusts and ICBs, check for spending data but expect lower hit rates
  3. Track discovery success rate per orgType and skip org types with very low success rates
  4. Set realistic expectations: likely 40-60% of the 2,384 buyers will have accessible spending CSVs
**Warning signs:** Discovery stage processing many buyers with 0 CSVs found.

### Pitfall 5: Cloudflare Worker Memory Limit (128 MB)
**What goes wrong:** Worker crashes when parsing large CSV files (some monthly spend files can be 5-20 MB with 10K+ rows).
**Why it happens:** PapaParse loads the entire file into memory by default; combined with MongoDB driver overhead, 128 MB is tight.
**How to avoid:** Use PapaParse streaming mode (`step` callback in Node.js, or the streaming-csv-worker adapter). Process rows in chunks of 500, bulk-insert to MongoDB, and discard parsed rows before loading more.
**Warning signs:** Worker returning 1101 errors (Worker exceeded memory limit) or silently dying mid-processing.

### Pitfall 6: Vendor Name Normalization Explosion
**What goes wrong:** The same vendor appears as dozens of variations: "AMAZON WEB SERVICES", "AWS", "Amazon.com Inc", "AMAZON EU SARL", etc. Top vendor lists become useless.
**Why it happens:** Each council types vendor names differently in their finance system.
**How to avoid:** Two-pass normalization:
  1. Basic: lowercase, strip "Ltd", "Limited", "PLC", "Inc", trim whitespace, remove punctuation
  2. Fuzzy: Fuse.js within-buyer dedup (threshold 0.3) to merge close matches
  3. Store both `vendor` (display name) and `vendorNormalized` (deduped key) fields
**Warning signs:** "Top vendors" list showing the same company under 5+ names.

## Code Examples

Verified patterns from official sources and the existing codebase:

### Unified Spend Transaction Schema (Mongoose)
```typescript
// Source: Follows pattern from src/models/buyer.ts, src/models/board-document.ts
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const spendTransactionSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, index: true },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true },              // GBP, positive or negative
    vendor: { type: String, required: true },               // Display name
    vendorNormalized: { type: String, required: true, index: true }, // Deduped key
    category: { type: String, required: true, index: true }, // Normalized category
    subcategory: { type: String },
    department: { type: String },
    reference: { type: String },
    sourceFile: { type: String },                           // CSV filename for audit
  },
  { timestamps: true }
);

// Compound index for efficient buyer + date range queries
spendTransactionSchema.index({ buyerId: 1, date: -1 });
// Compound index for category analytics
spendTransactionSchema.index({ buyerId: 1, category: 1 });
// Compound index for vendor analytics
spendTransactionSchema.index({ buyerId: 1, vendorNormalized: 1 });

export type ISpendTransaction = InferSchemaType<typeof spendTransactionSchema>;
const SpendTransaction =
  mongoose.models.SpendTransaction ||
  mongoose.model("SpendTransaction", spendTransactionSchema);
export default SpendTransaction;
```

### Spend Summary Schema (Pre-computed Aggregates)
```typescript
// Source: Follows pattern from src/models/enrichment-job.ts
const spendSummarySchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true, unique: true },
    totalTransactions: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    dateRange: {
      earliest: { type: Date },
      latest: { type: Date },
    },
    categoryBreakdown: [{
      category: { type: String },
      total: { type: Number },
      count: { type: Number },
      _id: false,
    }],
    vendorBreakdown: [{
      vendor: { type: String },
      total: { type: Number },
      count: { type: Number },
      _id: false,
    }],
    monthlyTotals: [{
      year: { type: Number },
      month: { type: Number },
      total: { type: Number },
      _id: false,
    }],
    csvFilesProcessed: [{ type: String }],  // Track which CSVs were ingested
    lastComputedAt: { type: Date },
  },
  { timestamps: true }
);
```

### Hybrid Column Normalization with AI Fallback
```typescript
// Source: Pattern from workers/enrichment/src/stages/05-personnel.ts (Claude Haiku extraction)
interface UnifiedRow {
  date: Date | null;
  amount: number;
  vendor: string;
  category: string;
  subcategory?: string;
  department?: string;
  reference?: string;
}

interface ColumnMapping {
  detect: (headers: string[]) => boolean;
  map: Record<keyof UnifiedRow, string>;  // unified field -> CSV column name
}

// Try known schemas first, fall back to AI
async function normalizeRow(
  headers: string[],
  row: Record<string, string>,
  mapping: ColumnMapping["map"]
): Promise<UnifiedRow> {
  return {
    date: parseFlexibleDate(row[mapping.date]),
    amount: parseAmount(row[mapping.amount]),
    vendor: (row[mapping.vendor] ?? "").trim(),
    category: (row[mapping.category] ?? "Unknown").trim(),
    subcategory: mapping.subcategory ? (row[mapping.subcategory] ?? "").trim() : undefined,
    department: mapping.department ? (row[mapping.department] ?? "").trim() : undefined,
    reference: mapping.reference ? (row[mapping.reference] ?? "").trim() : undefined,
  };
}

// Robust amount parser
function parseAmount(raw: string): number {
  if (!raw) return 0;
  let cleaned = raw.trim();
  const isNegative = cleaned.startsWith("(") || cleaned.startsWith("-") || cleaned.toUpperCase().startsWith("CR");
  cleaned = cleaned.replace(/[^0-9.]/g, ""); // Strip everything except digits and decimal
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return isNegative ? -value : value;
}

// Flexible date parser (tries multiple UK date formats)
function parseFlexibleDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // ISO 8601: 2025-11-12
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD-Mon-YY or DD-Mon-YYYY (e.g., "12-Nov-25")
  const ddmonyy = trimmed.match(/^(\d{1,2})-(\w{3})-(\d{2,4})$/);
  if (ddmonyy) {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = months[ddmonyy[2]];
    if (month === undefined) return null;
    let year = +ddmonyy[3];
    if (year < 100) year += year < 50 ? 2000 : 1900; // 25 -> 2025, 99 -> 1999
    const d = new Date(year, month, +ddmonyy[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
```

### shadcn/ui Chart Component (Spend Over Time)
```typescript
// Source: shadcn/ui chart docs (https://ui.shadcn.com/docs/components/radix/chart)
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MonthlySpend {
  month: string; // "2024-01", "2024-02", etc.
  total: number;
}

const chartConfig = {
  total: {
    label: "Total Spend",
    color: "var(--chart-1)",
  },
};

export function SpendTimelineChart({ data }: { data: MonthlySpend[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              notation: "compact",
            }).format(v)
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
```

### Transparency Page Discovery via Claude Haiku
```typescript
// Source: Pattern from workers/enrichment/src/stages/05-personnel.ts
async function discoverTransparencyPage(
  buyerName: string,
  websiteUrl: string,
  htmlContent: string,
  anthropicApiKey: string,
): Promise<{ transparencyUrl: string | null; csvLinks: string[] }> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20250401",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are analyzing a UK public sector website to find spending transparency data.

Website: ${websiteUrl}
Organization: ${buyerName}

Here is the HTML content of the page:
<html>
${htmlContent.slice(0, 8000)}
</html>

Find:
1. Links to "transparency", "spending", "payments over 500", or similar pages
2. Direct links to CSV files containing spending/payment data
3. Links to open data portals or transparency data pages

Return JSON:
{
  "transparencyUrl": "URL of the transparency/spending page, or null",
  "csvLinks": ["array of direct CSV download URLs found"],
  "confidence": "HIGH|MEDIUM|LOW"
}`,
    }],
  });

  // Parse response...
}
```

## Discretion Decisions (Claude's Recommendations)

### CSV Column Normalization Strategy: Hybrid (Pattern Library + AI Fallback)
**Recommendation:** Use a pattern library of ~10 known column schemas covering the most common formats, with Claude Haiku AI fallback for unrecognized schemas.
**Rationale:**
- Research found at least 5 distinct column naming conventions across UK councils
- ONS Data Science Campus reports that format/schema inconsistency is the #1 challenge
- Known patterns can handle ~60-70% of councils (the most common formats)
- AI fallback handles the long tail without requiring manual mapping for each new council
- The AI mapping result should be cached per-council (store the mapping alongside the buyer) so it only runs once per council
**Confidence:** HIGH -- this is a well-understood NLP task for Claude Haiku, and the enrichment Worker already uses this pattern for personnel extraction.

### Chart Library: Recharts 3.x via shadcn/ui
**Recommendation:** Use Recharts 3.7.x (latest stable) installed via the shadcn/ui chart component.
**Rationale:**
- shadcn/ui officially uses Recharts and provides ChartContainer, ChartTooltip, ChartLegend wrapper components
- Recharts 3.x dropped the problematic `react-is` dependency -- native React 19 support without overrides
- The project already uses React 19.2.3 and Next.js 16.1 -- Recharts 3.x is compatible
- 53 pre-built chart examples in shadcn/ui cover all four views needed (bar, line, area, table)
- Dark mode support works automatically through CSS variables
**Confidence:** HIGH -- verified via Context7 (Recharts docs), shadcn/ui official docs, and Recharts 3.0 migration guide.

### Spend Category Taxonomy: Normalize to ~20-30 High-Level Categories
**Recommendation:** Define a taxonomy of ~20-30 spend categories and normalize all council-specific categories into this taxonomy using keyword matching + AI fallback.
**Rationale:**
- Councils use hundreds of different expense type labels ("EQUIPMENT - GENERAL", "IT Services", "Information Technology", "Computer Services" are all the same thing)
- The UK government ProClass system has 46 top-level categories -- too granular for display
- A curated list of ~20-30 categories (IT & Digital, Facilities & Maintenance, Professional Services, Construction, Transport, Healthcare, Education, Energy & Utilities, etc.) provides meaningful grouping
- Normalize via keyword matching first, AI fallback for ambiguous cases
- Store both original category (from CSV) and normalized category for audit
**Confidence:** MEDIUM -- the taxonomy itself is a judgment call; may need iteration after seeing real data distribution.

### Malformed/Incomplete CSV Handling: Skip & Log
**Recommendation:** Parse what can be parsed, skip malformed rows, log errors per-file.
**Rationale:**
- PapaParse has built-in error handling for malformed CSVs (it reports errors per-row without failing the entire parse)
- Some councils publish Excel files disguised as .csv (they won't parse at all) -- skip these
- Some rows have missing amounts or dates -- skip rows where amount is 0/null or date is unparseable
- Track per-file: total rows, parsed rows, skipped rows, error types
- A file with >50% error rate should be flagged for manual review
**Confidence:** HIGH -- this is standard defensive parsing practice.

### Opportunity Card Design: Compact Cards with Metric + Context
**Recommendation:** Use shadcn/ui Card components with a colored left border indicating opportunity type, a large metric number, and 1-2 lines of context text.
**Rationale:**
- Follows existing buyer profile card patterns (BuyerHeader, ContractsTab)
- Four opportunity types map to four visual variants:
  - Profile Match: blue border, shows "GBP X spent in your sectors" + match percentage
  - Recurring Spend: green border, shows pattern description + frequency
  - Vendor Concentration: amber/orange border, shows "X% of spend with Y vendor"
  - Spend Growth: purple border, shows "Category grew X% YoY"
**Confidence:** MEDIUM -- visual design decisions are inherently subjective; will need user feedback.

## UK Transparency Code: What the Data Looks Like

### Mandatory Fields (Local Government Transparency Code 2015)
Every English local authority MUST publish for transactions over GBP 500:
1. **Date** the expenditure was incurred
2. **Local authority department** which incurred the expenditure
3. **Beneficiary** (recipient/vendor)
4. **Summary of the purpose** of the expenditure
5. **Amount**
6. **VAT** that cannot be recovered
7. **Merchant category** (e.g., computers, software)

### Real-World Column Variations Discovered

| Council | Date Column | Amount Column | Vendor Column | Category Column | Department Column |
|---------|------------|---------------|---------------|-----------------|-------------------|
| Devon | Date | Amount | Supplier Name | Expense Area | Name |
| Rochdale | EFFECTIVE DATE | AMOUNT (£) | SUPPLIER NAME | PURPOSE | DIRECTORATE |
| Ipswich | Date | Amount | Supplier Name | Service Area Categorisation | Responsible Unit |
| Manchester | Invoice Payment Date | Net Amount | Supplier Name | Service Area | (same) |
| Eden | Date | Amount | Supplier Name | Expense Area | Body Name |

### Coverage Expectations
- **Local councils** (~317 in DataSource): ~85-90% should have accessible CSVs (legally required)
- **NHS trusts**: Lower coverage (~40-50%), voluntary publication
- **Universities, MATs, ALBs**: Very low coverage (~10-20%), no legal requirement for GBP 500 transparency
- **Realistic total**: Expect ~800-1,200 buyers out of 2,384 to have usable spend data

### Data Volume Estimation
- Average council: ~1,000-5,000 transactions per month
- Average file size: 200 KB - 5 MB per monthly CSV
- Historical depth: Most councils publish from 2013-2018 onwards
- Per council total: 50K-500K transactions over full history
- **Critical constraint:** Must cap storage or use lazy loading due to MongoDB Atlas 512 MB limit

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x with react-is override | Recharts 3.x native React 19 support | 2025 | No more dependency conflicts |
| Manual CSV column mapping per council | AI-assisted column mapping (LLM) | 2024-2025 | Scales to hundreds of council formats without manual work |
| shadcn/ui without charts | shadcn/ui chart component (Recharts wrapper) | 2024 | Official chart support with theming, dark mode, tooltips |
| Cloudflare Workers 30s CPU limit | 15 min CPU for hourly+ cron triggers | 2025 | Plenty of time for batch CSV processing |

**Deprecated/outdated:**
- Recharts 2.x: Still works but requires react-is override for React 19. Use 3.x instead.
- Custom chart wrappers around Recharts: shadcn/ui provides official ChartContainer, ChartTooltip, etc.

## Open Questions

1. **MongoDB Atlas Storage Budget**
   - What we know: Free tier has 512 MB hard limit. SpendSummary aggregates are small (~2.4 MB for all buyers). Raw SpendTransactions could be massive (tens of GB for full history of all councils).
   - What's unclear: Whether the user plans to stay on free tier or upgrade. How much of the 512 MB is already used by existing collections.
   - Recommendation: Default to storing only SpendSummary aggregates + last 12 months of transactions. Add a configurable `MAX_TRANSACTIONS_PER_BUYER` setting. If the user upgrades to a paid Atlas tier, this limit can be raised.

2. **Cron Schedule for Spend Ingestion Worker**
   - What we know: Enrichment Worker runs hourly. Spend data is published monthly or quarterly by councils.
   - What's unclear: How frequently should the spend worker run? Daily seems excessive; weekly or monthly is more appropriate.
   - Recommendation: Run weekly (e.g., `0 3 * * 1` = Mondays at 3 AM). New CSV files only appear monthly, so weekly catches them promptly without waste.

3. **Apify Costs for Transparency Page Discovery**
   - What we know: The cheerio-scraper actor is free (pay only for compute). But running it for ~2,384 buyer websites will consume Apify compute credits.
   - What's unclear: Exact compute cost per buyer for discovery + link extraction.
   - Recommendation: Use a two-phase approach: (1) Direct fetch + HTML parse for simple pages (free, just fetch() calls), (2) Apify only for complex JavaScript-rendered pages that require a browser. Most council transparency pages are static HTML.

4. **How Spend Data Feeds Into Vibe Scanner Scoring**
   - What we know: The user wants spend data to feed into existing Vibe Scanner buyer scoring. The current enrichment score (0-100) has a fixed weight allocation.
   - What's unclear: Specific weights or scoring formula for spend data contribution.
   - Recommendation: Extend the enrichment score computation (06-score.ts) to include a "spend data completeness" factor. Add ~10 points for having spend data + opportunity insights. Exact formula to be defined during planning.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `workers/enrichment/` pipeline architecture, stages pattern, rate limiter, Apify client
- Existing codebase: `src/models/buyer.ts`, `src/components/buyers/buyer-tabs.tsx` for buyer profile patterns
- Existing codebase: `src/components/buyers/buyer-filters.tsx` for filter UI patterns
- Context7 `/recharts/recharts` -- chart component APIs, ResponsiveContainer, custom tooltips
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/radix/chart) -- ChartContainer, ChartTooltip, installation
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- breaking changes, dependency removal
- [Local Government Transparency Code 2015](https://www.gov.uk/government/publications/local-government-transparency-code-2015/local-government-transparency-code-2015) -- mandatory fields, publication frequency
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) -- CPU time, memory, subrequests

### Secondary (MEDIUM confidence)
- [ONS Data Science Campus: Exploring trends in local government spending](https://datasciencecampus.ons.gov.uk/exploring-trends-in-local-government-spending-through-transparency-declarations/) -- data quality challenges, 333 authorities analyzed, 60% match rate for corporate entities
- [Devon County Council spending repo](https://github.com/Devon-County-Council/spending) -- 13-column CSV format, 2011-2026 data
- [Ipswich Borough Council transparency data](https://www.ipswich.gov.uk/your-council/council-budgets-and-spending/transparency-spending-over-ps500) -- 10-column CSV format, 75+ monthly files
- [data.gov.uk Council Spending](https://www.data.gov.uk/dataset/b7e5bb16-dc43-44d3-979d-529fd7f5af13/council-spending) -- centralized council spending portal
- [ProClass Procurement Classification](https://proclass.org.uk/about.html) -- UK local authority spend classification standard
- [PapaParse docs](https://www.papaparse.com/docs) -- streaming CSV parsing, error handling
- [Recharts React 19 issue #4558](https://github.com/recharts/recharts/issues/4558) -- react-is dependency resolution in v3

### Tertiary (LOW confidence)
- [Cloudflare community: PapaParse in Workers](https://community.cloudflare.com/t/how-to-use-papaparse-or-streaming-csv-workers-to-convert-csv-to-json/443163) -- community reports on PapaParse+Workers compatibility; may need streaming adapter
- [streaming-csv-worker](https://github.com/ctohm/streaming-csv-worker) -- Adapter for PapaParse in Cloudflare Workers; needs validation that it works with current Workers runtime

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts 3.x verified via Context7 + official docs; PapaParse well-established; all other libraries already in project
- Architecture: HIGH -- Follows established patterns from workers/enrichment/ and workers/data-sync/ in the existing codebase
- CSV normalization: MEDIUM -- Column mapping patterns verified from real council CSVs, but AI fallback effectiveness is theoretical until tested with real data
- Opportunity surfacing: MEDIUM -- The four opportunity types are well-defined but the exact computation logic (especially recurring spend detection) needs implementation-time refinement
- Pitfalls: HIGH -- Storage limits, date parsing, and column inconsistency are well-documented challenges with concrete mitigations

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days -- stable domain, libraries are mature)
