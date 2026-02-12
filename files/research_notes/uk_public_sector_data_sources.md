# UK Public Sector Buyer Organization Data Sources

Research for enriching 2,384 UK public sector buyer organizations with deep data.

---

## 1. Organization Metadata & Registry Sources

### 1.1 GOV.UK Organisations API
- **URL**: `https://www.gov.uk/api/organisations`
- **Single org**: `https://www.gov.uk/api/organisations/{slug}`
- **Alt query**: `https://www.gov.uk/api/search.json?filter_format=organisation`
- **Format**: JSON (paged endpoint)
- **Coverage**: 1,244 organisations (includes defunct ones)
- **Rate Limits**: No documented hard limit; standard GOV.UK API
- **Data Available**: Organisation name, slug, status (active/closed), parent org, type (ministerial dept, non-ministerial dept, executive agency, etc.), logo, URL
- **Coverage of our 2,384**: ~20-25% (central government bodies only; does not include councils or NHS trusts)
- **Docs**: https://docs.publishing.service.gov.uk/manual/organisations-api.html

### 1.2 NHS Organisation Data Service (ODS) - ORD API
- **URL**: `https://directory.spineservices.nhs.uk/ORD/2-0-0/`
- **FHIR API**: Also available via FHIR standard endpoint
- **Bulk Download**: ODS Data Search and Export (DSE) tool for CSV/Excel exports
- **Format**: JSON or XML (ORD standard DCB0090); CSV via DSE
- **Coverage**: All NHS trusts, CCGs (now ICBs), health authorities, GP practices -- ~250+ NHS trusts plus thousands of sites
- **Data Available**: ODS code (unique identifier), organisation name, address, postcode, status, successor org, relationships, role type
- **Rate Limits**: Standard NHS API authentication required
- **Updates**: DSE source data updates nightly (no longer monthly snapshots)
- **Coverage of our 2,384**: ~10-15% (NHS trusts and health bodies)
- **Key URLs**:
  - API catalogue: https://www.api.gov.uk/nd/organisation-data-service-ord-api/
  - DSE: https://www.odsdatasearchandexport.nhs.uk/
  - CSV downloads: https://digital.nhs.uk/services/organisation-data-service/data-search-and-export/csv-downloads

### 1.3 MHCLG Open Data Communities (Local Authorities)
- **URL**: `https://opendatacommunities.org/data/local-authorities`
- **Format**: Linked Data / SPARQL queryable; also CSV export
- **Coverage**: All 411 local authorities in England (unitary, district, London borough, metropolitan, county)
- **Data Available**: Authority type, geography codes, statistical identifiers, links to spending/performance data
- **Coverage of our 2,384**: ~17% (English councils)

### 1.4 Companies House API
- **URL**: `https://api.company-information.service.gov.uk/`
- **Format**: JSON REST API
- **Rate Limit**: 600 requests per 5-minute window (~120/min, ~2/sec). Can request increase.
- **Auth**: Free API key (register at Companies House developer hub)
- **Coverage**: Some public bodies are registered companies (NHS Foundation Trusts, some ALBs). Limited for councils/departments.
- **Data Available**: Company number, registered address, directors/officers, accounts filing, SIC codes, incorporation date
- **Coverage of our 2,384**: ~5-10% (mainly NHS Foundation Trusts and some executive agencies)
- **Docs**: https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference

### 1.5 Charity Commission API
- **URL**: `https://api.charitycommission.gov.uk/`
- **Register**: https://register-of-charities.charitycommission.gov.uk/
- **Format**: JSON REST API (beta)
- **Auth**: Free API key via developer portal
- **Coverage**: Some public bodies are registered charities (NHS charities, university trusts, ALBs)
- **Data Available**: Charity name, number, trustees, financial history, activities, annual returns
- **Coverage of our 2,384**: ~3-5% (limited overlap with public sector buyers)

