# Requirements: TendHunt Hackathon MVP

**Defined:** 2026-02-10
**Core Value:** Suppliers can discover relevant UK government contracts and instantly reveal buyer contacts — turning public procurement data into actionable sales intelligence through AI-powered scoring.

## v1 Requirements

Requirements for hackathon investor demo. Each maps to roadmap phases.

### Authentication & Onboarding

- [ ] **AUTH-01**: User can sign up and sign in via Clerk (email/password + social)
- [x] **AUTH-02**: User can upload company documents during onboarding (past bids, capability statements, certifications, specifications — drag & drop)
- [x] **AUTH-03**: AI analyzes uploaded documents and generates a company profile (sectors, capabilities, keywords, ideal contract description)
- [x] **AUTH-04**: User can review and edit the AI-generated company profile
- [ ] **AUTH-05**: User session persists across browser refresh
- [x] **AUTH-06**: New user receives 10 free credits on signup (signup bonus)

### Vibe Scanner (AI Contract Scoring)

- [ ] **VIBE-01**: User can create a Vibe Scanner from their AI-generated company profile
- [ ] **VIBE-02**: System generates a scoring prompt from the company profile and uploaded documents
- [ ] **VIBE-03**: User can view and edit the scoring prompt (textarea with AI suggestions)
- [ ] **VIBE-04**: AI batch-scores all matching contracts against the scoring prompt using Claude Haiku
- [ ] **VIBE-05**: Each contract displays an AI score (1-10) with reasoning (why it matches / why it doesn't)
- [ ] **VIBE-06**: User can set minimum score threshold via slider (1-10 scale, 0.1 increments)
- [ ] **VIBE-07**: Contracts below the threshold appear with reduced opacity or are hidden (toggle)
- [ ] **VIBE-08**: Score divider visually separates above/below threshold contracts in the feed
- [ ] **VIBE-09**: User can re-score contracts after editing the prompt ("Apply & Score" button)
- [ ] **VIBE-10**: Scoring progress is displayed (progress bar while AI scores contracts in batches)
- [ ] **VIBE-11**: AI also scores buyer organizations for relevance to the company profile

### Contract Dashboard

- [ ] **DASH-01**: User sees a dashboard feed of scored contracts on login (sorted by AI score)
- [ ] **DASH-02**: User can search contracts by keyword
- [ ] **DASH-03**: User can filter contracts by sector, value range, and region
- [ ] **DASH-04**: User can click a contract to view full details (title, buyer, value, dates, CPV codes, description, source URL)
- [ ] **DASH-05**: Dashboard shows total contract count and filter result count
- [ ] **DASH-06**: Contract cards show AI score badge with color coding (green/yellow/red)

### Buying Signals

- [ ] **SGNL-01**: User can view pre-tender buying signals extracted from board minutes in the dashboard
- [ ] **SGNL-02**: Signals are categorized by 6 types (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY)
- [ ] **SGNL-03**: User can filter signals by type
- [ ] **SGNL-04**: Each signal shows source organization, date, signal type, and extracted insight
- [ ] **SGNL-05**: Signals display alongside contracts in a unified feed or separate tab

### Buyer Intelligence

- [ ] **BUYER-01**: User can view buyer organization profiles (name, sector, location, recent contracts)
- [ ] **BUYER-02**: Buyer profile shows associated buying signals from board minutes
- [ ] **BUYER-03**: Buyer profile shows AI relevance score from Vibe Scanner
- [ ] **BUYER-04**: User can see list of contacts associated with a buyer organization (blurred/locked)
- [ ] **BUYER-05**: User can reveal a contact by spending 1 credit (blur-to-reveal UX)
- [ ] **BUYER-06**: Revealed contact shows name, job title, email, and public profile link
- [ ] **BUYER-07**: Previously revealed contacts remain visible without additional credit spend

### Credit System

- [ ] **CRED-01**: User can see current credit balance in the header/navigation
- [ ] **CRED-02**: Credit balance decreases by 1 when user reveals a contact
- [ ] **CRED-03**: User sees upgrade prompt when credit balance reaches 0
- [ ] **CRED-04**: Credit deduction is atomic (prevents double-spend on rapid clicks)
- [ ] **CRED-05**: User can view credit transaction history

### Monetization & Pricing

- [ ] **PRICE-01**: Landing/marketing page explains TendHunt value proposition
- [ ] **PRICE-02**: Pricing page displays 3 tiers with credit allocations (Starter, Growth, Scale)
- [ ] **PRICE-03**: Each tier shows monthly price, credit allocation, and included features
- [ ] **PRICE-04**: Upgrade CTA buttons on pricing page (link to contact/waitlist for hackathon)

### Data Pipeline

- [ ] **DATA-01**: System ingests contract notices from Find a Tender OCDS API
- [ ] **DATA-02**: System ingests contract notices from Contracts Finder API
- [ ] **DATA-03**: Ingested data is normalized to a unified contract schema in MongoDB Atlas
- [ ] **DATA-04**: Database is seeded with pre-processed board minutes signals (50-100 documents across multiple sectors)
- [ ] **DATA-05**: Database is seeded with buyer contact data from public sources (GOV.UK appointments, council committee pages, NHS board member lists)
- [ ] **DATA-06**: Contracts display source attribution (Find a Tender or Contracts Finder)

### Slack Integration (OpenClaw)

- [ ] **SLACK-01**: System exposes public REST API endpoints wrapping existing tool handlers (buyers, contracts, signals, personnel, spend, board docs) with API key authentication
- [ ] **SLACK-02**: User can generate and manage API keys from TendHunt settings page (create, revoke, view last used)
- [ ] **SLACK-03**: API key is scoped to the authenticated user — all queries return data filtered by their account, scanners, and permissions
- [ ] **SLACK-04**: OpenClaw TendHunt skill (SKILL.md) teaches the agent to curl all public API endpoints with correct parameters and auth
- [ ] **SLACK-05**: OpenClaw is deployed on Hetzner VPS with Slack channel configured (socket mode, bot token, app token)
- [ ] **SLACK-06**: User can click "Add to Slack" OAuth button in TendHunt settings to connect their Slack workspace to the OpenClaw bot
- [ ] **SLACK-07**: Slack bot responds to user queries with procurement data (search buyers, contracts, signals, spending) using the user's API key for scoped access
- [ ] **SLACK-08**: API endpoints include rate limiting (100 requests/minute per key) and request logging

## v2 Requirements

Deferred to post-hackathon. Tracked but not in current roadmap.

### Advanced Intelligence

- **INTEL-01**: Contract expiry tracking with renewal opportunity alerts
- **INTEL-02**: Competitor win tracking (who won similar contracts)
- **INTEL-03**: Custom research agents (1 credit per entity deep-dive)
- **INTEL-04**: Auto-bidding / auto-apply for high-scoring contracts

### Additional Data Sources

- **DSRC-01**: G-Cloud Digital Marketplace integration
- **DSRC-02**: CCS Framework call-off tracking
- **DSRC-03**: Council meeting minutes live scraping pipeline
- **DSRC-04**: FOI disclosure data integration
- **DSRC-05**: Companies House API integration for supplier financials

### Notifications & Alerts

- **NOTF-01**: Email digest alerts (daily/weekly) for matching contracts
- **NOTF-02**: Contract deadline reminders
- **NOTF-03**: New buyer signal alerts
- **NOTF-04**: Job change alerts (new procurement head = opportunity)

### Enterprise Features

- **ENT-01**: Team/organization accounts with shared credits
- **ENT-02**: CRM integration (Salesforce, HubSpot export)
- **ENT-03**: Custom reporting / analytics dashboards
- **ENT-04**: Bid intelligence (historical win rates, pricing benchmarks)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI bid/proposal writer | Sweetspot and Stotles own this space. Not our differentiator |
| LinkedIn scraping | Legally fragile (Proxycurl shutdown Jan 2026, UK GDPR). Use public data sources only |
| CRM integration (Salesforce/HubSpot) | Requires weeks of development. CSV export as placeholder |
| ~~Spend analytics / invoice data~~ | ~~Tussell has 10+ years of data~~ — **MOVED TO Phase 11**: Local authority transparency CSV data for SME-friendliness scoring |
| Live board minutes scraping | Multi-week infrastructure project. Use pre-processed seed data |
| FOI request automation | Full product in itself. Manual FOI is future premium feature |
| Framework matching (CCS/YPO/ESPO) | Deep domain knowledge needed. Show framework names as metadata only |
| Mobile app | B2B procurement users work on desktops. Responsive web sufficient |
| Team collaboration / multi-user | Enterprise feature. Single-user experience for MVP |
| Real-time push notifications | Email digest is table stakes. Push adds complexity for marginal value |
| Stripe payment processing | Credits granted via signup bonus. No real billing for hackathon |
| PostgreSQL / Drizzle ORM | Switched to MongoDB Atlas for flexibility and free tier |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation | Pending |
| AUTH-02 | Phase 3: Onboarding & Company Profile | Done |
| AUTH-03 | Phase 3: Onboarding & Company Profile | Done |
| AUTH-04 | Phase 3: Onboarding & Company Profile | Done |
| AUTH-05 | Phase 1: Foundation | Pending |
| AUTH-06 | Phase 3: Onboarding & Company Profile | Done |
| VIBE-01 | Phase 5: Vibe Scanner | Pending |
| VIBE-02 | Phase 5: Vibe Scanner | Pending |
| VIBE-03 | Phase 5: Vibe Scanner | Pending |
| VIBE-04 | Phase 5: Vibe Scanner | Pending |
| VIBE-05 | Phase 5: Vibe Scanner | Pending |
| VIBE-06 | Phase 5: Vibe Scanner | Pending |
| VIBE-07 | Phase 5: Vibe Scanner | Pending |
| VIBE-08 | Phase 5: Vibe Scanner | Pending |
| VIBE-09 | Phase 5: Vibe Scanner | Pending |
| VIBE-10 | Phase 5: Vibe Scanner | Pending |
| VIBE-11 | Phase 5: Vibe Scanner | Pending |
| DASH-01 | Phase 4: Contract Dashboard | Pending |
| DASH-02 | Phase 4: Contract Dashboard | Pending |
| DASH-03 | Phase 4: Contract Dashboard | Pending |
| DASH-04 | Phase 4: Contract Dashboard | Pending |
| DASH-05 | Phase 4: Contract Dashboard | Pending |
| DASH-06 | Phase 4: Contract Dashboard | Pending |
| SGNL-01 | Phase 7: Buying Signals | Pending |
| SGNL-02 | Phase 7: Buying Signals | Pending |
| SGNL-03 | Phase 7: Buying Signals | Pending |
| SGNL-04 | Phase 7: Buying Signals | Pending |
| SGNL-05 | Phase 7: Buying Signals | Pending |
| BUYER-01 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-02 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-03 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-04 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-05 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-06 | Phase 6: Buyer Intelligence & Credits | Pending |
| BUYER-07 | Phase 6: Buyer Intelligence & Credits | Pending |
| CRED-01 | Phase 6: Buyer Intelligence & Credits | Pending |
| CRED-02 | Phase 6: Buyer Intelligence & Credits | Pending |
| CRED-03 | Phase 6: Buyer Intelligence & Credits | Pending |
| CRED-04 | Phase 6: Buyer Intelligence & Credits | Pending |
| CRED-05 | Phase 6: Buyer Intelligence & Credits | Pending |
| PRICE-01 | Phase 8: Landing & Pricing | Pending |
| PRICE-02 | Phase 8: Landing & Pricing | Pending |
| PRICE-03 | Phase 8: Landing & Pricing | Pending |
| PRICE-04 | Phase 8: Landing & Pricing | Pending |
| DATA-01 | Phase 2: Data Pipeline | Pending |
| DATA-02 | Phase 2: Data Pipeline | Pending |
| DATA-03 | Phase 1: Foundation | Pending |
| DATA-04 | Phase 2: Data Pipeline | Pending |
| DATA-05 | Phase 2: Data Pipeline | Pending |
| DATA-06 | Phase 2: Data Pipeline | Pending |

| SLACK-01 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-02 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-03 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-04 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-05 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-06 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-07 | Phase 21: Slack Integration (OpenClaw) | Pending |
| SLACK-08 | Phase 21: Slack Integration (OpenClaw) | Pending |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-13 -- Added SLACK-01 through SLACK-08 for OpenClaw Slack integration (Phase 9)*
