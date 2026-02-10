# Project Research Summary

**Project:** TendHunt -- UK Procurement Intelligence Platform (Hackathon MVP)
**Domain:** Sales Intelligence / Procurement Intelligence (UK Public Sector)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

TendHunt is a procurement sales intelligence platform that surfaces UK government contract opportunities and buyer contacts to suppliers -- specifically targeting underserved SMEs. The core thesis is compelling and validated: extract buying signals from council/NHS board minutes 6-12 months before RFPs are published, giving suppliers an early-mover advantage. Starbridge raised $52M for this exact model in the US; no one does it for the UK. The recommended approach is a Next.js 16 full-stack monolith with Python scrapers as a decoupled data pipeline, backed by Neon PostgreSQL, Clerk auth, and a credit-based monetization system. The entire hackathon stack runs on free tiers ($0 cost).

The architecture follows a well-established pattern for data intelligence platforms: batch-ingest government procurement data via OCDS APIs, normalize and store in PostgreSQL, and serve through a polished React dashboard. The critical innovation is not technical but data-strategic -- board minutes analysis for pre-tender signals across 676+ organizations and 7 sectors. For the 1-week hackathon, this means pre-processing board minutes data before the build week and focusing engineering time on the dashboard experience, credit system, and investor demo flow.

The three highest risks are: (1) LinkedIn contact data sourcing is legally fragile after Proxycurl's shutdown -- use seeded data for the hackathon and evaluate compliant providers post-raise; (2) attempting to integrate all three government APIs simultaneously will result in zero working data -- start with Find a Tender only, add Contracts Finder as a stretch goal, skip G-Cloud entirely; (3) scope creep will fragment the demo -- write and freeze the 3-minute investor demo script on day 1, and ruthlessly cut anything not in that script.

## Key Findings

### Recommended Stack

The stack is optimized for hackathon speed, demo polish, and a solid foundation that does not need ripping out post-hackathon. Every technology has been verified against official sources as of February 2026. Full details in [STACK.md](./STACK.md).

**Core technologies:**
- **Next.js 16.1 (TypeScript):** Full-stack framework with App Router, React Server Components, Turbopack. Eliminates need for a separate backend. Deploy to Vercel with zero config.
- **Neon PostgreSQL (Serverless):** Instant provisioning, scale-to-zero, free tier (100 CU-hours/month, 0.5GB). Database branching for dev. No VPC/RDS setup time.
- **Drizzle ORM 0.45.x:** SQL-first, schema-as-code, 7.4kb bundle (critical for serverless cold starts). No codegen step unlike Prisma. Push schema, query immediately.
- **Clerk:** Pre-built auth components, 10K MAU free tier, webhook sync to DB. 15 minutes to integrate.
- **shadcn/ui + Tailwind CSS 4.1:** Production-quality dashboard components (Table, Card, Badge, Dialog) with zero-dependency model. Copy into codebase, customize freely.
- **Scrapy 2.14 + Playwright 1.58 (Python):** Industry-standard scraping for government APIs and JS-rendered council sites. Separate runtime from Next.js.
- **Stripe (test mode):** Credit purchase infrastructure ready but using test keys. No PCI compliance needed for demo.
- **Inngest:** Zero-infrastructure background jobs that deploy with your Next.js app. Cron, retries, event-driven. 25K free runs/month.

**Critical version note:** Tailwind v4 uses CSS-first config (no tailwind.config.js). shadcn/ui is compatible with unified `radix-ui` package. These are breaking changes from tutorials using older versions.

**What NOT to use:** Prisma (codegen overhead), Supabase (overlaps with Clerk + API routes), Redux (overkill), tRPC (unnecessary for single app), MongoDB (relational data needs PostgreSQL), Express (Next.js API routes suffice), Docker (setup time wasted for hackathon).

### Expected Features

Research identified 8 table stakes features, 8 differentiators, and 10 anti-features. The competitive landscape includes Stotles, Tussell, Tenders Direct, Tenderlake, and Sweetspot. Full analysis in [FEATURES.md](./FEATURES.md).

