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
- [x] **Phase 4: Contract Dashboard** - Core product screen with search, filters, and detail view
- [ ] **Phase 5: Vibe Scanner** - AI-powered contract scoring using Claude Haiku
- [x] **Phase 6: Buyer Intelligence & Credits** - Buyer profiles, contact reveal, credit system
- [ ] **Phase 7: Buying Signals** - Board minutes pre-tender signals display
- [ ] **Phase 8: Landing & Pricing** - Marketing page and pricing tiers
- [ ] **Phase 21: Slack Integration (OpenClaw)** - Public API, OpenClaw skill, Slack bot with Add to Slack OAuth
- [x] **Phase 22: CRM Pipeline (Procurement Inbox)** - Kanban deal pipeline with auto-send from scanners
- [ ] **Phase 30: Sculptor AI Homepage & Floating Assistant** - AI-first dashboard with Sculptor chat hero, animated starburst icon, floating bubble assistant on all pages
- [ ] **Phase 33: DPS & Framework Status Intelligence** - Procurement mechanism awareness (DPS, Framework, Call-off) in data model, UI, and AI

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
- [x] 04-01-PLAN.md -- Data access layer, contract feed with cards, keyword search, sector/region/value filters, pagination, count display
- [x] 04-02-PLAN.md -- Contract detail page, dashboard real stats + recent contracts, score badge placeholder

### Phase 5: Vibe Scanner
**Goal**: Users can create multiple named AI-powered scanners of different types (RFPs, Board Meetings, Buyers) each showing a Starbridge-style table with data columns and customizable AI columns, scored by Claude Haiku with threshold controls and side drawer details
**Depends on**: Phase 3, Phase 4
**Requirements**: VIBE-01, VIBE-02, VIBE-03, VIBE-04, VIBE-05, VIBE-06, VIBE-07, VIBE-08, VIBE-09, VIBE-10, VIBE-11
**Success Criteria** (what must be TRUE):
  1. User can create multiple named scanners of three types (RFPs, Board Meetings, Buyers) from a scanner list page
  2. Each scanner has an AI-generated search query and customizable AI columns with per-column scoring
  3. AI batch-scores all entities across all AI columns using Claude Haiku, with real-time progress display
  4. Table view shows entity-first data columns plus AI columns with color-coded scores and reasoning
  5. User can adjust a score threshold slider (1-10, 0.1 increments) and rows below threshold appear with reduced opacity or are hidden, with a visual divider
  6. Clicking an AI cell opens a side drawer with full response, reasoning, and metadata
  7. User can add custom AI columns with any prompt and see results auto-populate
**Plans**: 6 plans

Plans:
- [x] 05-01-PLAN.md -- Scanner model (multi-type, AI columns, per-column scores), CRUD APIs, AI query generation
- [x] 05-02-PLAN.md -- Scanner list page, type-selection creation modal, AI-generated query form, sidebar nav update
- [x] 05-03-PLAN.md -- Scanner table view with entity-first columns per type, scanner store, header toolbar
- [x] 05-04-PLAN.md -- Batch scoring SSE engine with Claude Haiku prompt caching, per-column scoring, async generator
- [x] 05-05-PLAN.md -- Custom AI columns modal, scoring integration in table, per-cell loading states, Score All flow
- [x] 05-06-PLAN.md -- Threshold slider + hide/dim toggle, score divider, AI cell side drawer, progress bar, final polish

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
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md -- ContactReveal model, buyer APIs (list+detail), credit APIs (balance+history), Zustand credit store, sidebar credit balance with popover
- [x] 06-02-PLAN.md -- Buyers list table page, buyer profile page with header and 4 tabs (Contracts, Contacts, Signals, Attributes), contact cards with blur effect
- [x] 06-03-PLAN.md -- Contact reveal API (atomic credit deduction), unlock button, blur-to-reveal animation, credit store integration, zero-balance prompt

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

| SLACK-01 | Phase 21 | Public API endpoints with API key auth |
| SLACK-02 | Phase 21 | API key management UI in settings |
| SLACK-03 | Phase 21 | User-scoped API key access |
| SLACK-04 | Phase 21 | OpenClaw TendHunt SKILL.md |
| SLACK-05 | Phase 21 | OpenClaw deploy on Hetzner + Slack config |
| SLACK-06 | Phase 21 | Add to Slack OAuth button |
| SLACK-07 | Phase 21 | Slack bot responds to procurement queries |
| SLACK-08 | Phase 21 | API rate limiting and request logging |