### 1.6 Local Authority Revenue Expenditure Data (MHCLG/DLUHC)
- **URL**: https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing
- **Individual authority data**: https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-budget-individual-local-authority-data
- **Format**: CSV/Excel spreadsheets
- **Coverage**: 403 of 411 local authorities returned data for 2024-25
- **Data Available**: Net current expenditure by service area, capital expenditure, financing breakdown
- **Key Statistics**:
  - Total local authority net current expenditure: GBP 127.1 billion (2024-25 budget)
  - GBP 138.7 billion budgeted for 2025-26 (+6.3% real terms)
  - Education: GBP 41.7 billion; Adult Social Care: GBP 24.5 billion
- **Coverage of our 2,384**: ~17% (all English councils)

### 1.7 data.gov.uk
- **URL**: https://www.data.gov.uk/
- **API**: https://guidance.data.gov.uk/get_data/api_documentation/
- **Format**: Various (CSV, JSON, Excel, linked data)
- **Coverage**: Central government, local authorities, public bodies
- **Data Available**: Thousands of datasets including org budgets, staff counts, performance metrics
- **Single Data List**: https://www.gov.uk/government/publications/single-data-list (mandated datasets local govt must submit)

### 1.8 i-dot-ai Awesome Gov Datasets (GitHub)
- **URL**: https://github.com/i-dot-ai/awesome-gov-datasets
- **Format**: Curated index of UK government datasets
- **Use**: Discovery tool to find additional enrichment sources

---

## 2. Board Meeting Minutes & Committee Documents

### 2.1 Modern.gov (Council Committee Management System)
- **Used by**: 200+ UK local authorities
- **URL Pattern**: `https://{council-domain}/mgWebService.asmx` (SOAP/WSDL API)
- **Alternative URL patterns**:
  - `https://democracy.{council}.gov.uk/` (common subdomain pattern)
  - `https://modgov.{council}.gov.uk/`
  - `https://{council}.moderngov.co.uk/`
- **Format**: HTML pages for browsing; SOAP API for programmatic access; documents typically PDF or Word
- **API**: Undocumented but discoverable WSDL at `/mgWebService.asmx?WSDL`
- **Python library**: `moderngov` package on PyPI for scraping
- **Data Available**: Committee lists, meeting dates, agenda items, minutes (PDF/HTML), officer reports, decisions
- **Coverage of our 2,384**: ~8-10% (200+ councils out of ~411)
- **Scraping difficulty**: LOW -- most predictable URL structure of all council CMSes
- **Document formats**: PDF (majority), HTML, Word (.docx)

### 2.2 Non-Modern.gov Council Minutes
- **URL Patterns vary widely**:
  - `/{council}/council-and-democracy/meetings-and-minutes/`
  - `/councillors-and-democracy/meetings/`
  - `/your-council/how-the-council-works/meetings/`
- **Format**: HTML index pages linking to PDF documents
- **Coverage**: Remaining ~50% of councils not on Modern.gov
- **Scraping difficulty**: HIGH -- no standard URL pattern; requires per-site discovery
- **Legal requirement**: Local Government Act 1972 Section 100C requires public access to minutes

### 2.3 NHS Trust Board Papers
- **URL Patterns**:
  - `/{trust}/about-us/trust-board/board-papers/` (most common)
  - `/{trust}/about-us/publications/board-papers/`
  - `/{trust}/about-us/our-board/trust-board-meetings/`
- **Format**: PDF bundles (board packs); some HTML index pages
- **Frequency**: Monthly or bi-monthly board meetings
- **Coverage**: ~100% of NHS trusts publish board papers (regulatory requirement under Code of Governance)
- **Data Available**: Finance reports, performance dashboards, strategy papers, procurement approvals, staffing reports
- **Document formats**: PDF (95%+), occasionally Word
- **Coverage of our 2,384**: ~10-12% (NHS trusts and foundation trusts)

### 2.4 Central Government Meeting Records
- **URL**: `https://www.gov.uk/government/publications?publication_filter_option=minutes`
- **Format**: HTML or PDF via GOV.UK publishing platform
- **Coverage**: Variable -- not all departments publish meeting minutes publicly
- **NHS England meetings**: https://www.england.nhs.uk/publication-type/minutes/

