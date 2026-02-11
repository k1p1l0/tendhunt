# TendHunt — Hackathon MVP

## What This Is

A sales intelligence platform helping suppliers win UK government contracts. TendHunt provides AI-powered contract alerts, buyer contact intelligence, and opportunity matching across UK public sector procurement. This hackathon MVP is an investor-facing demo proving the core value proposition: find contracts, reveal buyer contacts, and show the credit-based business model working.

## Core Value

Suppliers can discover relevant UK government contracts and instantly reveal the right buyer contacts to pursue them — turning public procurement data into actionable sales intelligence.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time contract alerts from Find a Tender, Contracts Finder, and G-Cloud
- [ ] Dashboard showing latest tenders matching a supplier's profile
- [ ] Buyer contact reveal via LinkedIn data with credit-based access
- [ ] Credit system demonstrating the monetization model
- [ ] User authentication via Clerk
- [ ] Filter/search contracts by sector, value, region, keywords
- [ ] Opportunity relevance scoring

### Out of Scope

- Custom research agents — complexity too high for 1-week hackathon
- Bid intelligence / historical win rates — requires months of data collection
- Framework call-off tracking (CCS, YPO, ESPO, Everything ICT) — defer to full MVP
- Council meeting minutes / FOI scraping — NLP pipeline too complex for hackathon
- Email notifications — dashboard-only for now
- Mobile responsiveness — desktop-first for investor demo
- Stripe payments — credit system is functional but no real billing
- Multi-tenant organization accounts — single user model for now

## Context

- **Market:** £434B annual UK public sector procurement. Procurement Act 2023 went live Feb 2025 — new transparency rules create data opportunity
- **Competitive validation:** Starbridge (US) charges $11-20K/year for similar offering. No UK-native competitor with modern AI-first approach
- **Audience:** This demo targets investors for pre-seed raise (£750K-1.5M). Must look polished and demonstrate real data flowing through the system
- **Design partners:** Matt (COO) has 10-15 warm supplier contacts ready to test after hackathon
- **Team:** Kyrylo (CEO/tech), Matt (COO/sales), Vitalii (likely CTO)
- **Existing expertise:** Serverless Team (AWS) provides infrastructure knowledge and initial funding

## Constraints

- **Timeline**: 1 week hackathon — must be demoable by end of week
- **Tech stack**: Next.js (TypeScript) for frontend + backend API, Python for data scrapers
- **Auth**: Clerk — no custom auth code
- **Data sources (v1)**: Find a Tender (API), Contracts Finder (API), G-Cloud Digital Marketplace (API/scrape)
- **Contact data**: LinkedIn API/scraping for real procurement contacts
- **Database**: PostgreSQL (+ vector DB for search if time allows)
- **Infrastructure**: Cloudflare (Pages, Workers, R2, D1 as needed)
- **Domain**: tendhunt.com = landing page, app.tendhunt.com = authenticated app
- **Demo quality**: Investor-grade — real data, polished UI, working credit system

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk for auth | Zero auth code in 1-week hackathon, polished UX | — Pending |
| Credits system in MVP | Shows investors the business model working, not just tech | — Pending |
| Dashboard-first UX | Investors see value immediately on landing — live contract alerts | — Pending |
| 3 data sources only | Find a Tender + Contracts Finder + G-Cloud cover core use case without scope creep | — Pending |
| LinkedIn for contacts | Real buyer data makes demo compelling vs mock data | — Pending |
| Next.js + Python split | TypeScript for product speed, Python for scraper ecosystem (Scrapy, Playwright) | — Pending |
| Cloudflare infrastructure | Pages for hosting, Workers for scrapers/cron, R2 for storage. Replaces AWS | Confirmed |
| Domain split | tendhunt.com = marketing/landing, app.tendhunt.com = authenticated app | Confirmed |

---
*Last updated: 2026-02-10 after initialization*
