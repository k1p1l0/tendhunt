# Phase 11: Invoice & Spend Data Intelligence - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Ingest UK local authority transparency spending data (over £500 CSV reports) for buyers already in our database (~2,384). Identify SME-friendly buyers, show spend patterns on buyer profiles, and surface procurement opportunities from historical invoice data. Does NOT include a new scanner type — that's a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Data sourcing & ingestion
- Scope: Only ingest spend data for buyers already in the database (~2,384 existing buyers), not all UK councils
- Discovery method: AI-assisted agent crawl — for each buyer with a website, an agent identifies the transparency/spending page and extracts CSV download links. Similar approach to the board-minutes-intelligence project (`/Users/kirillkozak/Projects/board-minutes-intelligence`)
- Historical depth: Ingest everything available — grab all published CSV files regardless of date range
- CSV normalization: Claude's Discretion — Claude picks the best strategy for mapping varied column schemas to a unified format (AI column mapping, pattern library, or hybrid)

### Spend analysis & display
- Placement: New dedicated "Spending" tab on buyer profile (alongside Contracts, Contacts, Signals, Board Documents, Key Personnel, Attributes)
- Tab content includes ALL four views:
  1. **Top spend categories** — bar chart or ranked list of what the buyer spends most on (IT, facilities, consulting, etc.)
  2. **Spend over time** — line chart showing total monthly/quarterly spend trends
  3. **Top vendors list** — table of vendors this buyer pays most, with amounts (shows competition)
  4. **Spend breakdown table** — filterable/searchable table of individual transactions (date, vendor, amount, category)
- Filter approach: Similar to the Contracts Finder filter UI (filter chips/dropdowns) — filter by category, amount range, date range, vendor
- Charts: Interactive — hover tooltips, clickable segments that filter the table below, date range selection on timeline

### Opportunity surfacing
- All four opportunity types to be surfaced:
  1. **Recurring spend patterns** — detect repeating vendor/category combos (e.g., "£50k/year on IT support, paid quarterly")
  2. **Category match to user profile** — "This buyer spent £X in your sectors last year" with match percentage
  3. **Vendor concentration risk** — buyer relies on 1-2 vendors for 80% of category spend → diversification opportunity
  4. **Spend growth signals** — category spend growing YoY → buyer investing more, likely to tender
- Profile match placement: Hero section at top of Spending tab — big card with "This buyer spent £X in your sectors" as the first thing you see
- Computation: On-the-fly when user views the buyer profile — always fresh against current user profile
- Recurring spend: Show pattern only (e.g., "£50k/year on IT support, paid quarterly"), do NOT predict timing of next procurement
- Opportunity data also feeds into Vibe Scanner buyer scoring (existing scanner types)

### Claude's Discretion
- CSV column normalization strategy (AI mapping, pattern library, or hybrid)
- Specific chart library choice (recharts, nivo, etc.)
- Spend category taxonomy/normalization approach
- How to handle malformed or incomplete CSV data
- Exact visual design of opportunity cards

</decisions>

<specifics>
## Specific Ideas

- Agent-based CSV discovery approach should follow patterns from the board-minutes-intelligence project (`/Users/kirillkozak/Projects/board-minutes-intelligence`) — similar web crawling + extraction pipeline
- Filter UI on spend breakdown table should feel like the Contracts Finder search interface (filter chips for category, amount range, vendor, date range)
- The existing enrichment pipeline (workers/enrichment/) provides the architectural pattern — stages, rate limiting, cursor-based resume

</specifics>

<deferred>
## Deferred Ideas

- **New "Spend / Invoicing" scanner type** — A 4th scanner type in the Vibe Scanner (alongside RFPs, Board Meetings, Buyers) specifically for analyzing buyer spending patterns through AI-scored grid columns. This extends the scanner system and should be its own phase.
- **Predict procurement timing** — Using historical spend patterns to predict specific months when a buyer will procure in a category (e.g., "This buyer typically procures IT support in March"). Deferred in favor of showing patterns only.

</deferred>

---

*Phase: 11-invoice-spend-data-intelligence*
*Context gathered: 2026-02-12*
