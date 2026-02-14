# Requirements: Competitor Contract Intelligence

**Defined:** 2026-02-14
**Core Value:** Users can search any company name and instantly see every public contract they've won and every buyer that pays them — revealing market footprint and opportunities.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Search

- [ ] **SRCH-01**: User can search for a supplier/competitor by company name via a search bar with autocomplete suggestions
- [ ] **SRCH-02**: Search handles name variations (Ltd vs Limited, case insensitive, extra whitespace)
- [ ] **SRCH-03**: Search results show supplier name, contract count, and total value as preview
- [ ] **SRCH-04**: User can click a search result to navigate to the competitor profile page

### Profile

- [ ] **PROF-01**: Competitor profile page shows company name as header with key stats (total contracts, total value, active contracts, buyer count)
- [ ] **PROF-02**: Profile shows sector breakdown of contracts (which sectors they operate in)
- [ ] **PROF-03**: Profile shows geographic breakdown (which regions their buyers are in)
- [ ] **PROF-04**: Profile shows timeline of contract activity (contracts won over time)

### Contracts

- [ ] **CONT-01**: Contracts tab shows all awarded contracts for this supplier in a table (title, buyer, value, dates, status)
- [ ] **CONT-02**: Contract list is paginated (server-side)
- [ ] **CONT-03**: User can sort contracts by value, date, or buyer name
- [ ] **CONT-04**: Each contract row links to the existing contract detail page

### Buyers

- [ ] **BUYR-01**: Buyers tab shows all buyers this supplier has contracts with, grouped with contract count and total value
- [ ] **BUYR-02**: Buyer list is sorted by total value (highest first)
- [ ] **BUYR-03**: Each buyer links to the existing buyer detail page
- [ ] **BUYR-04**: Buyer entries show sector, region, and relationship duration (first to latest contract)

### Spend

- [ ] **SPND-01**: Spend tab shows payment data from transparency CSVs for this supplier across all buyers
- [ ] **SPND-02**: Spend view shows total spend amount and transaction count
- [ ] **SPND-03**: Spend view shows breakdown by buyer (which buyers actually pay this supplier)
- [ ] **SPND-04**: Spend data is clearly labeled as separate from contract award data

### Data Layer

- [ ] **DATA-01**: MongoDB index on `awardedSuppliers.name` for efficient supplier search
- [ ] **DATA-02**: Supplier name normalization utility that strips legal suffixes (Ltd, Limited, PLC, LLP, CIC) and normalizes whitespace/case
- [ ] **DATA-03**: Search API route that queries both contracts and spend data for matching supplier names
- [ ] **DATA-04**: Aggregation pipeline that builds a complete competitor profile from contract + spend data

### Navigation

- [ ] **NAV-01**: "Competitors" entry in the sidebar navigation with appropriate icon
- [ ] **NAV-02**: Breadcrumb integration following existing TendHunt patterns (list page: "Competitors", detail: "Competitors > [Name]")
- [ ] **NAV-03**: Page animations following TendHunt's motion patterns (enter/exit transitions, tab switches)

### AI Integration

- [ ] **AI-01**: Sculptor agent has a `search_competitor` tool that searches for supplier contracts
- [ ] **AI-02**: AI can answer questions like "show me contracts for [company name]" with formatted results
- [ ] **AI-03**: AI responses include entity links to competitor profile pages

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
| SRCH-01 | Phase 1 | Pending |
| SRCH-02 | Phase 1 | Pending |
| SRCH-03 | Phase 1 | Pending |
| SRCH-04 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| BUYR-01 | Phase 2 | Pending |
| BUYR-02 | Phase 2 | Pending |
| BUYR-03 | Phase 2 | Pending |
| BUYR-04 | Phase 2 | Pending |
| SPND-01 | Phase 3 | Pending |
| SPND-02 | Phase 3 | Pending |
| SPND-03 | Phase 3 | Pending |
| SPND-04 | Phase 3 | Pending |
| NAV-01 | Phase 4 | Pending |
| NAV-02 | Phase 4 | Pending |
| NAV-03 | Phase 4 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after initial definition*