| CRM-01 | Phase 22 | Kanban board with 5 procurement columns |
| CRM-02 | Phase 22 | CRM cards reference any entity type |
| CRM-03 | Phase 22 | Drag-and-drop stage management |
| CRM-04 | Phase 22 | "Send to CRM" from entity pages |
| CRM-05 | Phase 22 | Scanner auto-send rules |
| CRM-06 | Phase 22 | Card entity summary display |
| CRM-07 | Phase 22 | Notes/comments on cards |
| CRM-08 | Phase 22 | Link back to source entity |

| DPS-01 | Phase 33 | Contract schema contractMechanism field |
| DPS-02 | Phase 33 | Data-sync mapper classifies by mechanism |
| DPS-03 | Phase 33 | Backfill script for existing contracts |
| DPS-04 | Phase 33 | Contract list mechanism badge + DPS-aware status |
| DPS-05 | Phase 33 | Contract detail procurement mechanism section |
| DPS-06 | Phase 33 | Adaptive CTA based on mechanism type |
| DPS-07 | Phase 33 | Sculptor AI DPS/Framework awareness |
| DPS-08 | Phase 33 | Contract list mechanism filter |

**Coverage: 70/70 requirements mapped. No orphans.**

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

Note: Phase 3 (Onboarding) can run in parallel with Phase 2 (Data Pipeline) since they share only the Phase 1 dependency. Phase 7 (Buying Signals) and Phase 8 (Landing/Pricing) can also run in parallel after their dependencies are met.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | ✓ Complete | 2026-02-10 |
| 2. Data Pipeline | 3/3 | ✓ Complete | 2026-02-11 |
| 3. Onboarding & Company Profile | 2/2 | ✓ Complete | 2026-02-11 |
| 4. Contract Dashboard | 2/2 | ✓ Complete | 2026-02-11 |
| 5. Vibe Scanner | 6/6 | ✓ Complete | 2026-02-11 |
| 6. Buyer Intelligence & Credits | 3/3 | ✓ Complete | 2026-02-11 |
| 7. Buying Signals | 0/1 | Not started | - |
| 8. Landing & Pricing | 0/2 | Not started | - |
| 13. Buyer Data Enrichment | 6/6 | ✓ Complete | 2026-02-11 |
| 14. Buyer Explorer Filters | 3/3 | ✓ Complete | 2026-02-12 |
| 17. Dashboard Home | 0/? | Not started | - |
| 18. Admin Panel | 4/4 | ✓ Complete | 2026-02-12 |
| 19. Research Agent Chat Panel | 4/4 | ✓ Complete | 2026-02-12 |
| 20. Board Minutes Signals | 4/4 | ✓ Complete | 2026-02-12 |
| 21. Slack Integration (OpenClaw) | 0/? | Not started | - |
| 22. CRM Pipeline (Procurement Inbox) | 5/5 | ✓ Complete | 2026-02-13 |
| 33. DPS & Framework Status Intelligence | 0/3 | Not started | - |

### Phase 9: Enhance Onboarding: Auto Logo Extraction + AI Analysis Animations

**Goal:** Auto-extract company logo from LinkedIn/website during profile generation and add animated step-by-step AI analysis progress (replaces basic Loader2 spinner) for the investor demo
**Depends on:** Phase 3
**Plans:** 2 plans

Plans:
- [x] 09-01-PLAN.md -- Logo auto-extraction from LinkedIn Apify response + website og:image, logoUrl threading through API/model/actions
- [x] 09-02-PLAN.md -- AI analysis progress component with conditional animated steps, wire logo + progress into onboarding wizard, logo avatar in profile review

