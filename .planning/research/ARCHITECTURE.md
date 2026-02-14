# Architecture Research: Ofsted Timeline Intelligence

## Component Overview

This feature integrates into the existing TendHunt architecture. No new services -- everything extends existing patterns.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (apps/web)                     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Schools       │  │ School Detail│  │ Buyer Detail        │ │
│  │ Scanner Page  │  │ Page         │  │ (Ofsted Tab)        │ │
│  │ /scanners/[id]│  │ /schools/[id]│  │ /buyers/[id]        │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
│         │                  │                    │              │
│  ┌──────┴──────────────────┴────────────────────┴───────────┐│
│  │                    API Routes                             ││
│  │  /api/scanners/[id]/schools  (list + filter)              ││
│  │  /api/scanners/[id]/score-column (AI analysis)            ││
│  │  /api/schools/[urn]  (detail + history)                   ││
│  │  /api/schools/[urn]/report  (fetch + extract PDF text)    ││
│  └──────────────────────┬───────────────────────────────────┘│
│                          │                                    │
│  ┌───────────────────────┴──────────────────────────────────┐│
│  │                    MongoDB Collections                    ││
│  │  ofstedschools  (main school data + inspectionHistory[])  ││
│  │  scanners       (+ type: "schools")                       ││
│  │  signals        (existing, Ofsted regulatory signals)     ││
│  │  buyers         (linked via buyerId)                      ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Ingestion Scripts (one-time + cron)           │
│                                                               │
│  ingest-ofsted.ts          (monthly CSV -- latest ratings)    │
│  ingest-ofsted-history.ts  (NEW -- historical CSVs)           │
│  generate-ofsted-signals.ts (signal generation)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 External Data Sources                         │
│                                                               │
│  GOV.UK Monthly CSV        (latest inspection per school)     │
│  GOV.UK "All Inspections"  (multiple rows per school/year)    │
│  files.ofsted.gov.uk       (PDF reports)                      │
│  reports.ofsted.gov.uk     (provider pages, PDF links)        │
└─────────────────────────────────────────────────────────────┘
```

## Data Model Extensions

### Option A: Embedded Array (Recommended)

Add `inspectionHistory` array to the existing `OfstedSchool` model:

```typescript
inspectionHistory: [{
  inspectionNumber: Number,
  inspectionDate: Date,
  publicationDate: Date,
  inspectionType: String,
  overallEffectiveness: Number,      // null for post-Sep-2024
  qualityOfEducation: Number,
  behaviourAndAttitudes: Number,
  personalDevelopment: Number,
  leadershipAndManagement: Number,
  reportUrl: String,
  reportFileId: String,              // files.ofsted.gov.uk ID
}]
```

**Why embedded:** Each school has 2-6 inspections over 20 years. Small arrays. Queried together with school data. No need for joins.

Also add computed fields for fast filtering:

```typescript
lastDowngradeDate: Date,             // computed: when was the most recent downgrade
downgradeType: String,               // "overall" | "sub-judgement" | null
ratingDirection: String,             // "improved" | "downgraded" | "unchanged" | null
```

### Option B: Separate Collection

`ofstedinspections` collection with one document per inspection, linked by URN.

**Why NOT:** Extra join on every query. Schools have few inspections. Embedded is simpler.

## Scanner Integration

### New Scanner Type: "schools"

Add `"schools"` to the `ScannerType` union in `apps/web/src/models/scanner.ts`:

```typescript
export type ScannerType = "rfps" | "meetings" | "buyers" | "schools";
```

### Scanner Filters (schools-specific)

Extend the scanner `filters` schema:

```typescript
filters: {
  // Existing generic filters...
  // New schools-specific filters:
  ofstedRating: Number,              // 1-4 overall effectiveness
  ofstedSubRating: String,           // "qualityOfEducation:3" format
  downgradeWithin: String,           // "1m" | "3m" | "6m" | "1y" | "any"
  schoolPhase: String,               // "Primary" | "Secondary" | "All-through"
  localAuthority: String,
  matName: String,
}
```

### Column Definitions

New column definitions in `table-columns.ts` for the "schools" scanner type:

| Column | Type | Accessor |
|--------|------|----------|
| School | entity-name | name |
| Rating | badge | overallEffectiveness |
| Quality of Education | badge | qualityOfEducation |
| Inspection Date | date | inspectionDate |
| Previous Rating | badge | previousOverallEffectiveness |
| Rating Change | badge | ratingDirection |
| Region | badge | region |
| School Phase | badge | phase |
| Pupils | number | totalPupils |
| Local Authority | text | localAuthority |

### AI Column for Report Analysis

The existing AI column infrastructure handles this. The scoring API route (`/api/scanners/[id]/score-column`) needs a new handler for schools entities that:

1. Fetches the school's `reportUrl` or constructs URL from URN
2. Downloads the PDF from `files.ofsted.gov.uk`
3. Extracts text via `pdf-parse`
4. Sends text to Claude with the AI column's prompt (e.g., "Score how likely this school needs tuition services based on the Ofsted report")
5. Returns score (0-10) + reasoning

## Data Flow

### Ingestion Flow (one-time + monthly refresh)

```
1. Download "all inspections" CSVs from GOV.UK (2005-2015, 2015-2019, yearly after)
2. Parse each CSV → group rows by URN
3. For each school: build inspectionHistory[] array sorted by date
4. Compute: lastDowngradeDate, downgradeType, ratingDirection
5. Upsert into ofstedschools collection (merge with existing data)
```

### Query Flow (scanner)

```
1. User creates scanner with type: "schools", filters: { downgradeWithin: "3m" }
2. API builds MongoDB query: { lastDowngradeDate: { $gte: 3 months ago } }
3. Returns paginated results with school data
4. Grid renders with Ofsted-specific columns
5. User adds AI column "Tuition Relevance"
6. Scoring engine: fetch PDF → extract text → Claude analysis → score
```

### Detail Page Flow

```
1. User clicks school in scanner → /schools/[urn]
2. API fetches school + inspectionHistory
3. Page renders timeline visualization (rating over time)
4. Links to buyer page if school has buyerId
5. Links to Ofsted report PDFs
```

## Build Order (suggested)

1. **Schema extension** -- add inspectionHistory[], computed fields to OfstedSchool model
2. **History ingestion script** -- parse historical CSVs, populate inspectionHistory
3. **Scanner type + filters** -- add "schools" to scanner, define columns and filters
4. **Scanner API** -- query ofstedschools with downgrade filters
5. **Scanner UI** -- grid with school columns, filter controls
6. **Detail page** -- school page with timeline
7. **AI column** -- PDF fetch + text extraction + Claude scoring
8. **Timeline visualization** -- visual component for history

---
*Researched: 2026-02-14*