---

## 3. Key Personnel & Contact Discovery

### 3.1 Open Council Data UK
- **URL**: http://www.opencouncildata.co.uk/
- **Format**: CSV downloads (Excel-compatible)
- **Coverage**: ALL UK councils (England, Wales, Scotland, Northern Ireland, including City of London and Isles of Scilly)
- **Data Available**: ~19,000 councillor seats -- names, parties, wards, emails, roles/portfolios
- **Update frequency**: Maintained after each election cycle (2,000-10,000 seats change annually)
- **Cost**: FREE
- **Coverage of our 2,384**: ~17% (all councils) for elected members

### 3.2 mySociety Data Services
- **TheyWorkForYou API**: https://www.theyworkforyou.com/api/
  - MPs, MLAs, MSPs, Lords -- speeches, voting records, contact details
  - Coverage: All UK parliamentarians
- **MapIt API**: Geographic boundary lookups (postcode to ward/constituency/council)
  - URL: https://mapit.mysociety.org/
- **WriteToThem**: Maps postcodes to all representatives (councillor to MP)
- **EveryPolitician**: CSV data on politicians globally, including UK
  - Source: https://data.mysociety.org/sources/everypolitician/

### 3.3 GOV.UK Senior Civil Service Disclosure
- **URL**: https://www.gov.uk/government/publications/disclosure-of-scs-posts-and-salary-information
- **Format**: CSV
- **Data Available**: Job title, salary band, reporting line for all Senior Civil Servants
- **Coverage**: All central government departments and their executive agencies
- **Coverage of our 2,384**: ~5-8% (central government only)

### 3.4 Electoral Commission API
- **URL**: https://api.electoralcommission.org.uk/
- **Format**: JSON API
- **Data Available**: Election results, candidate data, polling station locations
- **Coverage**: All UK elections
- **Partnership with**: Democracy Club for polling station data

### 3.5 Council Member Directories (Individual Websites)
- **URL patterns**:
  - `/{council}/councillors/` or `/your-councillors/`
  - `/{council}/council-and-democracy/councillors/`
- **Format**: HTML pages, often with photo, email, phone, party, ward, committee memberships
- **Coverage**: ~100% of councils have a councillor directory page
- **Scraping difficulty**: MEDIUM -- consistent within a council but varies between councils

### 3.6 NHS Trust Board Member Pages
- **URL patterns**:
  - `/{trust}/about-us/who-we-are/our-board/`
  - `/{trust}/about-us/the-trust-board/`
  - `/{trust}/about-us/meet-the-team/board-of-directors/`
- **Format**: HTML with photos, bios, roles
- **Data Available**: Executive and non-executive directors, chair, chief executive, medical director, finance director
- **Coverage**: ~100% of NHS trusts publish board member pages
- **Coverage of our 2,384**: ~10-12% (all NHS trusts)

### 3.7 Public Sector Salary Disclosure
- **Requirement**: Local Government Transparency Code 2015 requires publication of senior salaries above GBP 50,000
- **Format**: CSV/spreadsheet, published annually on council websites
- **Central govt**: All SCS posts with salary bands published on GOV.UK
- **NHS**: Annual reports must disclose board member remuneration (published in annual accounts)
- **Coverage**: ~80% compliance for English councils; 100% for central govt and NHS trusts

---

## 4. Procurement-Specific Data Sources

### 4.1 Find a Tender Service (FTS) -- PRIMARY SOURCE
- **URL**: https://www.find-tender.service.gov.uk/
- **API Docs**: https://www.find-tender.service.gov.uk/Developer/Documentation
- **Key Endpoints**:
  - `GET /api/1.0/ocdsReleasePackages` -- OCDS release packages
  - `GET /api/1.0/ocdsRecordPackages` -- OCDS record packages