**Must have (table stakes -- demo fails without these):**
- Dashboard with opportunity + signal feed (TS-4, D-1, D-2) -- the core product experience
- Credit system + contact reveal (D-3) -- the business model demonstration
- Saved search / alert profiles (TS-3) -- the onboarding and personalization hook
- Buyer organization profiles (TS-6) -- depth of intelligence on display
- Pricing page with 3 tiers (D-5) -- anchors the investor conversation

**Should have (strengthens demo):**
- Basic relevance scoring (TS-8) -- makes the feed feel intelligent, not just a data dump
- Contract search and filtering (TS-1) -- keyword, sector, value range, geography
- Contract detail view (TS-7) -- click-through from feed to full details

**Defer (v2+):**
- AI opportunity matching (D-4) -- requires ML pipeline, basic scoring suffices
- Research entity system (D-7) -- show "Coming Soon" button
- Contract expiry tracking + renewal alerts (D-8) -- needs data correlation across sources
- CRM integration (AF-2) -- CSV export as placeholder
- Live board minutes scraping pipeline (AF-4) -- pre-processed data for demo
- Bid writing / proposal tools (AF-1) -- Sweetspot and Stotles own this space

**Key competitive insight:** TendHunt wins on timing (6-12 months earlier via board minutes signals) and accessibility (SME pricing from ~50 GBP/month vs Tussell enterprise-only or Tenders Direct at 2,518 GBP/year). It loses on historical data depth and contact database size -- acceptable tradeoffs for a new entrant.

### Architecture Approach

The architecture is a decoupled two-runtime system: a Next.js monolith for the entire web application and Python scrapers that share only the PostgreSQL database. No message queue, no microservices, no API contract between runtimes. Server Components handle data display (zero client JS), Server Actions handle mutations (credit deduction, contact reveal), and API routes serve only external-facing endpoints (webhooks, complex search). Full details in [ARCHITECTURE.md](./ARCHITECTURE.md).

**Major components:**
1. **Data Ingestion Layer (Python)** -- Scrapy-based scrapers pull from OCDS APIs (Find a Tender, Contracts Finder), normalize to unified schema, upsert into PostgreSQL. Runs on schedule, not in response to user requests.
2. **Application Layer (Next.js)** -- Full-stack monolith with Clerk auth middleware. Server Components for reads, Server Actions for writes, API routes for webhooks. Single deployment unit on Vercel.
3. **Presentation Layer (React)** -- Dashboard with opportunity feed, signal feed, search/filter, buyer profiles, contact reveal, credit display. Built with shadcn/ui + TanStack Table + Recharts.
4. **Credit/Monetization System** -- Atomic credit deduction via PostgreSQL transactions. Ledger pattern for audit trail. For hackathon: simplified integer column with `WHERE balance >= 1` guard.
5. **Enrichment Layer (async, post-hackathon)** -- Contact enrichment via Apollo.io/Bright Data, AI relevance scoring via OpenAI. Pre-enriched/seeded for hackathon.

**Key patterns:**
- Decoupled scraper + monolith app (shared DB, no inter-service comms)
- Server Components for data display, Server Actions for mutations
- Credit ledger with optimistic locking (atomic `UPDATE ... WHERE balance >= 1`)
- Pre-fetch all external data on schedule, never in the user request path

### Critical Pitfalls

Five critical pitfalls identified, all with concrete prevention strategies. Full analysis in [PITFALLS.md](./PITFALLS.md).

1. **LinkedIn scraping becomes a legal/technical black hole** -- Do NOT build a scraper. Seed 50-100 contacts manually from public sources (GOV.UK appointments, council committee pages, NHS board lists). Build the reveal UX against seeded data. Evaluate compliant API providers (Apollo, RocketReach) post-hackathon. Decision must be made day 1, not discovered as a fallback on day 4.

2. **Three government APIs, zero working data pipeline** -- Start with Find a Tender ONLY. It has the best-documented OCDS API, covers above-threshold contracts (high-value ones investors care about), and is mandated under the Procurement Act 2023. Add Contracts Finder as stretch goal only if FaT works by day 3. Skip G-Cloud entirely (no stable API exists). Pre-seed 200-500 real notices as fallback insurance.

