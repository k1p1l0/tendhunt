# Competitor Contract Intelligence

## What This Is

A feature for TendHunt that lets users search for competitor companies by name and see all their public contracts — which buyers (schools, local authorities, NHS trusts) they work with, how much they're winning, and where gaps exist. It transforms publicly available UK procurement data into competitive intelligence, helping suppliers like tutoring companies discover where their competitors are selling and identify untapped opportunities.

## Core Value

Users can search any company name and instantly see every public contract they've won and every buyer that pays them — revealing the competitor's market footprint and the user's opportunities.

## Requirements

### Validated

- Awarded supplier names and IDs already extracted from OCDS data into `awardedSuppliers[]` on contracts
- Spend transaction data already tracks vendor names (`vendor`, `vendorNormalized`) per buyer
- Scanner grid system (Glide Data Grid) supports multiple entity types (rfps, meetings, buyers)
- Buyer pages already show contract lists and spend breakdowns

### Active

- [ ] User can search for a competitor company by name and get a profile of their contracts
- [ ] User can see which buyers a competitor works with (schools, LAs, NHS trusts)
- [ ] User can see the total contract value a competitor has won
- [ ] User can see spend data (transparency CSV data) for a competitor across all buyers
- [ ] User can compare their own coverage against a competitor's buyer footprint
- [ ] User can discover market opportunities — buyers the competitor works with that they don't

### Out of Scope

- Companies House integration / company registration lookup — not needed for v1, supplier names from OCDS are sufficient
- Real-time competitor monitoring / alerts — build search and display first, alerts later
- Multi-competitor comparison views — start with single competitor analysis
- Supplier financial health or credit scoring — out of domain for TendHunt
- Scraping competitor websites — only use publicly available procurement data

## Context

### Data Sources Already Available

1. **Contract awards** (`contracts` collection): `awardedSuppliers[].name` and `awardedSuppliers[].supplierId` on awarded contracts. This is the primary source — every contract in Contracts Finder and Find a Tender that has been awarded includes the winning supplier name.

2. **Spend transactions** (`spendtransactions` collection): `vendor` / `vendorNormalized` fields on individual spend line items. UK councils publish 25k+ and 500+ spending data as CSVs. TendHunt already ingests these. A search on vendor name reveals actual payments to a company.

3. **Spend summaries** (`spendsummaries` collection): Pre-aggregated `vendorBreakdown[]` per buyer with total spend and transaction count per vendor.

### Name Matching Challenge

Supplier names are inconsistent across data sources:
- "Tutors Green Ltd" vs "TUTORS GREEN LTD" vs "Tutors Green Limited"
- Same company may appear with different legal suffixes or abbreviations
- Need fuzzy/normalized matching — the `vendorNormalized` field on spend data already lowercases and trims, but contract `awardedSuppliers.name` is raw

### No Existing Index

Currently no index on `awardedSuppliers.name`. Need to add one for efficient search. Text search or regex on supplier names will be needed.

### Existing Architecture to Build On

- Scanner system: Could add a "competitors" scanner type, or build a standalone page
- Buyer pages: Already show contracts and spend — competitor view is the inverse (supplier-centric instead of buyer-centric)
- Sculptor AI agent: Could gain a `search_competitor` tool for conversational competitor analysis

## Constraints

- **Data completeness**: Only contracts that have been awarded and published include supplier names — open tenders don't have suppliers yet
- **Name normalization**: No universal company ID across contract awards and spend data — must rely on name matching heuristics
- **Existing stack**: Must use Next.js + MongoDB + Tailwind + shadcn/ui (existing TendHunt stack)
- **No new external APIs**: Use only data already in the database (contracts + spend), no Companies House API or similar
- **Performance**: Supplier name search across all contracts must be fast — need proper indexing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as dedicated page, not scanner type | Competitor analysis is supplier-centric (inverse of existing buyer-centric scanners). A `/competitors` page with search fits better than forcing it into the scanner grid paradigm | -- Pending |
| Use MongoDB text search + regex for supplier name matching | Already have `$text` search patterns in the codebase. Regex fallback handles partial matches. No need for external search engine | -- Pending |
| Normalize supplier names on query, not at ingest time | Avoid schema migrations. Build a query-time normalization function that strips Ltd/Limited/PLC etc. | -- Pending |
| Aggregate from both contracts and spend data | Contracts show formal awards (higher value, competitive tenders). Spend shows actual payments (including small purchases). Together they give the full picture | -- Pending |

---
*Last updated: 2026-02-14 after initialization*