### Phase 10: Live Data Pipeline
**Goal:** Continuously sync all UK procurement data from Find a Tender and Contracts Finder APIs into MongoDB via a Cloudflare Worker cron job running hourly, with full historical backfill, auto-extraction of buyer organizations, and sync progress tracking
**Depends on:** Phase 2
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Cloudflare Worker runs hourly via cron trigger, fetching new contracts from both FaT and CF APIs
  2. Full historical backfill completes automatically across multiple Worker runs (chunked, resumable)
  3. Both API sources stored with source attribution, keeping both when contracts overlap
  4. New buyer organizations auto-extracted from incoming contract data and added to buyers collection
  5. Sync progress tracked in MongoDB syncJobs collection (last run, records fetched, errors, cursor position)
  6. Rate limits respected (max ~6 req/min) with exponential backoff on 429 responses
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md -- Worker scaffold, TypeScript types, native MongoDB driver, OCDS mapper port, DB operations (contracts/buyers/sync-jobs), core sync engine with resumable chunked backfill
- [x] 10-02-PLAN.md -- Rate limiter, FaT + CF API clients with pagination, Worker scheduled handler wiring both sources, hourly cron trigger

### Phase 11: Invoice & Spend Data Intelligence

**Goal:** Ingest local authority transparency spending data (over £500 CSV reports) to identify which buyers are SME-friendly, show spend patterns on buyer profiles, and surface procurement opportunities from historical invoice data
**Depends on:** Phase 6
**Plans:** 6 plans

Plans:
- [x] 11-01-PLAN.md -- Models (SpendTransaction, SpendSummary) + spend-ingest Cloudflare Worker scaffold with 4-stage pipeline engine
- [x] 11-02-PLAN.md -- Stage 1 (transparency page discovery via Claude Haiku) + Stage 2 (CSV link extraction)
- [x] 11-03-PLAN.md -- CSV normalization library (10 known schemas + AI fallback) + Stage 3 (download/parse) + Stage 4 (aggregation)
- [ ] 11-04-PLAN.md -- Install Recharts + shadcn chart, spending API route, spend analytics engine, chart components + spending tab shell
- [ ] 11-05-PLAN.md -- Vendors table, breakdown table with filters, opportunity cards, Spending tab integration into buyer profile
- [x] 11-06-PLAN.md -- GOV.UK two-level scraping (buyer filtering + publication page following) + ODS/XLSX parsing via SheetJS

**Reference specs:** `.planning/DATA_SOURCES.md`

### Phase 12: Settings & Company Profile Management

**Goal:** Replace the Settings placeholder page with a full company profile editor showing all AI-generated profile data for review/editing, and restructure the sidebar to show the user's company logo/name at the top with TendHunt branding moved to the footer
**Depends on:** Phase 3, Phase 9
**Plans:** 3 plans

Plans:
- [ ] 12-01-PLAN.md — API infrastructure: profile GET/PATCH, logo upload/re-extract, document delete, sonner toasts
- [ ] 12-02-PLAN.md — Settings page: auto-save form with 3 sections (Company Info, AI Profile, Documents), TagInput extraction, logo upload component
- [ ] 12-03-PLAN.md — Sidebar restructure: company header with logo/name at top, TendHunt branding in footer, event-driven logo refresh

### Phase 13: Buyer Data Enrichment

**Goal:** Enrich 2,384 UK public sector buyers with deep intelligence data via a 6-stage pipeline (classification, governance URLs, ModernGov API, website scraping, key personnel, financial data). Creates 4 new MongoDB collections (DataSource, BoardDocument, KeyPersonnel, EnrichmentJob), extends Buyer schema with enrichment fields, and builds a Cloudflare Worker enrichment pipeline with cursor-based resumability
**Depends on:** Phase 2, Phase 6
**Success Criteria** (what must be TRUE):
  1. DataSource collection seeded with 2,368 UK public sector orgs from DATA_SOURCES spec (councils, NHS trusts, ICBs, fire/rescue, police, combined authorities, national parks)
  2. Fuzzy name matching classifies all 2,384 buyers by orgType (local_council, nhs_trust_acute, nhs_trust_mental_health, icb, fire_rescue, police, university, etc.)
  3. Buyer model extended with enrichment fields (orgType, democracyPortalUrl, democracyPlatform, boardPapersUrl, staffCount, annualBudget, enrichmentScore, enrichmentSources, lastEnrichedAt)
  4. Governance portal URLs mapped for 676+ Tier 0 orgs (councils, NHS trusts, ICBs) with URL verification
  5. ModernGov SOAP API client retrieves committees, meetings, and board minutes for councils with moderngov platform
  6. BoardDocument collection stores downloaded documents with R2 storage URLs and text extraction status
  7. KeyPersonnel collection stores board members and procurement leads extracted from governance pages via Claude Haiku
  8. EnrichmentJob collection tracks pipeline progress with cursor-based resumability, batch processing, and error logs
  9. Cloudflare Worker runs enrichment pipeline on daily cron with rate limiting per domain
  10. Buyer profile UI displays enrichmentScore, enrichmentSources, board documents tab, and key personnel