3. **Over-engineered credit system consumes 3 days** -- Build a "demo credit system": single integer column, decrement on reveal, show balance badge, display upgrade modal at zero. Total: 2-4 hours. Do NOT build transaction ledgers, Stripe integration, or concurrency handling during the hackathon.

4. **Scope creep through "just one more feature"** -- Write the 3-minute demo script on day 1 and freeze it. Every feature request gets asked: "Is this in the demo script?" Feature freeze is day 4. Days 5-7 are polish only.

5. **Polished UI on day 1, no data on day 5** -- Data-first build order. Days 1-2 must produce real procurement data in PostgreSQL. The acid test at any point: can you open the app and see real UK government contracts? If no, stop building UI.

## Implications for Roadmap

Based on combined research across all four files, the hackathon should be structured in 6 phases over 7 days. The ordering is driven by hard dependencies (auth before everything, data before UI) and the pitfall research (data-first, not UI-first).

### Phase 0: Project Foundation + Data Strategy
**Rationale:** Architecture research and pitfalls research both emphasize that day-1 decisions determine success. The demo script must be written, data strategy locked (seeded contacts, FaT-first), and the development environment must be ready before any feature work begins.
**Delivers:** Working Next.js project with Clerk auth, PostgreSQL schema, basic layout. Written + frozen demo script. Contact seed data prepared.
**Addresses:** TS-5 (Authentication), AF-4 decision (no live scraping)
**Avoids:** Pitfall 1 (LinkedIn black hole), Pitfall 4 (scope creep), Pitfall 5 (UI-first trap)
**Estimated effort:** 4-6 hours

### Phase 1: Data Pipeline + Seeding
**Rationale:** Pitfalls research is unanimous: data must be in the database before any meaningful UI work. This is the highest-risk phase -- if it fails, the demo shows an empty dashboard. The architecture research confirms Find a Tender OCDS API is the right starting point (public, no auth, cursor pagination, OCDS 1.1.5 standard).
**Delivers:** 200-500 real UK procurement notices in PostgreSQL from Find a Tender API. Normalizer maps OCDS to internal schema. Seeded contact data for 50-100 buyer organizations. Board minutes signal data (pre-processed) loaded.
**Addresses:** TS-1 (Contract data), TS-7 (Contract details), D-1 (Board minutes signals), D-2 (6 signal types), D-6 (Multi-sector coverage)
**Avoids:** Pitfall 2 (three APIs, zero data), Pitfall 5 (no data for UI)
**Estimated effort:** 10-14 hours (including pre-processing)

### Phase 2: Core Dashboard + Search
**Rationale:** With real data in the database, the dashboard can be built against actual procurement notices from day one. Architecture research recommends Server Components for data display (no loading spinners for initial render). Feature research confirms the dashboard IS the product -- the primary screen investors see.
**Delivers:** Tender feed page, signal feed, search/filter (keyword, sector, value range, geography), tender detail view, buyer organization profiles.
**Addresses:** TS-4 (Dashboard), TS-1 (Search/Filter), TS-6 (Buyer Profiles), TS-7 (Contract Detail), TS-8 (Basic Relevance Scoring), D-1 + D-2 (Signal Display)
**Avoids:** Pitfall 5 (UI renders real data from day one)
**Estimated effort:** 18-22 hours

### Phase 3: Credit System + Contact Reveal
**Rationale:** Feature research identifies this as the business model demonstration -- the single most important thing for the investor conversation after the dashboard itself. Architecture research provides the atomic deduction pattern. Pitfalls research warns against over-engineering.
**Delivers:** Credit balance display, contact reveal flow (blur-to-reveal animation), credit deduction on reveal, "zero credits" upgrade prompt, credit transaction logging (simple).
**Addresses:** D-3 (Credit-Based Contact Reveal), D-7 (Research Entity -- placeholder)
**Avoids:** Pitfall 3 (over-engineered credits)
**Estimated effort:** 6-8 hours

