# Ofsted Inspection Data: Programmatic Access & Statistics

## Executive Summary

Ofsted does **NOT** have a public REST/JSON API. Data access is via bulk CSV/ODS/XLSX downloads from GOV.UK. The primary dataset covers ~22,000 state-funded schools with 50+ fields including URN, ratings, inspection dates, and school metadata. Monthly updates are published. As of September 2024, the "overall effectiveness" single-word grade has been removed for state-funded schools -- replaced by 4 key judgement areas (and from November 2025, a new 11-area "report card" system).

---

## 1. Data Sources & Access Methods

### 1.1 Primary Dataset: Monthly Management Information (BEST FOR PROGRAMMATIC USE)

| Attribute | Detail |
|-----------|--------|
| **URL** | https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes |
| **Data.gov.uk** | https://www.data.gov.uk/dataset/06a19224-ec69-4065-acd9-63b5d9fd97b1/state-funded-school-inspections-and-outcomes-management-information |
| **Formats** | CSV (16.2 MB), XLSX (11.1 MB), ODS (12.4 MB) |
| **Update frequency** | Monthly |
| **Coverage** | All state-funded schools in England (~22,000) |
| **License** | Open Government Licence (OGL) |
| **Authentication** | None required -- public download |
| **Rate limits** | N/A (static file downloads) |

### 1.2 Official Statistics: Inspections & Outcomes

| Attribute | Detail |
|-----------|--------|
| **URL** | https://www.gov.uk/government/collections/maintained-schools-and-academies-inspections-and-outcomes-official-statistics |
| **Latest** | As at 31 December 2024 (published Feb 2025) |
| **Formats** | CSV, ODS |
| **Scope** | Point-in-time snapshot of all school ratings |

### 1.3 Five-Year Ofsted Inspection Data

| Attribute | Detail |
|-----------|--------|
| **URL** | https://www.gov.uk/government/publications/five-year-ofsted-inspection-data |
| **Format** | ODS (OpenDocument Spreadsheet) |
| **Scope** | 5-year rolling window of all inspection outcomes |
| **Covers** | State-funded schools, early years, FE/skills, independent schools, children's social care, ITE |
| **Note** | Currently paused for update to reflect removal of overall effectiveness grades |

### 1.4 GIAS (Get Information About Schools) -- School Metadata

| Attribute | Detail |
|-----------|--------|
| **URL** | https://get-information-schools.service.gov.uk/ |
| **API** | SOAP-based API (requires application via EDD service request) |
| **Public downloads** | Bulk CSV downloads available without authentication |
| **Key fields** | URN, school name, address, establishment type, open/close dates, academy trust, local authority |
| **IMPORTANT** | Ofsted rating fields were **REMOVED from GIAS in January 2025** |
| **URN** | 6-digit Unique Reference Number -- the primary key linking GIAS to Ofsted data |

### 1.5 Ofsted Reports Website (reports.ofsted.gov.uk)

| Attribute | Detail |
|-----------|--------|
| **URL** | https://reports.ofsted.gov.uk/ |
| **API** | **No official API available** |
| **Access** | Web search by URN, school name, or location |
| **Report format** | PDF (full inspection reports) |
| **Scraping** | Third-party scrapers exist on GitHub (e.g., jdkram/ofsted-report-scraper, data-to-insight/ofsted-ilacs-scrape-tool) |
| **Contact** | DataDevelopment@ofsted.gov.uk for data enquiries |

### 1.6 DfE API Portal

| Attribute | Detail |
|-----------|--------|
| **URL** | https://find-and-use-an-api.education.gov.uk/ |
| **Available APIs** | Only FMS Submission API currently listed |
| **Note** | No school inspection/rating API available from DfE |

### 1.7 Ofsted Data View (Interactive Tableau Tool)

| Attribute | Detail |
|-----------|--------|
| **URL** | https://www.gov.uk/government/publications/exploring-ofsted-inspection-data-with-data-view |
| **Format** | Tableau visualization with "Get the data" download |
| **Last updated** | 7 April 2022 -- may be deprecated |
| **Contact** | data.view@ofsted.gov.uk |

---

## 2. CSV Schema: Available Fields

### 2.1 Management Information CSV (Monthly) -- 50+ Columns