**Plans**: 6 plans

**Reference specs:** `.planning/DATA_SOURCES.md`
**Research notes:** `files/research_notes/uk_public_sector_data_sources.md`, `files/research_notes/scraping_enrichment_strategies.md`, `files/research_notes/enrichment_pipeline_best_practices.md`

Plans:
- [x] 13-01-PLAN.md — Models + DataSource seeding: 4 new Mongoose models, Buyer schema extension, seed script for 2,368 orgs
- [x] 13-02-PLAN.md — Enrichment Worker scaffold + Stage 1 (classification): Worker project, MongoDB client, Fuse.js fuzzy matching
- [x] 13-03-PLAN.md — Stage 2 (governance URLs) + Stage 3 (ModernGov SOAP): URL propagation, SOAP client, meeting discovery
- [x] 13-04-PLAN.md — Stage 4 (website scraping) + Stage 5 (key personnel): NHS/ICB governance scraping, Claude Haiku extraction
- [x] 13-05-PLAN.md — Stage 6 (enrichment scoring) + pipeline wiring: enrichment score computation, all 6 stages wired
- [x] 13-06-PLAN.md — Buyer profile UI enhancement: enrichment badge, Board Documents tab, Key Personnel tab, extended header

### Phase 14: Buyer Explorer Filters & Data Visibility

**Goal:** Enhance the buyers page with filter dropdowns (sector, orgType, region), show enrichment data columns (orgType, enrichment score, website), remove credit-gating lock/unlock status, and display all buyer data freely. Add server-side filtering to the buyers API. Keep the existing HTML table (buyer-table.tsx), don't migrate to scanner grid.
**Depends on:** Phase 13
**Plans:** 3 plans

Plans:
- [x] 14-01-PLAN.md -- Server-side filtering backend: extend BuyerFilters, MongoDB query conditions, filters API endpoint, remove ContactReveal dependency
- [x] 14-02-PLAN.md -- Remove credit gating UI + add enrichment columns: drop Locked/Unlocked status, remove blur/unlock from contacts, add orgType/score/website table columns
- [x] 14-03-PLAN.md -- Filter dropdowns UI + page wiring: BuyerFilters component, pass filter params through page, serialize enrichment fields, filtered count display

### Phase 15: Contract-Buyer Entity Linking & Region Humanization

**Goal:** Connect contracts to buyer entities via ObjectId reference (replacing fragile buyerName string matching), humanize NUTS region codes to readable names across the entire platform, and enhance the contract detail page with a buyer intelligence section linking to the buyer profile
**Depends on:** Phase 10, Phase 13, Phase 14
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md -- NUTS region mapping module, Contract schema buyerId field, data-sync worker forward-write buyerIdMap, backfill script
- [ ] 15-02-PLAN.md -- fetchContractById buyer join, contract detail buyer intelligence section, region humanization across all UI, buyerId-based queries

### Phase 16: Scanner UX Polish

**Goal:** Remove threshold/dim controls from scanners, redesign filter toolbar with Notion-style chip filters (applied filter chips, add filter, clear filters), add double-click navigation (buyer rows → buyer detail page, contract rows → contract detail page, AI cells → AI-only drawer), and add polished animations for AI score completion and filter chip transitions
**Depends on:** Phase 5, Phase 15
**Plans:** 3 plans

Plans:
- [ ] 16-01-PLAN.md -- Remove threshold/dim controls, create Notion-style filter chip toolbar
- [ ] 16-02-PLAN.md -- Double-click navigation: data cells → entity pages, AI cells → AI drawer
- [ ] 16-03-PLAN.md -- AI score completion pop animation, filter chip CSS transitions

### Phase 17: Dashboard Home

**Goal:** Replace the generic dashboard with a personalized home page featuring an account manager card (Matt, email, "Book a meeting" CTA via Calendly), a saved scanners section showing the user's scanners with latest activity, and a fresh signals feed aggregating recent high-value results from the user's active scanners. Inspired by Tussell's dashboard pattern with quick-link cards and saved data sections.
**Depends on:** Phase 4, Phase 5
**Plans:** TBD