### Phase 4: Onboarding + Pricing + Alerts
**Rationale:** Feature research identifies saved searches as the onboarding flow and pricing page as the investor anchor. These are lower-risk features that build on the working dashboard and credit system.
**Delivers:** Saved search/alert profile setup (onboarding flow), pricing page with 3 tiers, basic email digest setup (if time permits, otherwise defer).
**Addresses:** TS-3 (Saved Search), TS-2 (Email Alerts -- basic), D-5 (SME-Friendly Pricing)
**Avoids:** Pitfall 4 (feature freeze after this phase)
**Estimated effort:** 8-10 hours

### Phase 5: Polish + Demo Rehearsal
**Rationale:** Pitfalls research allocates days 5-7 to polish, bug fixes, and demo preparation. Feature research provides the exact 3-minute investor narrative. This is not a feature phase -- it is a quality phase.
**Delivers:** Loading states, error handling, empty states with good copy, "Last updated" timestamps, demo resilience (cached data fallback), responsive tweaks for projector/screen. Demo script rehearsed and timed.
**Addresses:** UX pitfalls (raw OCDS fields mapped to human labels, contract value prominent, "why this matters" context)
**Avoids:** Pitfall 4 (no new features after day 4)
**Estimated effort:** 10-14 hours

### Phase Ordering Rationale

- **Auth (Phase 0) before everything** because every feature requires user context (credit tracking, saved searches, personalization). Clerk makes this a 2-3 hour task, not a multi-day one.
- **Data pipeline (Phase 1) before dashboard (Phase 2)** because the #1 pitfall pattern is "beautiful UI, empty dashboard." Real data flowing through the system is the prerequisite for all demo value.
- **Dashboard (Phase 2) before credits (Phase 3)** because the credit system gates access to data that must already be visible. You cannot demo "reveal contact" on a contract that is not displayed yet.
- **Credits (Phase 3) before onboarding/pricing (Phase 4)** because the pricing page references credit allocations and the upgrade flow depends on the credit system existing.
- **Polish (Phase 5) is always last** because premature polish wastes time on features that get cut or redesigned. Only polish what survives to the final demo script.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (Data Pipeline):** Find a Tender API has undocumented rate limits (discovered via 429 responses). Board minutes data processing (NLP/signal extraction) is complex and should be pre-computed, not built during the hackathon. The OCDS schema has nuances around pagination cursors and notice updates.
- **Phase 3 (Credit System):** Contact data sourcing strategy needs post-hackathon research. ScrapIn and Bright Data are candidates but both have LOW confidence ratings in the stack research. LinkedIn legal landscape is shifting.

**Phases with standard patterns (skip deeper research):**
- **Phase 0 (Foundation):** Next.js + Clerk + Neon setup is extremely well-documented with official guides.
- **Phase 2 (Dashboard):** shadcn/ui DataTable pattern, TanStack Table, Server Components -- all have extensive documentation and examples.
- **Phase 4 (Onboarding/Pricing):** Standard SaaS patterns with React Hook Form + Zod for preferences, static pricing page.
- **Phase 5 (Polish):** Standard frontend polish, no research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official docs, npm, PyPI. Free tier sufficiency confirmed. Only LinkedIn data providers rated LOW. |
| Features | HIGH | Grounded in detailed competitive analysis of 6+ competitors (Stotles, Tussell, Tenders Direct, Tenderlake, Sweetspot, Starbridge). Feature gap analysis verified against competitor websites. |
| Architecture | HIGH | Standard patterns for data intelligence platforms. OCDS APIs are well-documented. Next.js App Router + Server Components is established. Credit system pattern is well-understood. |
| Pitfalls | HIGH | Based on official API docs, existing competitive research, verified ecosystem patterns. Proxycurl shutdown and LinkedIn legal risk are documented facts. Government API quirks confirmed via official documentation. |

**Overall confidence:** HIGH

### Gaps to Address

