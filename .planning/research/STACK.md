# Stack Research: Ofsted Timeline Intelligence

## Existing Stack (Validated)

This is a brownfield feature addition. The stack is already established:

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1 (TypeScript) | App router, server components |
| Database | MongoDB Atlas | Mongoose ODM |
| UI | shadcn/ui + Tailwind CSS 4.1 | Dark mode, responsive |
| Data Grid | Glide Data Grid | Custom renderers, AI columns |
| AI | Claude API (Haiku/Sonnet) | SSE streaming, tool use |
| Animation | Motion (Framer Motion) | Required for all state transitions |
| Auth | Clerk | Already integrated |
| Workers | Cloudflare Workers | Data-sync, enrichment, spend-ingest |

## New Stack Additions Needed

### 1. PDF Processing for Ofsted Reports

**Recommended: `pdf-parse` (already in project scripts dependencies)**

Ofsted report PDFs are typically 5-15 pages. `pdf-parse` extracts text from PDFs in Node.js. Already used elsewhere in the TendHunt codebase (scripts/).

Alternative considered: `@anthropic-ai/sdk` direct PDF support -- Claude can process PDFs natively via the API, but this is expensive for batch processing. Better to extract text first, then send to Claude.

**Approach:** Fetch PDF from `files.ofsted.gov.uk`, extract text with `pdf-parse`, send text to Claude for analysis.

### 2. CSV Parsing for Historical Data

**Already in use: `csv-parse`**

The existing `ingest-ofsted.ts` script uses `csv-parse` for the management information CSV. The same library works for the "all inspections" historical CSVs.

### 3. Timeline Visualization

**Recommended: Custom canvas rendering in Glide Data Grid OR React component**

Two options:
- **For scanner grid:** Add a custom cell renderer for timeline visualization (mini chart in a cell)
- **For detail pages:** Use a React timeline component with Motion animations

No external charting library needed -- the existing pattern of custom Glide Data Grid renderers + React components with Motion covers both use cases.

### 4. Report URL Structure

Ofsted reports are accessible at:
- **Provider page:** `https://reports.ofsted.gov.uk/provider/{type}/{URN}` (lists all inspections)
- **PDF download:** `https://files.ofsted.gov.uk/v1/file/{fileId}` (direct PDF)
- **Report URL in CSV:** Points to the report page on GOV.UK

The `reportUrl` field in the existing OfstedSchool model may point to the GOV.UK page. For PDF extraction, we need the `files.ofsted.gov.uk` URL which requires scraping the provider page or mapping from inspection numbers.

## Data Sources

### Primary: Monthly Management Information CSV

- **URL:** `https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes`
- **Format:** CSV, ~16MB, ~22,000 rows
- **Content:** Latest inspection for each school (one row per school)
- **Key fields:** URN, School name, Region, Overall effectiveness, Quality of education, Behaviour and attitudes, Personal development, Leadership and management, Inspection date, Previous inspection date, Previous overall effectiveness
- **Already ingested:** Yes, via `apps/web/scripts/ingest-ofsted.ts`

### Secondary: "All Inspections" Year-to-Date CSV

- **URL:** Same GOV.UK page, separate files per academic year
- **Format:** CSV with MULTIPLE rows per school (one per inspection)
- **Content:** Every inspection published in a given year-to-date period
- **Key fields:** Same as management info + inspection number, inspection type
- **Covers:** Files available from 2005-2015 (consolidated), 2015-2019 (consolidated), then yearly
- **Critical for timeline:** This is the source for full inspection history

### Tertiary: Five-Year Inspection Data

- **URL:** `https://www.gov.uk/government/publications/five-year-ofsted-inspection-data`
- **Format:** ODS spreadsheet
- **Content:** Most recent inspection for all open providers over 5 years
- **Limitation:** Single row per school (latest only), NOT multiple inspections
- **Note:** Publication postponed while Ofsted updates format

### Report PDFs

- **Access:** `https://files.ofsted.gov.uk/v1/file/{fileId}`
- **Discovery:** Via provider page at `reports.ofsted.gov.uk/provider/{type}/{URN}`
- **Format:** PDF, 5-20 pages
- **Content:** Full narrative report with sections on each judgement area

## Post-September 2024 Change

Since September 2024, Ofsted no longer assigns an "Overall Effectiveness" grade (1-4) for state-funded schools. Instead, schools receive individual sub-judgement grades only:
- Quality of education
- Behaviour and attitudes
- Personal development
- Leadership and management

**Impact on our feature:**
- New inspections (post Sep 2024) will have NULL overall effectiveness
- Must filter by sub-judgement grades, not just overall
- "Downgrade" detection needs to compare individual sub-judgements when overall is missing
- Timeline visualization needs to handle mixed data (old inspections with overall grade, new ones without)

## Confidence Levels

| Decision | Confidence | Notes |
|----------|-----------|-------|
| Use "all inspections" CSVs for history | High | Multiple rows per school, exact data needed |
| pdf-parse for report text extraction | High | Already in project, lightweight |
| Claude Haiku for report analysis | High | Matches existing AI column pattern |
| Custom Glide renderer for timeline | Medium | May be complex; could start with simpler approach |
| No external charting library | Medium | Timeline could benefit from a light chart lib later |

---
*Researched: 2026-02-14*