Plans:
- [ ] TBD (run /gsd:plan-phase 17 to break down)

### Phase 18: Admin Panel

**Goal:** Build a separate Next.js admin app (`apps/admin/`) providing operational visibility into the TendHunt platform: worker health monitoring (data-sync, enrichment, spend-ingest), recently ingested data (contracts, buyers, signals), and user management with key metrics
**Depends on:** Phase 10, Phase 11, Phase 13
**Plans:** 4 plans

Plans:
- [x] 18-01-PLAN.md -- Admin app scaffold: Next.js 16.1, Clerk admin role guard, sidebar layout, MongoDB connection, shadcn/ui components
- [x] 18-02-PLAN.md -- Overview dashboard + worker health monitoring: stats cards, worker status cards with stage breakdowns, recent activity feed, 15s polling
- [x] 18-03-PLAN.md -- Data explorer pages: recent contracts/buyers/signals tables with sortable columns, total counts, source badges, 30s polling
- [x] 18-04-PLAN.md -- Users management page: Clerk user list enriched with MongoDB data (company profiles, credit balances), summary stats

### Phase 19: Research Agent Chat Panel

**Goal:** Build a conversational AI research agent as a right-side slide-out panel accessible from any page. The agent can query all TendHunt data (buyers, contracts, signals, personnel, spending, board docs) via Claude Sonnet tool-use, perform web research, and take actions (create scanners, apply filters, add AI columns). Conversations persist to MongoDB across sessions. Context-aware with suggested prompts based on current page/entity.
**Depends on:** Phase 5, Phase 6, Phase 11
**Requirements**: AGENT-01 through AGENT-12 (see .planning/output.md)
**Success Criteria** (what must be TRUE):
  1. Right-side slide-out panel opens from a persistent trigger button in the global header on all dashboard pages
  2. Panel is context-aware — knows which page, scanner, buyer, contract, or selected row the user is viewing
  3. 9 read-only tools query all internal data collections (buyers, contracts, signals, personnel, spend, board docs, buyer/contract detail, web search)
  4. 3 write tools allow the agent to create scanners, apply filters, and add AI columns — with UI state sync
  5. Streaming responses with tool call indicators ("Searching 2,384 buyers..." → "Found 47 matches")
  6. Conversations persist to MongoDB (`ChatConversation` collection) and can be resumed across sessions
  7. Context-aware suggested prompts appear when conversation is empty, based on current page
  8. Sonnet model used for strong tool-use reasoning
  9. All queries free (no credit cost) for hackathon
**Plans:** 4 plans

Plans:
- [x] 19-01-PLAN.md -- ChatConversation model, system prompt builder, 12 tool definitions + handlers, SSE API route with tool-use loop
- [x] 19-02-PLAN.md -- AgentProvider context, Zustand store, Sheet panel UI, message components, input, suggested actions, header trigger
- [x] 19-03-PLAN.md -- useAgent SSE hook, page context setters (scanner/buyer/contract/dashboard), conversation persistence
- [x] 19-04-PLAN.md -- Keyboard shortcut (Cmd+K), animations, typing indicator, safe markdown (DOMPurify), error handling + retry

### Phase 20: Board Minutes Signal Extraction

**Goal:** Build a new Cloudflare Worker (`apps/workers/board-minutes/`) that processes existing BoardDocument records for Tier 0 buyers, extracts structured buying signals (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY) using Claude Haiku, stores them as Signal records linked to buyers, and displays them in a new "Signals" tab on the buyer profile page. Leverages patterns from the board-minutes-intelligence reference project at `/Users/kirillkozak/Projects/board-minutes-intelligence`.
**Depends on:** Phase 13 (Buyer Data Enrichment), Phase 6 (Buyer Intelligence)
**Requirements**: SGNL-01, SGNL-02, SGNL-03, SGNL-04, SGNL-05
**Success Criteria** (what must be TRUE):
  1. New Cloudflare Worker (`board-minutes`) processes BoardDocument records with extracted text content for Tier 0 buyers
  2. Text chunking splits large documents into 4,000-char chunks with overlap for LLM processing
  3. Claude Haiku extracts structured signals with 6 types (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY), confidence scores, summaries, quotes, and entities
  4. Signal records stored in MongoDB `signals` collection linked to buyerId + documentId + meetingDate
  5. Deduplication prevents duplicate signals from re-processing same documents
  6. Worker runs on cron schedule + supports single-buyer on-demand processing via `/run-buyer?id=X`
  7. Buyer profile page displays extracted signals in the existing Signals tab with type badges, confidence indicators, and entity tags
  8. Enrichment worker chains to board-minutes worker after Stage 6 (scrape) completes
  9. Scanner grid can display signal data for "Board Meetings" scanner type
