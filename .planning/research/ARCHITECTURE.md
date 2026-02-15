# Architecture Research: Competitor Contract Intelligence

## How This Integrates with TendHunt

This is a **supplier-centric** view built on top of existing **buyer-centric** data. The existing architecture already has all the data — we're adding new query patterns and UI.

## Component Map

```
┌─────────────────────────────────────────────────────────┐
│                    NEW COMPONENTS                         │
│                                                           │
│  /competitors (page)                                      │
│    ├── Search bar (Atlas Search autocomplete)              │
│    ├── Competitor profile (aggregated view)                │
│    └── Contract/buyer/spend tabs                          │
│                                                           │
│  /api/competitors/* (API routes)                          │
│    ├── /search — Atlas Search on supplier names           │
│    ├── /[name]/profile — Aggregated competitor profile    │
│    ├── /[name]/contracts — Paginated contract list        │
│    ├── /[name]/buyers — Buyer relationship aggregation    │
│    └── /[name]/spend — Spend data aggregation             │
│                                                           │
│  lib/competitors.ts (data layer)                          │
│    ├── searchSuppliers() — Atlas Search query             │
│    ├── getCompetitorProfile() — Aggregation pipeline      │
│    ├── getCompetitorContracts() — Query + pagination      │
│    ├── getCompetitorBuyers() — Group by buyer             │
│    └── getCompetitorSpend() — Cross-collection join       │
│                                                           │
│  lib/supplier-normalize.ts (utility)                      │
│    └── normalizeSupplierName() — Strip suffixes, etc.     │
│                                                           │
│  Sculptor tool: search_competitor                         │
│    └── Tool handler in tool-handlers.ts                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         │
                         │ reads from
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  EXISTING DATA LAYER                      │
│                                                           │
│  contracts collection                                     │
│    └── awardedSuppliers[].name (+ new index)             │
│    └── buyerId, buyerName, sector, value, dates          │
│                                                           │
│  spendtransactions collection                             │
│    └── vendor, vendorNormalized (already indexed)        │
│    └── buyerId, amount, date, category                   │
│                                                           │
│  spendsummaries collection                                │
│    └── vendorBreakdown[] (pre-aggregated per buyer)      │
│                                                           │
│  buyers collection                                        │
│    └── name, sector, region, orgType (for display)       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Search Flow
```
User types "Tutors Green"
  → Debounced API call to /api/competitors/search
  → Atlas Search autocomplete on contracts.awardedSuppliers.name
  → Also search spendtransactions.vendorNormalized
  → Deduplicate + rank results
  → Return top 10 suggestions
  → User clicks one
  → Navigate to /competitors/[encodedName]
```

### Profile Aggregation Flow
```
/competitors/[name] loads
  → Server component calls getCompetitorProfile(name)
  → MongoDB aggregation on contracts:
      $match: { "awardedSuppliers.name": { $regex: normalizedName } }
      $group: { totalContracts, totalValue, uniqueBuyers, sectorBreakdown }
  → Parallel: query spendtransactions for this vendor
      $match: { vendorNormalized: normalizedName }
      $group: { totalSpend, buyerSpend, categoryBreakdown }
  → Combine into CompetitorProfile object
  → Render profile page with tabs
```

### Buyer Relationships Flow
```
From competitor profile data:
  → Extract all unique buyerIds from matching contracts
  → Group contracts by buyerId: { count, totalValue, firstDate, lastDate }
  → Fetch buyer details (name, sector, region)
  → Sort by totalValue descending
  → Show as table with links to buyer pages
```

## URL Structure

| Route | Purpose |
|-------|---------|
| `/competitors` | Search page with prominent search bar |
| `/competitors/[encodedName]` | Competitor profile page |
| `/competitors/[encodedName]/contracts` | Full contract list (if needed as separate page) |

**Note**: Using encoded supplier name in URL rather than an ID because suppliers don't have their own collection or stable IDs. The name IS the identifier. URL-encode it: `/competitors/Tutors%20Green%20Ltd`.

Alternative: Create a `suppliers` collection that aggregates supplier identity — but that's a v2 concern. For v1, search by name is sufficient.

## MongoDB Index Requirements

### New Indexes Needed

1. **Contracts collection**: Index on `awardedSuppliers.name` for efficient search
   ```javascript
   db.contracts.createIndex({ "awardedSuppliers.name": 1 })
   ```

2. **Atlas Search Index** (if available on free tier): For fuzzy autocomplete
   ```json
   {
     "mappings": {
       "fields": {
         "awardedSuppliers": {
           "fields": {
             "name": {
               "type": "autocomplete",
               "analyzer": "lucene.standard"
             }
           },
           "type": "document"
         }
       }
     }
   }
   ```

3. **Spend transactions**: Already has index on `vendorNormalized` — no change needed

### Atlas Search Free Tier Limitation

Atlas free tier (M0) supports Atlas Search but with limitations:
- 3 search indexes max
- No custom analyzers on M0
- Basic autocomplete available

If Atlas Search is not available, fall back to:
- `$regex` with case-insensitive flag on indexed `awardedSuppliers.name`
- Pre-normalized supplier name field (add during data-sync)

## Build Order (Dependencies)

```
Phase 1: Foundation
  1. Supplier name normalization utility
  2. MongoDB indexes on awardedSuppliers.name
  3. Basic search API route (regex-based, Atlas Search if available)
  4. Search page UI with autocomplete

Phase 2: Profile & Data
  5. Competitor profile aggregation pipeline
  6. Profile page with overview stats
  7. Contract list tab
  8. Buyer relationships tab

Phase 3: Spend Integration
  9. Spend data aggregation for supplier
  10. Spend tab on profile page
  11. Cross-reference contracts vs spend

Phase 4: Intelligence
  12. Sculptor AI tool
  13. Sidebar navigation entry
  14. Breadcrumb integration
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| No `suppliers` collection in v1 | Supplier names are the identifier. Creating a separate collection requires identity resolution which is complex. Query by name instead. |
| Server components for data fetching | Profile data is server-side — no need for client-side fetching. Tab content can be server-rendered. |
| Name in URL, not ID | No stable supplier ID exists. URL-encoded name works. If we add a suppliers collection later, we can redirect. |
| Aggregation at query time, not pre-computed | Supplier profiles change as new contracts/spend data is ingested. Real-time aggregation ensures freshness. Cache if performance is an issue. |

---
*Researched: 2026-02-14*
