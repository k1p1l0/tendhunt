# Roadmap: TendHunt Hackathon MVP

## Overview

TendHunt is a UK procurement intelligence platform built as a 1-week hackathon investor demo. The build follows a data-first order: foundation and auth first (everything needs user context), then real procurement data into MongoDB Atlas, then the dashboard to display it, then the Vibe Scanner AI scoring layer on top, then buyer intelligence with the credit-based contact reveal business model, then buying signals, and finally the landing/pricing pages. Every phase delivers a verifiable capability that builds toward the 3-minute investor demo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffolding, Clerk auth, MongoDB schema, app shell
- [x] **Phase 2: Data Pipeline** - Scrape and seed real UK procurement data into MongoDB Atlas
- [x] **Phase 3: Onboarding & Company Profile** - Document upload, AI profile generation, credit bonus
- [ ] **Phase 4: Contract Dashboard** - Core product screen with search, filters, and detail view
- [ ] **Phase 5: Vibe Scanner** - AI-powered contract scoring using Claude Haiku
- [ ] **Phase 6: Buyer Intelligence & Credits** - Buyer profiles, contact reveal, credit system
- [ ] **Phase 7: Buying Signals** - Board minutes pre-tender signals display
- [ ] **Phase 8: Landing & Pricing** - Marketing page and pricing tiers

## Phase Details

### Phase 1: Foundation
**Goal**: A working Next.js app with Clerk authentication, MongoDB Atlas connection, and the app shell layout so every subsequent phase has a foundation to build on
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-05, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password or social login via Clerk and land on a dashboard shell
  2. User session persists across browser refresh without re-authentication
  3. MongoDB Atlas is connected with collections defined for contracts, buyers, signals, users, and credits
  4. App shell shows authenticated layout with sidebar/header navigation and placeholder content areas
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Next.js 16 scaffold, Tailwind v4, shadcn/ui, Clerk auth with proxy.ts
- [x] 01-02-PLAN.md -- MongoDB Atlas connection, 5 Mongoose schemas, Clerk webhook user sync, app shell layout

### Phase 2: Data Pipeline
**Goal**: Real UK procurement data from Find a Tender and Contracts Finder is normalized and stored in MongoDB Atlas, alongside seeded board minutes signals and buyer contacts, so the dashboard has real data to display
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. 200-500 real contract notices from Find a Tender OCDS API exist in MongoDB with unified schema
  2. Contracts Finder notices are ingested and normalized to the same unified schema
  3. Each contract record includes source attribution (Find a Tender or Contracts Finder)
  4. 50-100 pre-processed board minutes signals are seeded across multiple sectors and signal types
  5. Buyer contact data from public sources (GOV.UK appointments, council pages, NHS board lists) is seeded for 50-100 organizations
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Shared ingestion lib (DB, API client, OCDS mapper) + Find a Tender OCDS API ingestion (200-500 contracts)
- [x] 02-02-PLAN.md -- Contracts Finder OCDS API ingestion with unified schema normalization
- [x] 02-03-PLAN.md -- Seed board minutes signals (75) and buyer contacts (75) from generated JSON data

### Phase 3: Onboarding & Company Profile
**Goal**: New users can upload company documents and get an AI-generated company profile that powers the Vibe Scanner, plus receive their signup credit bonus
**Depends on**: Phase 1
**Requirements**: AUTH-02, AUTH-03, AUTH-04, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop upload company documents (past bids, capability statements, certifications) during onboarding
  2. AI analyzes uploaded documents and generates a structured company profile (sectors, capabilities, keywords, ideal contract description)
  3. User can review and edit the AI-generated company profile before saving
  4. New user receives 10 free credits on signup, visible in their account
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- R2 presigned URL upload, onboarding gate middleware, document dropzone, CompanyProfile model, onboarding wizard shell
- [x] 03-02-PLAN.md -- Text extraction, Claude Haiku AI profile generation, profile review/edit form, credit bonus, onboarding completion flow

### Phase 4: Contract Dashboard
**Goal**: Users see a searchable, filterable feed of real UK procurement contracts as the core product experience
**Depends on**: Phase 1, Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. User sees a dashboard feed of contracts on login, with contract cards showing title, buyer, value, dates, and source
  2. User can search contracts by keyword and see results update
  3. User can filter contracts by sector, value range, and region, with filters combinable
  4. User can click a contract card to view full details (title, buyer, value, dates, CPV codes, description, source URL)
  5. Dashboard displays total contract count and filtered result count
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md -- Data access layer, contract feed with cards, keyword search, sector/region/value filters, pagination, count display
- [ ] 04-02-PLAN.md -- Contract detail page, dashboard real stats + recent contracts, score badge placeholder

