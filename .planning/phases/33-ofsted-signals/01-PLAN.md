# Plan: Ofsted Inspection Signals — Education Sector Intelligence

## Goal
Ingest Ofsted school inspection data from the monthly GOV.UK CSV, store it in MongoDB, link schools to buyer organizations, and surface "Requires Improvement" / "Inadequate" ratings as procurement opportunity signals on buyer and contract pages. SMEs selling education services can find schools that need help before tenders are published.

## Context
- Ofsted has NO API — data is a monthly 16.2MB CSV from GOV.UK with 22,000 schools and 50+ columns
- ~2,200 schools (10%) rated below "Good" = procurement targets
- URN (6-digit Unique Reference Number) is the primary key for schools
- Overall effectiveness grade was abolished Sep 2024 — use individual judgement areas (Quality of Education, Behaviour, Personal Development, Leadership)
- Schools can be matched to buyer orgs via Multi-Academy Trust name or Local Authority name

## Tasks

### Task 1: OfstedSchool Mongoose Model + Ingest Script
**Files:** `apps/web/src/models/ofsted-school.ts`, `apps/web/scripts/ingest-ofsted.ts`

Create a new `OfstedSchool` model with fields from the CSV:
```
urn: Number (unique, indexed)
name: String (indexed)
phase: String (Primary/Secondary/Special/Nursery)
schoolType: String (Academy/Community/etc)
localAuthority: String (indexed)
region: String
postcode: String
matUid: String (Multi-Academy Trust UID, indexed)
matName: String
overallEffectiveness: Number (1-4, null if "Not judged")
qualityOfEducation: Number (1-4)
behaviourAndAttitudes: Number (1-4)
personalDevelopment: Number (1-4)
leadershipAndManagement: Number (1-4)
safeguarding: String (Yes/No)
inspectionDate: Date
publicationDate: Date
inspectionType: String
reportUrl: String
previousOverallEffectiveness: Number (1-4)
previousInspectionDate: Date
idaciQuintile: Number (1-5, deprivation index)
totalPupils: Number
buyerId: ObjectId (ref Buyer, indexed) — linked to buyer org
```

Ingest script:
1. Download CSV from GOV.UK URL (hardcoded, updated monthly)
2. Parse with `csv-parse` (already in deps or add)
3. Map CSV columns to schema fields
4. Bulk upsert by URN
5. Match schools to buyers: fuzzy match MAT name or LA name to buyer `nameLower`
6. Run: `DOTENV_CONFIG_PATH=apps/web/.env.local npx tsx --require dotenv/config apps/web/scripts/ingest-ofsted.ts`

### Task 2: Ofsted Signal Generation
**File:** `apps/web/scripts/generate-ofsted-signals.ts`

After ingestion, generate Signal records for schools rated below "Good":
- For each school where `overallEffectiveness >= 3` OR any judgement area >= 3:
  - Create a Signal with `type: "REGULATORY"` and `signalType: "OFSTED_INSPECTION"`
  - `organizationName`: school name (or MAT name if MAT-linked)
  - `buyerId`: linked buyer if matched
  - `summary`: "Ofsted rated [School] as [Rating] — [judgement areas below Good]"
  - `quote`: Key findings from the inspection
  - `confidence`: 0.95 (direct from official data)
  - `entities`: school name, local authority, MAT (if applicable)
  - `meetingDate`: inspection date
  - Dedup key: `urn + inspectionDate`

### Task 3: Ofsted Signals Display on Buyer Page
**Files:** `apps/web/src/components/buyers/signals-tab.tsx`, `apps/web/src/lib/buyers.ts`

Extend the existing Signals tab:
- Add "OFSTED_INSPECTION" to the signal type filter pills
- Use a distinct badge color (amber/orange for Ofsted)
- Show Ofsted-specific fields: school name, rating, judgement areas, inspection date
- Link to full Ofsted report via `reportUrl`
- If buyer has multiple linked schools (MAT parent), show all schools with their ratings

### Task 4: Ofsted Schools Tab on Buyer Page (for MATs/LAs)
**Files:** `apps/web/src/components/buyers/ofsted-tab.tsx`, `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx`

For buyers that are Multi-Academy Trusts or Local Authorities:
- New "Schools (N)" tab showing all linked OfstedSchool records
- Table: school name, phase, rating badge, last inspection date, pupils, IDACI quintile
- Summary stats at top: X schools, Y% Good+, Z rated below Good
- Sort by rating (worst first) — schools needing improvement surface to top
- Color-coded rating badges: green (1-Outstanding), blue (2-Good), amber (3-RI), red (4-Inadequate)

### Task 5: Contract Page Ofsted Context
**File:** `apps/web/src/components/contracts/contract-detail-view.tsx`

For education-sector contracts (sector = "Education" or CPV starts with "80"):
- Show an "Ofsted Context" card in the right sidebar
- If the buyer is a MAT/LA, show: "This buyer has N schools, X rated Requires Improvement"
- Quick list of schools below Good with their ratings
- This helps SMEs understand the buyer's needs before bidding

### Task 6: Scanner Integration — Ofsted Columns
**File:** `apps/web/src/components/scanners/table-columns.ts`

Add optional Ofsted columns to the Buyers scanner type:
- "Ofsted Rating" — worst school rating for the buyer (1-4)
- "Schools Below Good" — count of schools rated 3 or 4
- These work with existing scanner AI scoring — users can ask "Which buyers have the most schools needing improvement?"

## Verification
- [ ] OfstedSchool collection populated with ~22,000 schools
- [ ] Schools linked to buyer orgs via MAT name or LA name
- [ ] Signals generated for ~2,200 schools rated below Good
- [ ] Ofsted signals visible on buyer Signals tab
- [ ] Schools tab visible for MAT/LA buyers
- [ ] Education contract detail shows Ofsted context
- [ ] No regression — existing signals and buyer data unchanged
