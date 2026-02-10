# Feature Landscape

**Domain:** UK Public Sector Procurement / Sales Intelligence Platform
**Project:** TendHunt
**Researched:** 2026-02-10
**Overall Confidence:** HIGH (grounded in detailed competitive analysis + official API docs + verified competitor features)

---

## Table Stakes

Features users expect from any procurement intelligence platform. Missing = product feels incomplete and users bounce. These must be in the hackathon MVP or the demo fails.

| # | Feature | Why Expected | Complexity | Hackathon? | Notes |
|---|---------|--------------|------------|------------|-------|
| TS-1 | **Contract/Opportunity Search & Filtering** | Every competitor (Stotles, Tussell, Tenders Direct, Tenderlake) has this. Users expect to search by keyword, sector, value range, geography, and date. | Medium | YES | Core of the dashboard. Pull from Contracts Finder API + Find a Tender API. |
| TS-2 | **Email Alert Notifications** | Stotles, Tussell, Tenders Direct, Tracker all send email alerts. Users expect daily/weekly digests of matching opportunities. | Low | YES (basic) | Even a weekly digest email is sufficient for MVP. Use Resend or similar. |
| TS-3 | **Saved Search / Alert Profiles** | Users configure their interests (sectors, keywords, CPV codes) to personalize results. Stotles, Tussell, Sweetspot all have this. | Low | YES | This IS the onboarding flow. User sets preferences, system matches. |
| TS-4 | **Dashboard with Opportunity Feed** | Central feed of matched opportunities. Every single competitor has a dashboard. Without this, there is no product. | Medium | YES | The primary screen. Show matched contracts, signals, and alerts. |
| TS-5 | **Authentication & User Accounts** | Required for personalization, credit tracking, saved searches. | Low | YES | Clerk handles this entirely. Already decided. |
| TS-6 | **Buyer/Organization Profiles** | Stotles has "Buyer Intelligence" profiles showing procurement history, spend patterns, key contacts. Tussell has 360-degree account views. Users expect to click an organization and see its profile. | Medium | YES (basic) | For MVP: org name, sector, location, recent contracts, board meeting signals. Full enrichment later. |
| TS-7 | **Contract Detail View** | Click a contract, see full details: title, description, buyer, value, dates, CPV codes, linked documents. | Low | YES | Render data from Contracts Finder/Find a Tender API responses. |
| TS-8 | **Basic Relevance Scoring** | Stotles has a 0-3 Signal Score. Users expect some form of "how relevant is this to me?" beyond raw keyword match. | Medium | YES | Simple scoring based on keyword match + sector match + value range. AI scoring later. |

---

## Differentiators

Features that set TendHunt apart from competitors. Not expected by default, but create the "wow" moment for investors and early adopters. These are why someone chooses TendHunt over Stotles or Tussell.

| # | Feature | Value Proposition | Complexity | Hackathon? | Notes |
|---|---------|-------------------|------------|------------|-------|
| D-1 | **Pre-Tender Buying Signals from Board Minutes** | Core differentiator. No UK competitor systematically extracts buying signals from council/NHS board minutes. Stotles has "some" document intelligence, Tussell tracks spend after the fact. TendHunt surfaces intent 6-12 months before RFP publication. Starbridge validates this thesis with $52M funding (US only). | HIGH | YES (demo with pre-scraped data) | For hackathon: pre-process 50-100 board minutes, show extracted signals in dashboard. Do NOT build live scraping pipeline in 1 week. |
| D-2 | **6 Signal Types (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY)** | No competitor extracts all 6. Starbridge does 5/6, Stotles does 2/6, Tussell does 2/6. This breadth of signal coverage is unique. | Medium | YES (with pre-processed data) | Categorize signals by type. Show in dashboard with type filters. Data from board minutes extraction. |
| D-3 | **Credit-Based Contact Reveal (LinkedIn)** | Apollo ($47/mo) and ZoomInfo ($14K+/yr) popularized "credit per contact reveal." For public sector, this is underserved. Stotles has 210K+ contacts but behind enterprise pricing. TendHunt democratizes access with pay-per-reveal credits. | Medium | YES | Core monetization mechanic. 1 credit = 1 contact reveal. Show LinkedIn profile link + role + email. Critical for investor demo (shows revenue model). |
| D-4 | **Opportunity Matching / AI Qualification** | Go beyond keyword search. Match user's company profile (sectors, capabilities, past wins) against opportunities using AI. Stotles does this with "Signal Score." TendHunt does it with pre-tender signals, which is earlier in the funnel. | HIGH | PARTIAL | For hackathon: basic matching (sector + keyword + value range). Full AI matching is post-MVP. |
| D-5 | **SME-Friendly Pricing (from ~50 GBP/month)** | Stotles starts at ~50 GBP but quickly escalates. Tussell is enterprise-only. Tenders Direct is 2,518 GBP/year. TendHunt targets the underserved SME segment with transparent, self-serve pricing. | Low | YES | Pricing page with clear tiers. Critical for investor demo to show market positioning. |
| D-6 | **Multi-Sector Coverage (NHS, ICBs, Police, Fire, National Parks)** | Only TendHunt covers 676+ organizations across 7 sectors. Stotles covers local gov + some NHS. Tussell covers more but at premium price. Nobody covers Police/Fire/National Parks systematically via board minutes. | Medium | YES (show in data) | Pre-process signals from multiple sectors to show breadth in demo. |
| D-7 | **Credit-Based Research Entity System** | "1 credit = 1 deep research on an organization" -- AI generates comprehensive buyer profile, recent board decisions, contract history, key contacts. No competitor offers on-demand AI research per entity. | HIGH | PARTIAL | Show the concept: click "Research" on an org, get AI-generated briefing. For hackathon, can be semi-manual/cached. |
| D-8 | **Contract Expiry Tracking & Renewal Alerts** | Stotles tracks 100K+ expiring contracts. Tussell does framework matching to call-off contracts. TendHunt can combine board minutes signals with contract expiry data: "This council's IT contract expires in 6 months AND their board just discussed a digital transformation strategy." | Medium | NO (post-MVP) | Requires correlating two data sources. Great V2 feature. |