### Phase 5: Vibe Scanner
**Goal**: Users can create an AI-powered scoring engine from their company profile that batch-scores all contracts and buyer organizations using Claude Haiku, with interactive threshold controls to surface the best opportunities
**Depends on**: Phase 3, Phase 4
**Requirements**: VIBE-01, VIBE-02, VIBE-03, VIBE-04, VIBE-05, VIBE-06, VIBE-07, VIBE-08, VIBE-09, VIBE-10, VIBE-11
**Success Criteria** (what must be TRUE):
  1. User can create a Vibe Scanner from their company profile and see the generated scoring prompt
  2. User can view and edit the scoring prompt in a textarea, then trigger re-scoring with "Apply & Score"
  3. AI batch-scores contracts using Claude Haiku, with a visible progress bar during scoring
  4. Each contract card shows an AI score (1-10) with color-coded badge (green/yellow/red) and reasoning text
  5. User can adjust a score threshold slider (1-10, 0.1 increments) and contracts below threshold appear with reduced opacity or are hidden, with a visual divider separating above/below threshold
**Plans**: TBD

Plans:
- [ ] 05-01: Vibe Scanner creation, prompt generation from profile, prompt editor
- [ ] 05-02: Claude Haiku batch scoring API, progress bar, score display on contracts
- [ ] 05-03: Threshold slider, opacity/hide toggle, score divider, re-score flow, buyer org scoring

### Phase 6: Buyer Intelligence & Credits
**Goal**: Users can explore buyer organization profiles with AI relevance scores and reveal locked contacts by spending credits, demonstrating the monetization model to investors
**Depends on**: Phase 2, Phase 5
**Requirements**: BUYER-01, BUYER-02, BUYER-03, BUYER-04, BUYER-05, BUYER-06, BUYER-07, CRED-01, CRED-02, CRED-03, CRED-04, CRED-05
**Success Criteria** (what must be TRUE):
  1. User can view buyer organization profiles showing name, sector, location, and recent contracts
  2. Buyer profile displays associated buying signals from board minutes and an AI relevance score from the Vibe Scanner
  3. User sees a list of contacts associated with a buyer organization, blurred/locked by default
  4. User can reveal a contact by spending 1 credit, with blur-to-reveal animation showing name, job title, email, and public profile link
  5. Previously revealed contacts remain visible without additional credit spend across sessions
  6. Credit balance is visible in the header, decreases atomically on reveal, and shows an upgrade prompt at zero balance
  7. User can view credit transaction history
**Plans**: TBD

Plans:
- [ ] 06-01: Buyer organization profiles with signals and AI scores
- [ ] 06-02: Credit system (balance display, atomic deduction, transaction history, upgrade prompt)
- [ ] 06-03: Contact reveal flow (blur-to-reveal, credit spend, persistence)

### Phase 7: Buying Signals
**Goal**: Users can browse and filter pre-tender buying signals extracted from board minutes, displayed alongside contracts or in a dedicated tab
**Depends on**: Phase 2, Phase 4
**Requirements**: SGNL-01, SGNL-02, SGNL-03, SGNL-04, SGNL-05
**Success Criteria** (what must be TRUE):
  1. User can view buying signals in the dashboard, each showing source organization, date, signal type, and extracted insight
  2. Signals are categorized by 6 types (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY) with visual distinction
  3. User can filter signals by type
  4. Signals display alongside contracts in a unified feed or as a separate tab (toggle between views)
**Plans**: TBD

Plans:
- [ ] 07-01: Buying signals feed, signal cards, type filtering, and dashboard integration

### Phase 8: Landing & Pricing
**Goal**: A polished landing page and pricing page that frame the investor conversation and show the business model
**Depends on**: Phase 1
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Landing page clearly explains TendHunt value proposition with compelling copy and visual hierarchy
  2. Pricing page displays 3 tiers (Starter, Growth, Scale) with monthly price, credit allocation, and included features
  3. Each tier has a CTA button linking to waitlist/contact for the hackathon demo
**Plans**: TBD

Plans:
- [ ] 08-01: Landing page with value proposition
- [ ] 08-02: Pricing page with 3 tiers and CTA buttons

## Coverage Matrix

