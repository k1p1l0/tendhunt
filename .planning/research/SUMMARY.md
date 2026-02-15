# Research Summary: Competitor Contract Intelligence

## Stack Recommendation

**No new dependencies needed.** This feature builds entirely on the existing TendHunt stack:
- MongoDB Atlas Search (or regex fallback) for supplier name search
- MongoDB aggregation pipelines for competitor profiles
- Next.js server components for data-heavy pages
- Existing UI components (shadcn/ui, Tailwind, recharts)

The only new infrastructure is a MongoDB index on `awardedSuppliers.name` and potentially an Atlas Search index for fuzzy autocomplete.

## Table Stakes Features

1. **Supplier Search** — Autocomplete search by company name with fuzzy matching
2. **Competitor Profile** — Aggregated overview (total contracts, value, top buyers, sectors)
3. **Contract List** — All awarded contracts for this supplier with filters
4. **Buyer Relationships** — Which buyers work with this supplier, ranked by value

## Key Differentiators

5. **Spend Intelligence** — Actual payment data from transparency CSVs (beyond just contract awards)
6. **Market Gaps** — Buyers the competitor works with that the user doesn't (v2)
7. **Sculptor AI** — Conversational competitor analysis via existing AI agent

## Critical Pitfalls to Address

1. **Name fragmentation** (CERTAIN): Same company appears under many names. Show all variants; don't auto-merge.
2. **Incomplete data** (HIGH): Not all contracts have award data. Supplement with spend transactions. Show data source indicators.
3. **Atlas Search limits** (MEDIUM): Free tier has 3 index max. Build with regex fallback.
4. **No identity resolution** (CERTAIN): Can't group subsidiaries without Companies House. Show "related suppliers" instead.

## Architecture Highlights

- **No new collection** in v1 — query by supplier name across existing collections
- **URL structure**: `/competitors` (search) and `/competitors/[encodedName]` (profile)
- **Server-side aggregation** with tab-based UI (overview, contracts, buyers, spend)
- **Build order**: Search -> Profile -> Spend -> AI integration

## Build Phases (Recommended)

| Phase | Focus | Complexity |
|-------|-------|------------|
| 1 | Search + indexing + name normalization | Medium |
| 2 | Profile page + contract/buyer tabs | Medium |
| 3 | Spend data integration | Medium |
| 4 | AI integration + navigation polish | Low |

---
*Synthesized: 2026-02-14*
