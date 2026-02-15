# Features Research: Competitor Contract Intelligence

## Market Context

The primary competitor in this space is **Tussell** (tussell.com), which charges enterprise pricing (thousands/year) for UK government contract intelligence including competitor tracking. They have:
- 390,000+ suppliers in their database
- Competitor Tracker product
- "Supplier Groups" that consolidate related entities
- Expiring contract alerts for sales pipeline

TendHunt can offer a focused, accessible version of competitor analysis using data already in the system.

## Feature Categories

### Table Stakes (Must Have or Users Leave)

These are the minimum features users expect when told they can "search a competitor":

1. **Supplier Search** — Search by company name and get results
   - Autocomplete/typeahead as they type
   - Handle name variations (Ltd vs Limited)
   - Show multiple matching suppliers if ambiguous
   - Complexity: Medium (needs Atlas Search index)

2. **Competitor Profile / Overview** — A summary page for a searched supplier
   - Total contracts won (count + value)
   - Total spend received across all buyers
   - Active vs expired contracts
   - Top buyers (who pays them most)
   - Sector breakdown
   - Complexity: Medium (MongoDB aggregation)

3. **Contract List** — Show all contracts awarded to this supplier
   - Contract title, buyer, value, dates, status
   - Filter by status (active/expired), sector, value range
   - Sort by date, value
   - Link to contract detail pages
   - Complexity: Low (query + list view)

4. **Buyer Relationships** — Which buyers work with this competitor
   - List of buyers with contract count and total value
   - Link to buyer pages (existing in TendHunt)
   - Show relationship duration (first contract to latest)
   - Complexity: Low-Medium (aggregation)

### Differentiators (Competitive Advantage)

These features would distinguish TendHunt from Tussell and basic contract search:

5. **Spend Intelligence Integration** — Show actual payment data beyond contract awards
   - Spend transactions to this supplier from transparency CSVs
   - Total actual payments vs contract award values
   - Which buyers are paying them in practice (not just on paper)
   - Complexity: Medium (cross-collection joins)
   - *Unique to TendHunt* — Tussell has spend data but charges extra for it

6. **Market Opportunity Gaps** — "Buyers your competitor works with that you don't"
   - Compare competitor's buyer list against user's own target list
   - Highlight buyers where competitor is incumbent but user has no presence
   - Show expiring contracts (upcoming recompete opportunities)
   - Complexity: Medium-High (requires knowing user's own buyer list)

7. **Competitor Comparison** — Side-by-side view of two suppliers
   - Shared buyers (both compete for same accounts)
   - Unique buyers (exclusive relationships)
   - Sector overlap
   - Value comparison
   - Complexity: Medium

8. **Expiring Contract Alerts** — Proactive notifications
   - Competitor's contracts expiring in next 3/6/12 months
   - Pre-built "approach these buyers" lists
   - Complexity: Medium (cron job + notification system)

9. **Sculptor AI Integration** — Conversational competitor analysis
   - `search_competitor` tool for the AI agent
   - "Tell me about [competitor]'s government contracts"
   - AI-generated competitive briefing
   - Complexity: Low (tool handler + prompt)

### Anti-Features (Deliberately NOT Build)

| Anti-Feature | Why NOT |
|-------------|---------|
| Supplier financial health/credit scoring | Out of domain — use Creditsafe/Dun & Bradstreet for that |
| Companies House deep integration | Adds API dependency, rate limits, and data that's not directly useful for contract intelligence |
| Social media monitoring of competitors | Not procurement data — different problem space |
| Bid document analysis | Document parsing is complex and separate from contract/spend data |
| Pricing intelligence / "what did they charge" | Contract values are often redacted or ranges — unreliable signal |
| Real-time competitor website scraping | Legal/ethical concerns, not public procurement data |

## Feature Dependencies

```
Search (1) → Profile (2) → Contract List (3) + Buyer Relationships (4)
                         → Spend Integration (5)
                         → Market Gaps (6) [needs user's own buyer list]
                         → Comparison (7) [needs two profiles]
                         → Expiring Alerts (8) [needs date tracking]

Sculptor Integration (9) can be built independently once Search exists
```

## Tussell Comparison

| Feature | Tussell | TendHunt (Proposed) |
|---------|---------|-------------------|
| Supplier search | Yes (390k suppliers) | Yes (from OCDS data) |
| Contract history | Yes | Yes |
| Spend data | Yes (paid add-on) | Yes (included, from transparency CSVs) |
| Supplier grouping | Yes (parent companies) | Partial (can normalize names) |
| Expiring alerts | Yes | v2 |
| Contact details | Yes (80k decision-makers) | Partial (from enrichment pipeline) |
| Competitor tracking lists | Yes | v2 |
| Pricing | Enterprise ($$$$) | Included in TendHunt subscription |

---
*Researched: 2026-02-14*