1. **LinkedIn/Contact Data Provider:** Lowest confidence area across all research. Proxycurl is dead. ScrapIn is unproven. Apollo.io, RocketReach, and Bright Data are candidates but need evaluation for UK public sector contact coverage, GDPR compliance, and pricing. **Action:** Use seeded data for hackathon. Allocate post-hackathon research sprint to evaluate 3 providers with real queries.

2. **Board Minutes Processing Pipeline:** The core differentiator (pre-tender signals from board minutes) is marked as "pre-process before hackathon" but the actual NLP/extraction pipeline is complex and not researched in depth. **Action:** For hackathon, manually curate 50-100 signals from real board minutes. Post-hackathon, research LLM-based extraction (GPT-4o for document parsing, classification into 6 signal types).

3. **Find a Tender Rate Limits:** Undocumented. Discovered empirically via 429 responses with Retry-After headers. **Action:** Implement exponential backoff in the scraper. Pre-seed data as insurance against rate limiting during the build week.

4. **Procurement Act 2023 Implications:** The Act went live Feb 2025 and changed which data appears where (Find a Tender is now the single official portal for above-threshold notices). Some legacy procurements still appear only on Contracts Finder. Deduplication between the two is non-trivial. **Action:** Use Find a Tender only for hackathon. Research deduplication strategy post-hackathon when adding Contracts Finder.

5. **G-Cloud / Digital Marketplace Migration:** The Digital Marketplace was replaced by the Public Procurement Gateway. Old API endpoints may not work. No stable public API for service listings. **Action:** Skip entirely for hackathon and v1. Reassess when the Public Procurement Gateway stabilizes.

## Sources

### Primary (HIGH confidence)
- [Find a Tender OCDS API Documentation](https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages) -- Public API, cursor pagination, OCDS 1.1.5
- [Contracts Finder API V2 Documentation](https://www.contractsfinder.service.gov.uk/apidocumentation/V2) -- OAuth2 for writes, public for reads
- [Next.js 16.1 Blog Post](https://nextjs.org/blog/next-16-1) -- Framework version verification
- [Tailwind CSS v4.1 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4-1) -- CSS-first config, no tailwind.config.js
- [Drizzle ORM PostgreSQL Docs](https://orm.drizzle.team/docs/get-started-postgresql) -- ORM setup and migration
- [Neon Pricing](https://neon.com/pricing) -- Free tier: 100 CU-hours/month, 0.5GB
- [Clerk Next.js Middleware Documentation](https://clerk.com/docs/reference/nextjs/clerk-middleware) -- Auth integration
- [Scrapy 2.14 Release Notes](https://docs.scrapy.org/en/latest/news.html) -- Python scraper framework
- Existing competitive analysis at `/specs/COMPETITIVE_ANALYSIS.md` -- Primary competitor research
- Existing data sources at `/specs/DATA_SOURCES.md` -- API details for council/NHS data

### Secondary (MEDIUM confidence)
- [Stotles Platform Features](https://www.stotles.com/platform) -- Competitor feature reference
- [Starbridge Buying Signals Monitor](https://starbridge.ai/features/buying-signals-monitor) -- US competitor validation ($52M raised)
- [Tussell UK Tender Portals 2026](https://www.tussell.com/insights/8-public-sector-tender-portals-you-need-to-track) -- Portal landscape
- [Stigg.io Credit System Complexity](https://www.stigg.io/blog-posts/weve-built-ai-credits-and-it-was-harder-than-we-expected) -- Credit system design patterns
- [Drizzle vs Prisma 2026 Comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) -- ORM decision rationale
- [Tender Data Aggregation Architecture](https://groupbwt.com/blog/how-to-aggregate-tender-data/) -- ETL pipeline patterns

### Tertiary (LOW confidence)
- [ScrapIn LinkedIn API](https://www.netrows.com/blog/best-linkedin-data-api-providers-2026) -- Contact data provider, needs validation
- [Bright Data LinkedIn Alternative](https://brightdata.com/blog/web-data/proxycurl-alternatives) -- Fallback contact provider, needs validation
- [Proxycurl Shutdown Report](https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down) -- LinkedIn lawsuit consequences

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