- **Format**: OCDS JSON; also downloadable as Excel/CSV from data.gov.uk
- **Coverage**: All above-threshold UK public procurement from Jan 2021+
  - Threshold: GBP 139,688 (goods/services), GBP 5,372,609 (works)
  - From Feb 2025: ALL new procurements (above AND below threshold) must publish on FTS
- **Data Available**: Buyer org, contract title, value, CPV codes, award date, supplier, procedure type
- **Rate Limits**: Not heavily documented; standard API access
- **Coverage of our 2,384**: ~70-80% of active procuring bodies will have notices here

### 4.2 Contracts Finder (Legacy + Below Threshold)
- **URL**: https://www.contractsfinder.service.gov.uk/
- **API Docs**: https://www.contractsfinder.service.gov.uk/apidocumentation
- **Format**: OCDS JSON
- **Coverage**: Below-threshold contracts:
  - Central govt: GBP 12,000+ (inc VAT)
  - Sub-central (councils, NHS): GBP 30,000+ (inc VAT)
- **Status**: From Feb 2025, new procurements only require FTS publication. Contracts Finder remains for legacy data.
- **Historical data**: 2015-2025 contracts available
- **Coverage of our 2,384**: ~60-70% of active procuring bodies have historical notices

### 4.3 Spend Over GBP 500 (Local Authority Transparency Code)
- **Legal Basis**: Local Government Transparency Code 2015
- **Publication Frequency**: Quarterly (minimum), some monthly
- **Format**: CSV or Excel (mandated machine-readable format)
- **URL Pattern on council websites**:
  - `/{council}/transparency/spending/` or
  - `/{council}/council-data/transparency-code/` or
  - `/{council}/open-data/expenditure/`
- **Data Fields Required**: Date, department, beneficiary, summary, amount, transaction number, merchant category
- **Central govt equivalent**: https://www.gov.uk/government/publications/transparency-spend-over-500-for-financial-year-2025-26
- **Key Statistics**:
  - Covers ALL English local authorities (411 councils)
  - Over GBP 500 per transaction
  - Enhanced: Some publish GBP 250+ threshold voluntarily
- **Coverage of our 2,384**: ~17% (all English councils -- mandatory); central govt depts also publish
- **Data Quality**: Varies significantly -- ONS Data Science Campus found 16% of links in Local Links Manager CSV are broken (404/500/410 errors)

### 4.4 Contract Registers
- **Legal Basis**: Transparency Code 2015 requires publication of all contracts over GBP 5,000
- **Format**: CSV/Excel (mandated), sometimes HTML tables
- **URL Pattern**: `/{council}/transparency/contracts/` or `/{council}/open-data/contracts/`
- **Data Available**: Contract title, supplier, value, start/end dates, department, procurement method
- **Coverage of our 2,384**: ~17% (English councils); NHS trusts publish variably
- **Separate from**: FTS/Contracts Finder (which are tender notices, not contract registers)

### 4.5 Prompt Payment Statistics
- **Central govt**: https://www.data.gov.uk/dataset/5e342efc-b0c3-4795-b2ab-441a178c8a3e/prompt-payment-performance
- **Requirement (PPN 03/16)**: Annual publication of payment performance for central govt
- **Procurement Act 2023 change**: From Oct 2025, Payments Compliance Notices required every 6 months
  - Spot checks on contracts over GBP 5m/year
  - Results published online
- **Data Available**: % invoices paid within 30 days, interest paid for late payment, average payment days
- **Format**: Typically published as part of annual reports (PDF) or as standalone CSV/webpage
- **Coverage of our 2,384**: ~50-60% (all central govt depts mandatory; councils publish variably)

### 4.6 SME Spend Data
- **Key Statistics**:
  - Only 20% of direct public sector procurement spend with SMEs in 2024 (~same as 2023 at 19%)
  - GBP 45.4 billion spent by Government directly with SMEs in 2024 (up from GBP 42.4 billion in 2023)
  - Local government: highest share at 35% (GBP 28.1 billion)
  - Department for Education: highest absolute central govt spend with SMEs at GBP 2.4 billion (26%)
  - Share of SME spend flat at ~20% for past 6 years