**Plans:** 4 plans

Plans:
- [x] 20-01-PLAN.md -- Worker scaffold: project config, types, DB helpers, pipeline engine, HTTP routes, cron handler
- [x] 20-02-PLAN.md -- Schema extensions (Signal + BoardDocument), enrichment worker chaining, signal buyerId query fix
- [x] 20-03-PLAN.md -- Signal extraction stage (chunking, Claude Haiku, JSON parsing, upsert) + deduplication stage
- [x] 20-04-PLAN.md -- SignalsTab frontend: type filter pills, confidence indicators, quote display, entity badges, animations

### Phase 21: Slack Integration (OpenClaw)

**Goal:** Bring TendHunt's procurement intelligence to Slack via OpenClaw — users click "Add to Slack" in TendHunt settings, and a managed bot responds to procurement queries (search buyers, contracts, signals, spending) using user-scoped API keys that call public REST endpoints wrapping existing tool handlers
**Depends on:** Phase 19 (Research Agent Chat Panel — provides the tool handlers to wrap)
**Requirements**: SLACK-01, SLACK-02, SLACK-03, SLACK-04, SLACK-05, SLACK-06, SLACK-07, SLACK-08
**Success Criteria** (what must be TRUE):
  1. Public REST API endpoints exist at `/api/public/*` wrapping all existing tool handlers (buyers, contracts, signals, personnel, spend, board docs) with API key auth middleware
  2. User can generate, view, and revoke API keys from a new "API Keys" section in TendHunt settings page
  3. Each API key is scoped to the user — all queries return data filtered by their account and permissions
  4. OpenClaw TendHunt skill (SKILL.md) defines all curl commands for the public API with correct parameters
  5. OpenClaw daemon is deployed on Hetzner VPS with Slack channel configured (socket mode)
  6. "Add to Slack" OAuth button in TendHunt settings connects user's workspace to the managed OpenClaw bot
  7. Slack bot responds to procurement queries (search buyers, contracts, signals, spending) using the user's API key
  8. API endpoints enforce rate limiting (100 req/min per key) and log requests
**Plans:** TBD

### Phase 22: CRM Pipeline (Procurement Inbox)

**Goal:** Build a procurement CRM/Inbox as a top-level sidebar section where users manage deal flow through a Kanban board. All entity types (contracts, signals, buyers, scanner results) can become CRM cards via manual add ("Send to CRM" buttons on entity pages) or configurable auto-send rules (scanner AI column thresholds). Cards flow through procurement-specific stages: New → Qualified → Preparing Bid → Submitted → Won / Lost. Inspired by Getmany's Master Inbox Kanban pattern using @dnd-kit drag-and-drop.
**Depends on:** Phase 5 (Scanners), Phase 6 (Buyers), Phase 20 (Signals)
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07, CRM-08
**Success Criteria** (what must be TRUE):
  1. New "Inbox" top-level sidebar item opens the CRM Kanban board view
  2. Kanban board displays 6 columns (New, Qualified, Preparing Bid, Submitted, Won, Lost) with drag-and-drop card movement using @dnd-kit
  3. CRM cards can reference any entity type: contracts, signals, buyers — with source attribution
  4. "Send to CRM" button on contract detail, buyer detail, and scanner entity sheet creates a new CRM card in "New" column
  5. Scanner auto-send rules can be configured per AI column (e.g., "send to CRM when score > 7") and auto-create CRM cards
  6. Each CRM card shows entity summary (title, buyer/org, value, source type badge), stage, and timestamps
  7. Users can add notes/comments to CRM cards for tracking bid preparation progress
  8. CRM cards maintain a link back to the source entity for quick navigation
**Plans:** 5 plans

