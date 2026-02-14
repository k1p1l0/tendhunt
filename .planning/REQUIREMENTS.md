# Requirements: Competitor Contract Intelligence

**Defined:** 2026-02-14
**Core Value:** Users can search any company name and instantly see every public contract they've won and every buyer that pays them — revealing market footprint and opportunities. Users can watch competitors and get alerted when they win new contracts or expand into new regions/sectors.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Search

- [x] **SRCH-01**: User can search for a supplier/competitor by company name via a search bar with autocomplete suggestions
- [x] **SRCH-02**: Search handles name variations (Ltd vs Limited, case insensitive, extra whitespace)
- [x] **SRCH-03**: Search results show supplier name, contract count, and total value as preview
- [x] **SRCH-04**: User can click a search result to navigate to the competitor profile page

### Profile

- [x] **PROF-01**: Competitor profile page shows company name as header with key stats (total contracts, total value, active contracts, buyer count)
- [x] **PROF-02**: Profile shows sector breakdown of contracts (which sectors they operate in)
- [x] **PROF-03**: Profile shows geographic breakdown (which regions their buyers are in)
- [x] **PROF-04**: Profile shows timeline of contract activity (contracts won over time)

### Contracts

- [x] **CONT-01**: Contracts tab shows all awarded contracts for this supplier in a table (title, buyer, value, dates, status)
- [x] **CONT-02**: Contract list is paginated (server-side)
- [x] **CONT-03**: User can sort contracts by value, date, or buyer name
- [x] **CONT-04**: Each contract row links to the existing contract detail page

### Buyers

- [x] **BUYR-01**: Buyers tab shows all buyers this supplier has contracts with, grouped with contract count and total value
- [x] **BUYR-02**: Buyer list is sorted by total value (highest first)
- [x] **BUYR-03**: Each buyer links to the existing buyer detail page
- [x] **BUYR-04**: Buyer entries show sector, region, and relationship duration (first to latest contract)

### Spend

- [x] **SPND-01**: Spend tab shows payment data from transparency CSVs for this supplier across all buyers
- [x] **SPND-02**: Spend view shows total spend amount and transaction count
- [x] **SPND-03**: Spend view shows breakdown by buyer (which buyers actually pay this supplier)
- [x] **SPND-04**: Spend data is clearly labeled as separate from contract award data

### Data Layer

- [x] **DATA-01**: MongoDB index on `awardedSuppliers.name` for efficient supplier search
- [x] **DATA-02**: Supplier name normalization utility that strips legal suffixes (Ltd, Limited, PLC, LLP, CIC) and normalizes whitespace/case
- [x] **DATA-03**: Search API route that queries both contracts and spend data for matching supplier names
- [x] **DATA-04**: Aggregation pipeline that builds a complete competitor profile from contract + spend data

### Navigation

- [x] **NAV-01**: "Competitors" entry in the sidebar navigation with appropriate icon
- [x] **NAV-02**: Breadcrumb integration following existing TendHunt patterns (list page: "Competitors", detail: "Competitors > [Name]")
- [x] **NAV-03**: Page animations following TendHunt's motion patterns (enter/exit transitions, tab switches)

### AI Integration

- [x] **AI-01**: Sculptor agent has a `search_competitor` tool that searches for supplier contracts
- [x] **AI-02**: AI can answer questions like "show me contracts for [company name]" with formatted results
- [x] **AI-03**: AI responses include entity links to competitor profile pages

### Competitor Monitoring

- [ ] **WATCH-01**: User can save competitors to a watchlist from the profile page
- [ ] **WATCH-02**: Background job detects new contract awards matching watched suppliers (piggybacks on existing data-sync worker)
- [ ] **WATCH-03**: In-app notification when a watched competitor wins a new contract
- [ ] **WATCH-04**: Competitor activity feed on dashboard showing recent wins by watched competitors
- [ ] **WATCH-05**: Change detection — alert when competitor enters a new region or sector
- [ ] **WATCH-06**: Email digest (optional) summarizing watched competitor activity

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Intelligence

- **ADV-01**: Market gap analysis — compare competitor's buyer list against user's own targets
- **ADV-02**: Expiring contract alerts — notify when competitor contracts are nearing end date
- **ADV-03**: Competitor watch list — save multiple competitors for ongoing monitoring
- **ADV-04**: Competitor comparison — side-by-side view of two suppliers

### Data Enhancement

- **ENH-01**: Companies House integration for subsidiary grouping
- **ENH-02**: Supplier Group entity linking related company names
- **ENH-03**: Pre-computed supplier profiles (materialized view for performance)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Companies House API integration | Adds external dependency and complexity for v1 — name search is sufficient |
| Supplier financial health / credit scoring | Different domain — not procurement intelligence |
| Auto-merging of supplier name variants | High false positive risk — show all variants, let user choose |
| Real-time competitor monitoring | Build search/display first, monitoring later |
| Multi-competitor comparison view | Requires watch list and comparison logic — defer to v2 |
| Competitor website scraping | Legal/ethical concerns, not public procurement data |
| Bid document analysis | Separate complex feature, not related to supplier search |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRCH-01 | Phase 1 | Done |
| SRCH-02 | Phase 1 | Done |
| SRCH-03 | Phase 1 | Done |
| SRCH-04 | Phase 1 | Done |
| DATA-01 | Phase 1 | Done |
| DATA-02 | Phase 1 | Done |
| DATA-03 | Phase 1 | Done |
| DATA-04 | Phase 2 | Done |
| PROF-01 | Phase 2 | Done |
| PROF-02 | Phase 2 | Done |
| PROF-03 | Phase 2 | Done |
| PROF-04 | Phase 2 | Done |
| CONT-01 | Phase 2 | Done |
| CONT-02 | Phase 2 | Done |
| CONT-03 | Phase 2 | Done |
| CONT-04 | Phase 2 | Done |
| BUYR-01 | Phase 2 | Done |
| BUYR-02 | Phase 2 | Done |
| BUYR-03 | Phase 2 | Done |
| BUYR-04 | Phase 2 | Done |
| SPND-01 | Phase 3 | Done |
| SPND-02 | Phase 3 | Done |
| SPND-03 | Phase 3 | Done |
| SPND-04 | Phase 3 | Done |
| NAV-01 | Phase 4 | Done |
| NAV-02 | Phase 4 | Done |
| NAV-03 | Phase 4 | Done |
| AI-01 | Phase 4 | Done |
| AI-02 | Phase 4 | Done |
| AI-03 | Phase 4 | Done |
| WATCH-01 | Phase 5 | Pending |
| WATCH-02 | Phase 5 | Pending |
| WATCH-03 | Phase 5 | Pending |
| WATCH-04 | Phase 5 | Pending |
| WATCH-05 | Phase 5 | Pending |
| WATCH-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after Phase 5 planning*