- **Policy**: PPN 001 (Feb 2025) requires authorities to set 3-year SME spending targets; publish results annually
- **Data Source**: Tussell SME Procurement Tracker (commercial) + individual dept annual reports
- **Format**: PDF annual reports; Tussell provides structured data (paid)
- **Coverage of our 2,384**: Limited -- mainly central govt depts; councils report via transparency code

### 4.7 Procurement Strategy Documents
- **Where found**: Typically published on council/trust websites
- **URL patterns**: `/{org}/procurement-strategy/` or `/{org}/business/selling-to-the-council/procurement-strategy/`
- **Format**: PDF (85%+)
- **Coverage**: ~60-70% of councils and NHS trusts publish a procurement strategy
- **Data Available**: Annual spend totals, category breakdowns, sustainability goals, SME targets, social value policy

---

## 5. Overall UK Public Procurement Market Statistics

| Metric | Value | Year | Source |
|--------|-------|------|--------|
| Gross UK public procurement spending | GBP 434 billion | 2024-25 | GOV.UK Public Spending Statistics |
| YoY increase | +GBP 19 billion (+5%) | 2024-25 vs 2023-24 | GOV.UK |
| Gross current procurement | GBP 170.9 billion | 2024-25 | GOV.UK |
| Procurement as % of public spending | ~33% (one-third) | 2024-25 | House of Commons Library |
| Total public expenditure (TME) | GBP 1,335 billion | 2025-26 forecast | GOV.UK |
| TME as % of GDP | 44.4% | 2024-25 | GOV.UK |
| Local authority net current expenditure | GBP 127.1 billion | 2024-25 budget | MHCLG |
| Local authority net current expenditure | GBP 138.7 billion | 2025-26 budget | MHCLG |
| Number of English local authorities | 411 | 2024-25 | MHCLG |
| Authorities returning expenditure data | 403 of 411 (98%) | 2024-25 | MHCLG |
| SME direct procurement spend | GBP 45.4 billion (20%) | 2024 | Tussell/Cabinet Office |
| Local govt SME spend share | 35% (GBP 28.1 billion) | 2024 | Tussell |
| National Data Library investment | GBP 100 million+ (of GBP 1.9 billion DSIT total) | 2025-26 | GOV.UK |

---

## 6. Web Presence & Social Media

### 6.1 Council Website Structures
- **Typical pages**:
  - `/about-the-council/` or `/your-council/`
  - `/councillors-and-democracy/`
  - `/business/procurement/` or `/business/tenders/`
  - `/transparency/` or `/open-data/`
  - `/news/` or `/press-releases/`
  - `/contact-us/`
- **CMS platforms**: Many use Jadu, Drupal, WordPress, or custom platforms
- **GOV.UK Local Links Manager**: CSV with links to services for all local authorities
  - URL: https://www.data.gov.uk/dataset/a0abdb2c-f210-4f07-bb36-9ff553bf4a23/local-authority-services
  - Note: ~16% of links are broken (404/500/410)

### 6.2 LinkedIn
- **Access**: Requires authentication for most data; no free API for company pages
- **Coverage**: ~90%+ of public sector bodies have LinkedIn pages
- **Data Available**: Employee count (approximate), description, location, follower count
- **Scraping**: Against LinkedIn ToS; would need to use official Marketing API (paid, restricted)
- **Alternative**: Manual lookup or use commercial data providers (e.g., Apollo, Clearbit)

### 6.3 Social Media
- **Twitter/X**: Most councils and NHS trusts have accounts; no free bulk API since 2023
- **Coverage**: ~85-90% of councils have active Twitter/X accounts
- **Press releases**: Published on org websites, typically at `/news/` or `/latest-news/`

---

## 7. FOI Disclosure Logs