**School Identification:**
| # | Column Name | Description |
|---|-------------|-------------|
| 1 | Web link | URL to Ofsted report |
| 2 | URN | 6-digit Unique Reference Number |
| 3 | LAESTAB | Local Authority + Establishment Number |
| 4 | School name | Full school name |
| 5 | Ofsted phase | Primary, Secondary, Special, etc. |
| 6 | Type of education | Academy, community, voluntary aided, etc. |
| 7 | School open date | Date school opened |

**School Metadata:**
| # | Column Name | Description |
|---|-------------|-------------|
| 8 | Admissions policy | Selective, non-selective, etc. |
| 9 | Sixth form | Yes/No |
| 10 | Designated religious character | CofE, Catholic, etc. |
| 11 | Religious ethos | Denomination detail |
| 12 | Faith grouping | Broader faith category |

**Geographic:**
| # | Column Name | Description |
|---|-------------|-------------|
| 13 | Ofsted region | Ofsted regional grouping |
| 14 | Region | Government office region |
| 15 | Local authority | LA name |
| 16 | Parliamentary constituency | Constituency name |
| 21 | Postcode | School postcode |

**Academy/Trust:**
| # | Column Name | Description |
|---|-------------|-------------|
| 17 | Multi-academy trust UID | MAT unique ID |
| 18 | Multi-academy trust name | MAT name |
| 19 | Academy sponsor UID | Sponsor unique ID |
| 20 | Academy sponsor name | Sponsor name |

**Demographics:**
| # | Column Name | Description |
|---|-------------|-------------|
| 22 | IDACI quintile | Income Deprivation Affecting Children Index (1-5) |
| 23 | Total number of pupils | Pupil count |
| 24 | Statutory lowest age | Youngest pupil age |
| 25 | Statutory highest age | Oldest pupil age |

**Current Inspection:**
| # | Column Name | Description |
|---|-------------|-------------|
| 26 | Inspection number | Unique inspection ID |
| 27 | Inspection type | Full, Short, Monitoring, etc. |
| 28 | Inspection type grouping | Graded, Ungraded, Monitoring |
| 29 | Event type grouping | Event category |
| 30 | Inspection start date | Date |
| 31 | Publication date | When report was published |
| 32 | Did the latest ungraded inspection convert to a graded inspection? | Yes/No |
| 33 | Outcomes for ungraded and monitoring inspections | Text outcome |

**Inspection Ratings (KEY FIELDS):**
| # | Column Name | Values |
|---|-------------|--------|
| 34 | **Overall effectiveness** | 1=Outstanding, 2=Good, 3=Requires Improvement, 4=Inadequate, "Not judged" (from Sep 2024) |
| 35 | Category of concern | Special measures / Serious weaknesses / None |
| 36 | **Quality of education** | 1-4 scale |
| 37 | **Behaviour and attitudes** | 1-4 scale |
| 38 | **Personal development** | 1-4 scale |
| 39 | **Effectiveness of leadership and management** | 1-4 scale |
| 40 | **Safeguarding is effective** | Yes/No |
| 41 | Early years provision (where applicable) | 1-4 scale |
| 42 | Sixth form provision (where applicable) | 1-4 scale |

**Previous Inspection:**
| # | Column Name | Description |
|---|-------------|-------------|
| 43 | Previous inspection number | Previous inspection ID |
| 44 | Previous inspection start date | Date |
| 45 | Previous publication date | Date |
| 46 | Does the previous inspection relate to the school in its current form? | Yes/No |
| 47-50 | Previous URN, LAESTAB, school name, school type | Historical identifiers |

### 2.2 Official Statistics CSV -- Additional Fields

The official statistics CSV includes extra columns:
- Number of warning notices issued in 2023/24 academic year
- Number of ungraded inspections since last graded inspection
- Date of latest ungraded inspection
- Ungraded inspection publication date
- Ungraded inspection overall outcome
- Number of monitoring and urgent inspections since last graded inspection

---

## 3. Ofsted Rating System

### 3.1 Traditional 4-Point Scale (Pre-September 2024)

| Grade | Value | Description |
|-------|-------|-------------|
| Outstanding | 1 | Highest quality |
| Good | 2 | Effective provision |
| Requires Improvement | 3 | Not yet good |
| Inadequate | 4 | Serious/special measures |

**Applied to 4 key judgement areas:**
1. Quality of education
2. Behaviour and attitudes
3. Personal development
4. Leadership and management

Plus an **Overall Effectiveness** grade (abolished September 2024 for state-funded schools).

### 3.2 Rating Distribution: All State-Funded Schools (as at 31 August 2024)