Plans:
- [x] 22-01-PLAN.md -- Models (PipelineCard, PipelineCardNote), stage constants, types, API routes (CRUD, reorder, notes)
- [x] 22-02-PLAN.md -- Kanban board UI: @dnd-kit DndContext, columns, cards, drag overlay, Zustand store, sidebar nav, breadcrumb
- [x] 22-03-PLAN.md -- "Send to Inbox" button component + integration into contract, buyer, and scanner entity pages
- [x] 22-04-PLAN.md -- Card detail sheet with notes/comments, priority controls, source entity link, archive/delete actions
- [x] 22-05-PLAN.md -- Scanner auto-send rules: AutoSendRule model, config dialog, scoring endpoint integration

### Phase 30: Sculptor AI Homepage & Floating Assistant

**Goal:** Transform the dashboard home into an AI-first experience centered around "Sculptor" — TendHunt's procurement AI assistant. The homepage features a hero prompt area (inspired by Google AI Studio / Gemini) with an animated Sculptor starburst icon, welcome greeting, prominent chat input, and recent conversation history. On all other pages, Sculptor appears as an animated floating bubble (bottom-right) that, when clicked, smoothly transitions into the existing right-side Sheet panel. Replaces the current header trigger button with the floating bubble pattern.
**Depends on:** Phase 19 (Research Agent Chat Panel), Phase 17 (Dashboard Home)
**Success Criteria** (what must be TRUE):
  1. Dashboard home page shows "Welcome back, {name}" with animated Sculptor starburst icon above a hero chat input area
  2. Sculptor starburst icon has a subtle idle animation (slow rotation/pulse) and an active animation when AI is processing
  3. Hero chat input on homepage opens the right-side Sheet panel and starts a conversation when user types + submits
  4. "Jump back in" section shows recent conversations from MongoDB with timestamps
  5. On all non-home pages, Sculptor appears as a floating bubble (bottom-right corner) with the starburst icon
  6. Clicking the floating bubble smoothly animates it transitioning to the right-side Sheet panel (expand + slide)
  7. When Sheet panel is closed, the bubble reappears with reverse animation
  8. The floating bubble has a subtle breathing/pulse animation when idle
  9. All animations respect prefers-reduced-motion
**Plans:** 4 plans

Plans:
- [ ] 30-01-PLAN.md -- SculptorIcon component, CSS animations, FloatingBubble, layout integration, branding rename to Sculptor
- [ ] 30-02-PLAN.md -- Server-side getRecentConversations query, SculptorHeroInput component
- [ ] 30-03-PLAN.md -- SculptorHomepage client component, RecentConversations cards, dashboard page restructure
- [ ] 30-04-PLAN.md -- Visual verification checkpoint (24-point checklist)

### Phase 33: DPS & Framework Status Intelligence

**Goal:** Add procurement mechanism awareness (DPS, Framework Agreement, Call-off) to the contract data model and UI, so suppliers see accurate status intelligence instead of misleading OPEN/CLOSED binaries. Fix Sculptor AI to explain DPS reopening windows correctly.
**Depends on:** Phase 10 (data-sync worker), Phase 4 (contract dashboard)
**Requirements**: DPS-01, DPS-02, DPS-03, DPS-04, DPS-05, DPS-06, DPS-07, DPS-08
**Success Criteria** (what must be TRUE):
  1. Contract schema has `contractMechanism` enum field derived from OCDS data
  2. Data-sync mapper classifies contracts by mechanism during ingestion
  3. Backfill script sets `contractMechanism` on existing ~60k contracts
  4. Contract list shows mechanism badge (DPS/Framework) and DPS-aware status colors
  5. Contract detail page shows procurement mechanism section with DPS/Framework context
  6. "Apply" CTA adapts to mechanism type (apply/join DPS/monitor for reopening/framework members only)
  7. Sculptor AI system prompt updated with DPS/Framework awareness
  8. Contract list adds mechanism filter dropdown
**Plans:** 3 plans

Plans:
- [ ] 33-01-PLAN.md -- Contract schema contractMechanism field, OCDS mapper classification logic, backfill script
- [ ] 33-02-PLAN.md -- Contract list mechanism badge, DPS-aware status colors, mechanism filter chip
- [ ] 33-03-PLAN.md -- Contract detail procurement mechanism section, adaptive CTA, Sculptor AI DPS/Framework awareness