### 7.1 WhatDoTheyKnow (Aggregated FOI Platform)
- **URL**: https://www.whatdotheyknow.com/
- **API**: Atom/XML feeds available on most pages; URL-based query parameters
- **API Docs**: https://www.whatdotheyknow.com/help/api
- **Coverage**: 46,000+ public bodies listed; 42,000+ subject to FOI/EIR
- **Data**: 1 million+ FOI requests and responses (permanent, searchable archive)
- **Format**: HTML pages with Atom feed support for programmatic access
- **Use for enrichment**: Can query by public body to find all FOI requests/responses; reveals org structure, spending details, contract information disclosed via FOI
- **Coverage of our 2,384**: ~95%+ (virtually all public sector bodies are listed)

### 7.2 Individual Disclosure Logs
- **GOV.UK**: https://www.gov.uk/government/collections/disclosure-log (from Jan 2024+)
- **Historical**: National Archives for pre-2024
- **Council disclosure logs**: Published on individual council websites (variable quality)
- **Format**: HTML lists, sometimes PDF
- **Coverage**: Variable -- best practice not mandatory requirement

---

## 8. Commercial Data Providers (For Reference)

### 8.1 Tussell
- **URL**: https://www.tussell.com/
- **API**: S3-based data feed (daily updates, no download limits)
- **Coverage**: 80,000+ key decision-maker contacts across public sector
- **Data**: Contracts, spend, frameworks, buyer/supplier data
- **Cost**: Commercial (subscription-based)
- **Portal tracking**: Identifies 8 key portals to track for public sector tenders

### 8.2 Oscar Research
- **URL**: https://www.oscar-research.co.uk/datasheets/localgovernment
- **Coverage**: Local government database
- **Data**: Council contacts, decision-makers, committee memberships
- **Cost**: Commercial

---

## 9. Recommended Enrichment Priority Matrix

| Data Source | Format | Coverage (of 2,384) | Effort | Value |
|-------------|--------|---------------------|--------|-------|
| Find a Tender API (FTS) | JSON (OCDS) | ~70-80% | LOW | CRITICAL |
| Contracts Finder API | JSON (OCDS) | ~60-70% | LOW | HIGH |
| GOV.UK Organisations API | JSON | ~20-25% | LOW | HIGH |
| NHS ODS ORD API | JSON/XML/CSV | ~10-15% | LOW | HIGH |
| MHCLG Local Authority Expenditure | CSV | ~17% | LOW | HIGH |
| Open Council Data UK | CSV | ~17% (councils) | LOW | HIGH |
| Spend Over GBP 500 (Transparency Code) | CSV | ~17% (councils) | MEDIUM | HIGH |
| Modern.gov Minutes API | SOAP/HTML | ~8-10% | MEDIUM | MEDIUM |
| NHS Trust Board Papers | PDF | ~10-12% | HIGH | MEDIUM |
| Companies House API | JSON | ~5-10% | LOW | MEDIUM |
| WhatDoTheyKnow | HTML/Atom | ~95% | MEDIUM | MEDIUM |
| Prompt Payment Stats | CSV/PDF | ~50-60% | MEDIUM | MEDIUM |
| mySociety / TheyWorkForYou | JSON/CSV | ~5% (parliament) | LOW | LOW-MED |
| Council Websites (scraping) | HTML | ~17% | HIGH | MEDIUM |
| NHS Board Member Pages | HTML | ~10-12% | MEDIUM | MEDIUM |
| Senior Salary Disclosure | CSV | ~20-25% | MEDIUM | LOW-MED |
| LinkedIn | No free API | ~90% | BLOCKED | HIGH |

---

## 10. Key Technical Implementation Notes

### API Authentication Summary
| API | Auth Method | Cost | Registration |
|-----|------------|------|-------------|
| GOV.UK Organisations | None (open) | Free | None needed |
| Find a Tender | None (open) | Free | None needed |
| Contracts Finder | None (open) | Free | None needed |
| Companies House | API key (HTTP Basic) | Free | https://developer.company-information.service.gov.uk/ |
| NHS ODS (ORD) | API key | Free | NHS developer portal |
| Charity Commission | API key | Free | https://api-portal.charitycommission.gov.uk/ |
| TheyWorkForYou | API key | Free | https://www.theyworkforyou.com/api/ |
| data.gov.uk CKAN | None (open) | Free | None needed |