---

## Anti-Features

Features to explicitly NOT build during the hackathon. Building these would waste time, dilute focus, or compete directly with entrenched competitors.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| AF-1 | **AI Proposal/Bid Writer** | Sweetspot and Stotles ("Bid Studio") own this space. Sweetspot has AI form-fill, auto-generated compliance matrices. Building even a basic version takes weeks and competes on their turf. | Focus on finding opportunities earlier, not writing bids for them. |
| AF-2 | **Full CRM Integration (Salesforce/HubSpot)** | Starbridge, Stotles, and Tussell all have deep CRM integrations. Building these in a hackathon is impossible. Salesforce integration alone requires weeks of development and certification. | Show an "Export to CSV" button and a webhook/Zapier placeholder. CRM is a V2 feature. |
| AF-3 | **Spend Analytics / Invoice-Level Data** | Tussell owns this with 5 trillion GBP of spend data and 100M+ invoice lines. Cannot compete with 10 years of historical data. | Use board minutes for forward-looking signals, not backward-looking spend. |
| AF-4 | **Live Board Minutes Scraping Pipeline** | Scraping 676 organizations in real-time requires robust infrastructure, error handling, rate limiting, PDF parsing, and weeks of testing. ModernGov SOAP API alone has edge cases across 300+ councils. | Pre-scrape 50-100 board minutes before the hackathon. Load as seed data. Show the dashboard experience, not the pipeline. |
| AF-5 | **FOI Request Automation** | Stotles offers FOI services on their Expert plan. Building FOI request generation, tracking, and response parsing is a full product in itself. | Manual FOI can be a future premium feature. |
| AF-6 | **Framework Matching** | Tussell's unique feature: matching call-off contracts to framework agreements. Requires deep knowledge of CCS frameworks and contract structures. | Simply show framework names as metadata on contracts. No matching logic. |
| AF-7 | **Mobile App** | No competitor has a mobile app. Web-only is fine for this market. B2B procurement users work on desktops. | Responsive web design is sufficient. |
| AF-8 | **Team Collaboration / Multi-User Workflows** | Task assignment, shared workspaces, bid/no-bid collaborative scorecards -- these are enterprise features. | Single-user experience for MVP. Team features V2. |
| AF-9 | **Real-Time Notifications (Push/WebSocket)** | Email alerts are table stakes. Push notifications and real-time feeds add engineering complexity for marginal demo value. | Email digest is sufficient. Show "notification preferences" in settings for the vision. |
| AF-10 | **Custom Reporting / Analytics Dashboards** | Tussell and Stotles offer custom reports and TAM analysis at enterprise tier. | Show basic stats (number of signals, opportunities by sector). No report builder. |

---

## Feature Dependencies

