# Pitfalls Research: Competitor Contract Intelligence

## Pitfall 1: Supplier Name Fragmentation (CRITICAL)

**The problem**: The same company appears under many names across contracts and spend data. "Capita PLC" might also be "Capita Business Services Ltd", "Capita Property Infrastructure", "Capita Managed IT Solutions", etc. These are all the same parent company but appear as separate suppliers.

**Warning signs**: Search returns too many partial matches. Users search "Capita" and get 50 different entries instead of one consolidated view.

**Prevention strategy**:
1. Build a normalization function that strips legal suffixes and common variations
2. For v1, show all name variants as separate results — let the user pick
3. For v2, consider a "Supplier Group" concept (like Tussell's) that links related entities
4. DO NOT try to auto-merge suppliers — false positives are worse than showing duplicates

**Phase impact**: Phase 1 (search) and Phase 2 (profile display)

## Pitfall 2: Incomplete Award Data

**The problem**: Not all contracts have `awardedSuppliers` populated. Many contracts are in OPEN or TENDER status (no award yet). Contracts Finder has better award data than Find a Tender for older contracts. Some awarded contracts have the supplier name in the `rawData` but not extracted into `awardedSuppliers`.

**Warning signs**: Competitor profile shows suspiciously few contracts for a major supplier.

**Prevention strategy**:
1. Query scope: Only search contracts with `status: "AWARDED"` and non-empty `awardedSuppliers`
2. Show data completeness indicator: "Based on X awarded contracts from Contracts Finder and Find a Tender"
3. Supplement with spend data — spend transactions have vendor names for actual payments
4. Consider a future enrichment stage that backfills missing supplier names from `rawData.awards`

**Phase impact**: Phase 1 (search) and Phase 2 (profile accuracy)

## Pitfall 3: Atlas Search on Free Tier

**The problem**: MongoDB Atlas M0 (free tier) supports Atlas Search but with restrictions:
- Maximum 3 search indexes
- No custom analyzers
- Limited to 512 MB storage for search indexes
- Performance may be slower than paid tiers

TendHunt might already be using search indexes for other features (contract text search).

**Warning signs**: "Search index creation failed" errors. Slow search responses (>2s).

**Prevention strategy**:
1. Check how many Atlas Search indexes are already in use
2. If at capacity, fall back to MongoDB `$regex` with a regular index
3. `$regex` with `^prefix` on an indexed field is still fast — it's just not fuzzy
4. Build the search API to support both Atlas Search and regex fallback
5. Consider upgrading to M2/M5 if search quality matters ($9-25/month)

**Phase impact**: Phase 1 (search implementation)

## Pitfall 4: Query Performance on Large Collections

**The problem**: Aggregation pipelines that scan all contracts matching a supplier name can be slow if the supplier has hundreds of contracts (think Capita, Serco, G4S). Cross-collection joins with spend data add latency.

**Warning signs**: Profile page takes >3s to load. Timeouts on Cloudflare Pages (30s limit on serverless functions).

**Prevention strategy**:
1. Add proper compound indexes: `{ "awardedSuppliers.name": 1, status: 1, publishedDate: -1 }`
2. Limit aggregation results (top 100 contracts, top 20 buyers)
3. Use `$facet` to run multiple aggregations in a single pipeline
4. Cache competitor profiles in memory or a `competitorProfiles` collection (TTL: 24h)
5. Paginate contract lists (don't load all at once)

**Phase impact**: Phase 2 (profile aggregation)

## Pitfall 5: URL Encoding of Supplier Names

**The problem**: Supplier names contain spaces, ampersands, apostrophes, and other special characters. URL encoding/decoding must be handled consistently. "Marks & Spencer" becomes `Marks%20%26%20Spencer`.

**Warning signs**: 404 errors on profile pages. Double-encoding issues. Browser URL bar looks ugly.

**Prevention strategy**:
1. Use `encodeURIComponent()` / `decodeURIComponent()` consistently
2. Use Next.js dynamic routes `[name]` which auto-decode
3. Consider slugifying for URL display while keeping original name for search
4. Test with edge cases: "O'Brien & Partners Ltd", "St. John's", "ABC (UK) Limited"

**Phase impact**: Phase 1 (routing)

## Pitfall 6: Spend Data vs Contract Data Mismatch

**The problem**: A supplier might appear in spend data but not in contract awards (below threshold for formal procurement), or in contracts but not spend data (contract awarded but no transparency data from that buyer). Users might be confused by discrepancies.

**Warning signs**: "But I know they have a contract with X council" — user sees gaps.

**Prevention strategy**:
1. Show contracts and spend as separate tabs with clear labeling
2. Explain data sources: "Contract awards from Contracts Finder/Find a Tender" vs "Payment data from council transparency reports"
3. Show a "Data Sources" section on the profile explaining coverage
4. Don't try to reconcile — just show both views

**Phase impact**: Phase 3 (spend integration)

## Pitfall 7: Confusing "Competitor" with "Any Supplier"

**The problem**: The feature is called "Competitor Analysis" but technically it searches any supplier. A user might search their own company name, a partner, or a random company. The UX shouldn't assume the searched entity is always a competitor.

**Warning signs**: UI copy says "Your competitor's contracts" when the user searched their own company.

**Prevention strategy**:
1. Use neutral language: "Supplier Profile" or "Company Contracts" instead of "Competitor"
2. The page title should be the company name, not "Competitor: [name]"
3. Navigation label can be "Competitors" (that's the use case) but page content should be neutral
4. This is actually a feature — users searching their own name validates data quality

**Phase impact**: Phase 2 (UI/UX copy)

## Pitfall 8: No Supplier Identity Resolution

**The problem**: Without Companies House integration, we can't reliably group subsidiaries. "Serco Group PLC", "Serco Ltd", and "Serco Leisure Operating Ltd" are all the same parent company. A user searching "Serco" might miss contracts under subsidiary names.

**Warning signs**: Major suppliers show surprisingly low contract counts.

**Prevention strategy**:
1. For v1: Return all matching names from search, not just exact matches
2. Show "Related suppliers" section if search returns similar names
3. Let users manually add to a "competitor watch list" that tracks multiple name variants
4. v2: Add Companies House API to resolve parent-subsidiary relationships
5. v2: Build a "Supplier Group" entity that links related names

**Phase impact**: Phase 1 (search results display)

## Summary: Risk Matrix

| Pitfall | Severity | Likelihood | Phase |
|---------|----------|------------|-------|
| Name fragmentation | HIGH | CERTAIN | 1-2 |
| Incomplete award data | MEDIUM | HIGH | 1-2 |
| Atlas Search limits | MEDIUM | MEDIUM | 1 |
| Query performance | MEDIUM | MEDIUM | 2 |
| URL encoding | LOW | MEDIUM | 1 |
| Spend/contract mismatch | LOW | HIGH | 3 |
| "Competitor" labeling | LOW | HIGH | 2 |
| No identity resolution | MEDIUM | CERTAIN | 1 |

---
*Researched: 2026-02-14*