### Rate Limits Summary
| API | Limit | Reset |
|-----|-------|-------|
| Companies House | 600 requests / 5 min (~2/sec) | 5-minute window |
| GOV.UK APIs | No hard documented limit | Standard web |
| Find a Tender | Not heavily documented | Standard web |
| NHS ODS | Standard API limits | Per-key |

### Data Freshness
| Source | Update Frequency |
|--------|-----------------|
| NHS ODS (DSE) | Nightly |
| Find a Tender | Real-time (as notices published) |
| Contracts Finder | Real-time |
| GOV.UK Organisations | As organisations change |
| Spend Over GBP 500 | Quarterly (some monthly) |
| Local Authority Expenditure (MHCLG) | Annual |
| Open Council Data | Post-election updates |
| Prompt Payment | Annual or semi-annual (from Oct 2025) |

---

## Sources

- GOV.UK Organisations API: https://docs.publishing.service.gov.uk/manual/organisations-api.html
- GOV.UK API Catalogue: https://www.api.gov.uk/
- NHS ODS: https://digital.nhs.uk/services/organisation-data-service
- NHS ODS ORD API: https://www.api.gov.uk/nd/organisation-data-service-ord-api/
- Companies House API: https://developer.company-information.service.gov.uk/
- Charity Commission API: https://api-portal.charitycommission.gov.uk/
- Find a Tender API: https://www.find-tender.service.gov.uk/Developer/Documentation
- Contracts Finder API: https://www.contractsfinder.service.gov.uk/apidocumentation
- Local Government Transparency Code 2015: https://www.gov.uk/government/publications/local-government-transparency-code-2015
- Central Government Transparency: https://www.gov.uk/government/collections/how-to-publish-central-government-transparency-data
- MHCLG LA Revenue Expenditure: https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing
- Open Council Data UK: http://www.opencouncildata.co.uk/
- mySociety Data: https://data.mysociety.org/
- TheyWorkForYou API: https://www.theyworkforyou.com/api/
- WhatDoTheyKnow: https://www.whatdotheyknow.com/help/api
- Prompt Payment Data: https://www.data.gov.uk/dataset/5e342efc-b0c3-4795-b2ab-441a178c8a3e/prompt-payment-performance
- PPN 03/16 Payment Statistics: https://www.gov.uk/government/publications/procurement-policy-note-0316-publication-of-payment-performance-statistics
- SME Procurement Tracker 2025: https://www.tussell.com/gov/blog/sme-procurement-tracker-2025
- Procurement Statistics Short Guide: https://commonslibrary.parliament.uk/research-briefings/cbp-9317/
- Public Spending Statistics: https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2025
- Modern.gov PyPI: https://pypi.org/project/moderngov/
- Open Data Communities: https://opendatacommunities.org/data/local-authorities
- data.gov.uk: https://www.data.gov.uk/
- i-dot-ai Awesome Gov Datasets: https://github.com/i-dot-ai/awesome-gov-datasets
- GOV.UK Disclosure Log: https://www.gov.uk/government/collections/disclosure-log
- SCS Pay Disclosure: https://www.gov.uk/government/publications/disclosure-of-scs-posts-and-salary-information
- LA Services Links: https://www.data.gov.uk/dataset/a0abdb2c-f210-4f07-bb36-9ff553bf4a23/local-authority-services
- NHS Code of Governance: https://www.england.nhs.uk/long-read/code-of-governance-for-nhs-provider-trusts/
- Local Government Act 1972 s100C: https://www.legislation.gov.uk/ukpga/1972/70/section/100C
- PPN 001 SME Targets: https://www.tussell.com/gov/blog/ppn001-sme-and-vcse-spending-targets
- Tussell: https://www.tussell.com/
- Oscar Research: https://www.oscar-research.co.uk/datasheets/localgovernment