```
Authentication (TS-5) --> Everything (all features require user context)
    |
    +--> Saved Search Profiles (TS-3) --> Email Alerts (TS-2)
    |                                     (alerts require saved preferences)
    |
    +--> Credit System (D-3) --> Contact Reveal (D-3)
    |                        --> Research Entity (D-7)
    |                        (credits gate premium actions)
    |
    +--> Dashboard (TS-4) --> Opportunity Feed (TS-4)
    |                     --> Signal Feed (D-1, D-2)
    |                     --> Search & Filter (TS-1)
    |
    +--> Buyer Profiles (TS-6) --> Contract Detail (TS-7)
    |                          --> Contact Reveal (D-3)
    |                          --> Research Entity (D-7)
    |
    +--> Data Ingestion (pre-hackathon) --> Board Minutes Signals (D-1)
    |                                  --> Contract Data (TS-1, TS-7)
    |                                  (SEED DATA required before demo)
    |
    +--> Relevance Scoring (TS-8) --> Opportunity Matching (D-4)
                                     (basic scoring before AI matching)
```

### Critical Path for Hackathon

```
Day 1-2: Auth (Clerk) + Data Seeding (pre-processed board minutes + API data)
Day 2-3: Dashboard + Opportunity Feed + Search/Filter
Day 3-4: Buyer Profiles + Signal Display (6 types)
Day 4-5: Credit System + Contact Reveal
Day 5-6: Email Alerts + Relevance Scoring
Day 6-7: Polish, Pricing Page, Investor Demo Flow
```

---

## MVP Recommendation (1-Week Hackathon)

### MUST BUILD (Demo Fails Without These)

1. **Dashboard with Opportunity + Signal Feed** (TS-4 + D-1 + D-2)
   - This IS the product. Show matched opportunities AND pre-tender signals from board minutes.
   - Use pre-processed seed data (50-100 board minutes across multiple sectors).
   - Filter by signal type, sector, geography, value range.

2. **Credit System + Contact Reveal** (D-3)
   - This IS the business model. Investor needs to see how TendHunt makes money.
   - Show: "You have 10 credits. Click to reveal contact. Credit deducted."
   - Contact data can be partially mocked with real LinkedIn profile links.

3. **Saved Search / Alert Profiles + Basic Email Digest** (TS-3 + TS-2)
   - Onboarding flow: "What sectors do you sell to? What keywords matter?"
   - Weekly email with matching opportunities. Even a simple template suffices.

4. **Buyer Organization Profiles** (TS-6)
   - Click an organization, see: sector, location, recent signals, recent contracts.
   - For MVP: aggregate from seed data. Shows depth of intelligence.

5. **Pricing Page** (D-5)
   - Three tiers with credit allocations. Anchor the investor conversation.
   - Free trial tier, Pro tier, Enterprise placeholder.

### SHOULD BUILD (Strengthens Demo)

6. **Basic Relevance Scoring** (TS-8)
   - Even a simple 1-5 score based on profile match makes the feed feel intelligent.

7. **Search & Filter** (TS-1)
   - Keyword search, sector filter, value range slider, date range.

8. **Contract Detail View** (TS-7)
   - Click through from feed to full contract details.

### DEFER (Post-Hackathon)

- **AI Opportunity Matching** (D-4): Requires ML pipeline. Basic scoring sufficient.
- **Research Entity System** (D-7): Can show concept with a "Coming Soon" button.
- **Contract Expiry Tracking** (D-8): Great V2 feature but needs data correlation.
- **CRM Integration** (AF-2): Show CSV export as placeholder.
- **Live Scraping Pipeline** (AF-4): Pre-processed data for demo.

---

## Investor Demo Narrative

The demo should tell this story in 3 minutes:

1. **Problem** (30s): "UK suppliers learn about government contracts when everyone else does -- at RFP publication. 45,000+ tenders/year, 434 billion GBP market, but opportunities are found too late."

2. **Solution** (60s): Show the dashboard. "TendHunt extracts buying signals from board meeting minutes 6-12 months before tenders are published. We track 676 organizations across 7 sectors."
   - Show a specific signal: "Birmingham City Council's board discussed a 2 million GBP digital transformation initiative on [date]. No RFP published yet."
   - Show 6 signal types filtering.

3. **Business Model** (30s): Click "Reveal Contact" on a buyer profile. Show credit deduction. "1 credit = 1 contact reveal. Starting at 50 GBP/month for 50 credits."

4. **Market** (30s): "434 billion GBP UK procurement market. 20% goes to SMEs. Competitors charge 10-20K/year (enterprise-only). We serve the 1,000s of SMEs locked out."

5. **Validation** (30s): "Starbridge raised $52M for this exact thesis in the US. No one does this for the UK. We have 676 organizations mapped and 6 signal types -- more than any competitor."

---

## Feature Complexity Budget (1-Week Hackathon)