| Rating | Percentage | Estimated Number (~22,000 total) |
|--------|-----------|----------------------------------|
| Outstanding | 14% | ~3,080 |
| Good | 77% | ~16,940 |
| Requires Improvement | 8% | ~1,760 |
| Inadequate | 2% | ~440 |
| **Total Good/Outstanding** | **90%** | **~19,800** |

Source: [GOV.UK Main findings as at 31 August 2024](https://www.gov.uk/government/statistics/state-funded-schools-inspections-and-outcomes-as-at-31-august-2024/main-findings-state-funded-schools-inspections-and-outcomes-as-at-31-august-2024)

### 3.3 Rating Distribution by School Type (as at 31 August 2024)

| School Type | Good or Outstanding | Change from Prior Year |
|-------------|-------------------|----------------------|
| Nursery | 97% | Stable |
| Primary | 92% | Up from 90% |
| Secondary | 84% | Up from 82% |
| Special | 90% | Up from 89% |
| Alternative Provision | 86% | Up from 85% |

### 3.4 Rating Trend Over Time

| Year (August snapshot) | % Good or Outstanding |
|-----------------------|----------------------|
| August 2022 | 88% |
| August 2023 | 89% |
| December 2023 | 90% |
| August 2024 | 90% |

### 3.5 New Framework: Report Cards (from November 2025)

| Attribute | Detail |
|-----------|--------|
| Launch date | 10 November 2025 |
| Evaluation areas | 11 areas rated on 5-point scale |
| Scale | Exceptional, Strong, Secure, Developing, Urgent Improvement |
| Safeguarding | Separate binary judgement: Met / Not Met |
| Format | Report card + narrative summaries per area |
| Single-word grade | Abolished for state-funded schools (Sep 2024) |

---

## 4. Scale of Data

### 4.1 Total Schools in England (2024/25 Academic Year)

| School Type | Number | % of Total |
|-------------|--------|-----------|
| Primary | 16,764 | 68.6% |
| Secondary | 3,452 | 14.1% |
| Independent | 2,421 | 9.9% |
| Special (state-funded) | 1,050 | 4.3% |
| Nursery | 388 | 1.6% |
| Pupil Referral Units | 333 | 1.4% |
| Non-maintained special | 52 | 0.2% |
| **Total** | **24,453** | **100%** |

Source: [DfE Schools, pupils and their characteristics 2024/25](https://explore-education-statistics.service.gov.uk/find-statistics/school-pupils-and-their-characteristics/2024-25)

**State-funded schools covered by Ofsted: ~22,000** (excludes most independent schools)

### 4.2 Academy vs. Maintained Split

| Category | Primary Schools | Secondary Schools |
|----------|---------------|-------------------|
| Academies/Free Schools | 46.1% | 83.0% |
| Local authority maintained | 53.9% | 17.0% |
| Overall split | 49% maintained | 51% academies |

### 4.3 Inspections Per Year

| Academic Year | Total Inspections | Graded | Ungraded | Monitoring/Urgent |
|--------------|-------------------|--------|----------|--------------------|
| 2022/23 | 7,282 | N/A | N/A | N/A |
| 2023/24 | 6,930 | 4,023 | 2,662 | 245 |
| 2024/25 (to Dec 2024) | 2,149 | 1,218 | 862 | 69 |
| 2024/25 (full year planned) | 7,001 | N/A | N/A | N/A |
| 2024/25 (actual completed) | 6,471 | N/A | N/A | N/A |

**Shortfalls:**
- 2023/24: 417 inspections delayed (6% shortfall) due to Ruth Perry coroner's report response
- 2024/25: 530 inspections missed (7.6% shortfall); 341 lost due to September 2024 pause for framework changes

### 4.4 Schools Rated "Requires Improvement" or "Inadequate"

| Rating | % of All Schools | Estimated Number |
|--------|-----------------|-----------------|
| Requires Improvement | 8% | ~1,760 |
| Inadequate | 2% | ~440 |
| **Combined** | **10%** | **~2,200** |

**Improvement rates (2023/24 inspections):**
- 75% of previously "Requires Improvement" schools improved to Good or Outstanding
- 97% of previously "Inadequate" schools improved
- 90% of previously "Good" schools maintained or improved their grade
- 760 previously exempt "Outstanding" schools lost their top grade
- 160 schools upgraded to Outstanding

### 4.5 Key Judgement Outcomes (Dec 2024, Graded Inspections Only)

| Judgement Area | Outstanding | Good | Requires Improvement | Inadequate | Good+ |
|---------------|------------|------|---------------------|------------|-------|
| Quality of Education | 16% | 67% | 15% | 1% | 84% |
| Behaviour & Attitudes | 29% | 65% | 6% | 0% | 94% |
| Personal Development | 35% | 63% | 3% | 0% | 97% |
| Leadership & Management | 20% | 69% | 10% | 1% | 89% |

---

## 5. Inspection Frequency & Triggers

### 5.1 Standard Inspection Cycle

| School Rating | Inspection Frequency |
|--------------|---------------------|
| Outstanding | Every 4-5 years (no longer exempt) |
| Good | Within 4 years of last graded inspection |
| Requires Improvement | Within 30 months |
| Inadequate | Termly monitoring visits |

**Statutory maximum:** All schools must be inspected within 5 school years of previous inspection.

### 5.2 Triggers for Earlier Inspection

- Concerns raised to Ofsted (complaints, whistleblowing)
- Secretary of State direct order
- Significant decline in published data (exam results, attendance)
- Safeguarding concerns
- Previous "Requires Improvement" or "Inadequate" rating

### 5.3 Coverage Under Current Framework (Education Inspection Framework, since Sept 2019)

| Status | % of Schools |
|--------|-------------|
| Had graded inspection under EIF | 53% (as at Dec 2024) / 49% (as at Aug 2024) |
| Had ungraded inspection under EIF | 39% (Dec 2024) / 37% (Aug 2024) |
| Not yet inspected under EIF | 8% (Dec 2024) / 14% (Aug 2024) |

### 5.4 Ungraded Inspection Outcomes (2024/25 to Dec)

| Outcome | Percentage |
|---------|-----------|
| Standards maintained | 86% |
| Improved significantly | 9% |
| Some aspects not as strong | 5% |
| **Positive overall** | **95%** |

### 5.5 Monitoring Inspection Outcomes (2024/25 to Dec)

- 67 monitoring inspections conducted
- 93% found schools taking effective action

---

## 6. Similar UK Regulators with Inspection Data

### 6.1 CQC (Care Quality Commission) -- Healthcare

| Attribute | Detail |
|-----------|--------|
| **API Available** | YES -- RESTful JSON API |
| **Base URL** | https://api.cqc.org.uk/public/v1 (legacy) / https://api.service.cqc.org.uk (current) |
| **Authentication** | partnerCode query parameter required (self-assigned for non-partners) |
| **Endpoints** | /providers, /providers/{id}, /locations, /locations/{id} |
| **Data format** | JSON |
| **Update frequency** | Daily |
| **License** | Open Government Licence |
| **Coverage** | All active and inactive healthcare providers and locations in England |
| **Rating system** | Outstanding, Good, Requires Improvement, Inadequate (5 key questions) |
| **Developer portal** | https://api-portal.service.cqc.org.uk/ |
| **Documentation** | https://anypoint.mulesoft.com/exchange/portals/care-quality-commission-5/ |
| **R package** | cqcr (https://docs.evanodell.com/cqcr/) |
| **Contact** | syndicationapi@cqc.org.uk |

### 6.2 FSA (Food Standards Agency) -- Food Hygiene

| Attribute | Detail |
|-----------|--------|
| **API Available** | YES -- REST API |
| **Base URL** | https://api.ratings.food.gov.uk/ |
| **Authentication** | None required |
| **Data format** | XML (geocoded data with lat/long) |
| **Coverage** | England, Scotland, Wales, Northern Ireland |
| **Rating system** | 0-5 scale (Food Hygiene Rating Scheme) |
| **Additional API** | Food Alerts API (allergy alerts, product recalls) |
| **Documentation** | https://api.ratings.food.gov.uk/help |
| **Registration** | No sign-up, API keys, or login required |

### 6.3 Other UK Regulators (Future Reference)

| Regulator | Sector | Public Data | API |
|-----------|--------|-------------|-----|
| Ofcom | Telecommunications | Open data portal | Limited |
| Environment Agency | Environment | data.gov.uk datasets | Some REST APIs |
| Ofwat | Water | Performance data | No public API |
| Ofgem | Energy | Market data | No public API |
| HSE | Health & Safety | Enforcement notices | data.gov.uk |

---

## 7. Recommended Integration Approach for TendHunt

### 7.1 Data Pipeline Design

```
1. Download monthly CSV from GOV.UK (16.2 MB)
   URL: Management information CSV
   Frequency: Monthly (or on publication)

2. Parse CSV → Extract key fields:
   - URN (primary key)
   - School name
   - Overall effectiveness (1-4 or "Not judged")
   - Quality of education (1-4)
   - Behaviour and attitudes (1-4)
   - Personal development (1-4)
   - Leadership and management (1-4)
   - Inspection date
   - Local authority
   - Postcode
   - School type
   - Multi-academy trust

3. Match to buyers via:
   - School name fuzzy match to buyer names
   - Local authority matching
   - Postcode proximity

4. Store in MongoDB with TTL for freshness
```

### 7.2 Key Considerations

- **No API** = must download and parse CSV files periodically
- **URN** is the universal school identifier -- use as primary key
- **Overall effectiveness removed** from Sep 2024 -- use individual judgement areas instead
- **GIAS removed Ofsted fields** in Jan 2025 -- cannot get ratings from GIAS anymore
- **Report cards** launching Nov 2025 with new 5-point scale across 11 areas
- **~2,200 schools** (~10%) currently rated Requires Improvement or Inadequate -- these represent procurement intelligence targets
- **CQC has a proper API** and could be integrated more easily for healthcare sector intelligence

---

## 8. Key URLs

| Resource | URL |
|----------|-----|
| Monthly management info | https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes |
| Official statistics (latest) | https://www.gov.uk/government/statistics/state-funded-schools-inspections-and-outcomes-as-at-31-december-2024 |
| Five-Year data | https://www.gov.uk/government/publications/five-year-ofsted-inspection-data |
| GIAS (school metadata) | https://get-information-schools.service.gov.uk/ |
| Ofsted report finder | https://reports.ofsted.gov.uk/ |
| Data View (Tableau) | https://www.gov.uk/government/publications/exploring-ofsted-inspection-data-with-data-view |
| DfE statistics explorer | https://explore-education-statistics.service.gov.uk/ |
| CQC API portal | https://api-portal.service.cqc.org.uk/ |
| FSA ratings API | https://api.ratings.food.gov.uk/help |
| Data.gov.uk Ofsted dataset | https://www.data.gov.uk/dataset/06a19224-ec69-4065-acd9-63b5d9fd97b1 |

---

## Sources

- [GOV.UK: State-funded school inspections as at 31 August 2024](https://www.gov.uk/government/statistics/state-funded-schools-inspections-and-outcomes-as-at-31-august-2024/main-findings-state-funded-schools-inspections-and-outcomes-as-at-31-august-2024)
- [GOV.UK: State-funded school inspections as at 31 December 2024](https://www.gov.uk/government/statistics/state-funded-schools-inspections-and-outcomes-as-at-31-december-2024/main-findings-state-funded-schools-inspections-and-outcomes-as-at-31-december-2024)
- [GOV.UK: Monthly management information](https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes)
- [GOV.UK: Five-Year Ofsted Inspection Data guidance](https://www.gov.uk/government/publications/five-year-ofsted-inspection-data/five-year-ofsted-inspection-data-guidance)
- [DfE: Schools, pupils and their characteristics 2024/25](https://explore-education-statistics.service.gov.uk/find-statistics/school-pupils-and-their-characteristics/2024-25)
- [GOV.UK: GIAS](https://get-information-schools.service.gov.uk/)
- [GOV.UK: Ofsted confirms report card changes](https://www.gov.uk/government/news/ofsted-confirms-changes-to-education-inspection-and-unveils-new-look-report-cards)
- [CQC Developer Portal](https://api-portal.service.cqc.org.uk/)
- [CQC Syndication API](https://anypoint.mulesoft.com/exchange/portals/care-quality-commission-5/4d36bd23-127d-4acf-8903-ba292ea615d4/cqc-syndication-1/)
- [FSA Food Hygiene Rating API](https://api.ratings.food.gov.uk/help)
- [Data.gov.uk: Ofsted management information](https://www.data.gov.uk/dataset/06a19224-ec69-4065-acd9-63b5d9fd97b1/state-funded-school-inspections-and-outcomes-management-information)
- [Schools Week: Ofsted annual report findings](https://schoolsweek.co.uk/missed-inspection-targets-and-5-more-findings-from-ofsteds-annual-report/)
- [TES: Ofsted inspections delayed](https://www.tes.com/magazine/news/general/over-500-ofsted-inspections-delayed-crisis-hit-year)
- [TeacherActive: Ofsted changes 2025](https://www.teacheractive.com/media-post/ofsted-changes-2025-explained)
