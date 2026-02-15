# Stack Research: Competitor Contract Intelligence

## Existing Stack (No Changes Needed)

This is a feature addition to TendHunt, not a greenfield project. The entire stack is already in place:

- **Framework**: Next.js 16.1 (TypeScript) on Cloudflare Pages
- **Database**: MongoDB Atlas (free tier) with Mongoose ODM
- **UI**: shadcn/ui + Tailwind CSS 4.1 + Glide Data Grid
- **AI**: Claude API (Haiku) for scoring via Sculptor agent
- **Workers**: Cloudflare Workers for data ingestion pipelines

## New Stack Components Needed

### 1. MongoDB Atlas Search Index (HIGH CONFIDENCE)

**What**: Atlas Search index on `awardedSuppliers.name` field in the contracts collection, plus on `vendorNormalized` in spend transactions.

**Why**: Regular MongoDB `$text` index doesn't support fuzzy matching well. Atlas Search provides:
- Autocomplete as-you-type
- Fuzzy matching (Levenshtein distance, `maxEdits: 2`)
- Custom analyzers for company name normalization (strip "Ltd", "Limited", "PLC" etc.)
- No additional infrastructure — it's built into Atlas

**Alternative considered**: Client-side fuzzy search with Fuse.js — rejected because it requires loading all supplier names into memory. With 100k+ contracts, this doesn't scale.

**Alternative considered**: Regular `$regex` search — works for exact prefix matching but doesn't handle typos or name variations.

### 2. MongoDB Aggregation Pipeline (HIGH CONFIDENCE)

**What**: `$aggregate` pipelines to build competitor profiles from contract + spend data.

**Why**: Need to:
- Group contracts by supplier name (fuzzy-matched)
- Aggregate total value, buyer count, sector breakdown
- Join with spend data for actual payment figures
- Compute time-series (contracts won per year)

This is pure MongoDB — no new dependencies.

### 3. Company Name Normalization Utility (HIGH CONFIDENCE)

**What**: A TypeScript utility function that normalizes UK company names for matching.

**Why**: UK company names have many variations:
- Legal suffixes: "Ltd", "Limited", "PLC", "LLP", "CIC"
- Trading names vs registered names
- Abbreviations: "Dept" vs "Department"
- Punctuation: "St." vs "St" vs "Saint"

**Implementation**: Simple string manipulation — no external library needed:
```
lowercase → strip legal suffixes → normalize whitespace → strip punctuation → trim
```

The spend-ingest worker already does basic normalization (`vendorNormalized`). Extend this pattern.

### 4. No New NPM Dependencies

Everything needed is already in the project:
- `mongoose` for MongoDB queries
- `next` for API routes and pages
- `@glideapps/glide-data-grid` if we want grid views
- `recharts` for charts (already used in spend analytics)
- `lucide-react` for icons
- `motion` for animations

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| Elasticsearch | Overkill — Atlas Search does what we need within MongoDB |
| Fuse.js | Doesn't scale to 100k+ supplier names in-browser |
| Companies House API | Adds external dependency, rate limits, and complexity for v1 |
| Dedicated search service (Algolia, Meilisearch) | Atlas Search is sufficient and already available |
| GraphQL | TendHunt uses REST API routes — maintain consistency |

## Confidence Levels

| Component | Confidence | Notes |
|-----------|------------|-------|
| Atlas Search for fuzzy matching | HIGH | Standard Atlas feature, well-documented |
| MongoDB aggregation for profiles | HIGH | Already used extensively in spend analytics |
| Name normalization utility | HIGH | Simple string ops, proven pattern in codebase |
| No new dependencies needed | HIGH | Feature builds on existing stack |

---
*Researched: 2026-02-14*