| Feature | Estimated Effort | Running Total |
|---------|-----------------|---------------|
| Auth (Clerk) | 3 hours | 3h |
| Data Seeding (pre-processed) | 8 hours (pre-hackathon) | 11h |
| Dashboard + Feed UI | 12 hours | 23h |
| Search & Filtering | 6 hours | 29h |
| Buyer Profiles | 6 hours | 35h |
| Credit System (DB + UI) | 8 hours | 43h |
| Contact Reveal Flow | 4 hours | 47h |
| Saved Search / Preferences | 4 hours | 51h |
| Email Digest (basic) | 3 hours | 54h |
| Relevance Scoring (basic) | 4 hours | 58h |
| Pricing Page | 3 hours | 61h |
| Polish + Demo Flow | 5 hours | 66h |
| **TOTAL** | **~66 hours** | (~9-10 hours/day for 7 days) |

This is tight but achievable for a focused developer. The key risk is data seeding -- board minutes processing should happen BEFORE the hackathon week.

---

## Competitive Feature Gap Analysis

### Where TendHunt Wins (Hackathon MVP)

| Feature | TendHunt | Stotles | Tussell | Tenders Direct |
|---------|----------|---------|---------|----------------|
| Pre-tender signals from board minutes | YES (core) | Partial (some docs) | NO | NO |
| 6 signal types | YES | 2/6 | 2/6 | 1/6 |
| SME self-serve pricing | YES (50 GBP/mo) | YES (50 GBP/mo+) | NO (enterprise) | 2,518 GBP/yr |
| Credit-based contact reveal | YES | NO (subscription) | NO (subscription) | NO |
| 676+ UK org coverage via board minutes | YES | Partial | Partial | NO |

### Where TendHunt Loses (Acceptable for MVP)

| Feature | TendHunt (MVP) | Best Competitor |
|---------|----------------|-----------------|
| Historical data depth | New (weeks) | Tussell: 10+ years |
| CRM integration | NO | Stotles: Salesforce, HubSpot, Teams, Slack |
| Contact database size | Small (seed) | Tussell: 80K+, Stotles: 210K+ |
| Bid writing tools | NO | Stotles: Bid Studio, Sweetspot: AI Copilot |
| Framework matching | NO | Tussell: unique feature |
| Spend analytics | NO | Tussell: 5 trillion GBP |

These losses are **acceptable** because TendHunt competes on timing (6-12 months earlier) and accessibility (SME pricing), not on data volume or enterprise features.

---

## Sources

### Competitive Intelligence (HIGH confidence - primary research docs)
- Existing competitive analysis: `/specs/COMPETITIVE_ANALYSIS.md` (Jan 2026)
- Existing feature comparison: `/specs/FEATURE_COMPARISON.md` (Jan 2026)
- Existing data sources: `/specs/DATA_SOURCES.md` (Feb 2026)
- Existing UK buying signals research: `/specs/uk_buying_signals_platforms_research.md` (Jan 2026)

### Competitor Official Sources (MEDIUM confidence)
- [Stotles Platform Features](https://www.stotles.com/platform)
- [Stotles Buyer Intelligence Help](https://help.stotles.com/buyer-intelligence)
- [Stotles Pricing](https://www.stotles.com/pricing)
- [Starbridge Buying Signals Monitor](https://starbridge.ai/features/buying-signals-monitor)
- [Starbridge Series A Announcement](https://starbridge.ai/blog/starbridge-raises-42m-series-a-to-make-it-easy-for-any-business-to-sell-to-government-education)
- [Tussell Tender Portals 2026](https://www.tussell.com/insights/8-public-sector-tender-portals-you-need-to-track)

### UK Government Data APIs (HIGH confidence - official docs)
- [Contracts Finder API Documentation](https://www.contractsfinder.service.gov.uk/apidocumentation)
- [Find a Tender API Documentation](https://www.find-tender.service.gov.uk/apidocumentation)
- [Open Contracting - GOV.UK](https://www.gov.uk/government/publications/open-contracting)

### Sales Intelligence Models (MEDIUM confidence)
- [Apollo vs ZoomInfo Comparison](https://www.warmly.ai/p/blog/apollo-vs-zoominfo) - Credit system models
- [Cognism Sales Intelligence Tools](https://www.cognism.com/blog/sales-intelligence-tools) - Feature comparison

### Market / Investor Context (MEDIUM confidence)
- [SaaS MVP Development 2026](https://acropolium.com/blog/build-saas-mvp/) - What investors look for
- [Procurement Intelligence Trends 2026](https://www.spendflo.com/blog/procurement-intelligence) - Market direction