| Requirement | Phase | Description |
|-------------|-------|-------------|
| AUTH-01 | Phase 1 | Sign up/sign in via Clerk |
| AUTH-02 | Phase 3 | Upload company documents during onboarding |
| AUTH-03 | Phase 3 | AI analyzes documents, generates company profile |
| AUTH-04 | Phase 3 | Review/edit AI-generated profile |
| AUTH-05 | Phase 1 | Session persistence |
| AUTH-06 | Phase 3 | 10 free credits on signup |
| VIBE-01 | Phase 5 | Create Vibe Scanner from company profile |
| VIBE-02 | Phase 5 | Generate scoring prompt from profile + docs |
| VIBE-03 | Phase 5 | View/edit scoring prompt |
| VIBE-04 | Phase 5 | AI batch-scores contracts using Claude Haiku |
| VIBE-05 | Phase 5 | Each contract shows AI score (1-10) + reasoning |
| VIBE-06 | Phase 5 | Score threshold slider (1-10, 0.1 increments) |
| VIBE-07 | Phase 5 | Below-threshold contracts reduced opacity/hidden |
| VIBE-08 | Phase 5 | Score divider visual separator |
| VIBE-09 | Phase 5 | Re-score after editing prompt |
| VIBE-10 | Phase 5 | Scoring progress bar |
| VIBE-11 | Phase 5 | AI scores buyer organizations too |
| DASH-01 | Phase 4 | Dashboard feed sorted by AI score |
| DASH-02 | Phase 4 | Search by keyword |
| DASH-03 | Phase 4 | Filter by sector, value, region |
| DASH-04 | Phase 4 | Contract detail view |
| DASH-05 | Phase 4 | Total/filtered count display |
| DASH-06 | Phase 4 | Color-coded AI score badges |
| SGNL-01 | Phase 7 | Board minutes signals in dashboard |
| SGNL-02 | Phase 7 | 6 signal categories |
| SGNL-03 | Phase 7 | Filter signals by type |
| SGNL-04 | Phase 7 | Signal detail (source, date, type, insight) |
| SGNL-05 | Phase 7 | Signals alongside contracts or separate tab |
| BUYER-01 | Phase 6 | Buyer org profiles |
| BUYER-02 | Phase 6 | Associated buying signals |
| BUYER-03 | Phase 6 | AI relevance score from Vibe Scanner |
| BUYER-04 | Phase 6 | Locked/blurred contact list |
| BUYER-05 | Phase 6 | Reveal contact for 1 credit |
| BUYER-06 | Phase 6 | Revealed contact details |
| BUYER-07 | Phase 6 | Previously revealed contacts stay visible |
| CRED-01 | Phase 6 | Balance in header |
| CRED-02 | Phase 6 | Deduct 1 on reveal |
| CRED-03 | Phase 6 | Upgrade prompt at zero |
| CRED-04 | Phase 6 | Atomic deduction |
| CRED-05 | Phase 6 | Transaction history |
| PRICE-01 | Phase 8 | Landing page |
| PRICE-02 | Phase 8 | 3 pricing tiers |
| PRICE-03 | Phase 8 | Tier details |
| PRICE-04 | Phase 8 | CTA buttons (waitlist) |
| DATA-01 | Phase 2 | Find a Tender OCDS API ingestion |
| DATA-02 | Phase 2 | Contracts Finder API ingestion |
| DATA-03 | Phase 1 | Unified schema in MongoDB |
| DATA-04 | Phase 2 | Seed board minutes signals |
| DATA-05 | Phase 2 | Seed buyer contacts from public sources |
| DATA-06 | Phase 2 | Source attribution on contracts |

**Coverage: 46/46 v1 requirements mapped. No orphans.**

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

Note: Phase 3 (Onboarding) can run in parallel with Phase 2 (Data Pipeline) since they share only the Phase 1 dependency. Phase 7 (Buying Signals) and Phase 8 (Landing/Pricing) can also run in parallel after their dependencies are met.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | ✓ Complete | 2026-02-10 |
| 2. Data Pipeline | 3/3 | ✓ Complete | 2026-02-11 |
| 3. Onboarding & Company Profile | 2/2 | ✓ Complete | 2026-02-11 |
| 4. Contract Dashboard | 0/2 | Planning complete | - |
| 5. Vibe Scanner | 0/3 | Not started | - |
| 6. Buyer Intelligence & Credits | 0/3 | Not started | - |
| 7. Buying Signals | 0/1 | Not started | - |
| 8. Landing & Pricing | 0/2 | Not started | - |

### Phase 9: Enhance Onboarding: Company Photo Upload + AI Analysis Animations

**Goal:** Polish the onboarding wizard with company logo upload (circular avatar preview, R2 storage) and animated step-by-step AI analysis progress (replaces basic Loader2 spinner) for the investor demo
**Depends on:** Phase 3
**Plans:** 2 plans

Plans:
- [ ] 09-01-PLAN.md -- Logo upload infrastructure: shared upload utility, image presigned URL endpoint, LogoDropzone component, CompanyProfile logoKey field
- [ ] 09-02-PLAN.md -- AI analysis progress component with conditional animated steps, wire logo + progress into onboarding wizard, logo avatar in profile review
