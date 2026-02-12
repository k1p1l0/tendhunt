```
 _____              _ _   _             _
|_   _|__ _ __   __| | | | |_   _ _ __ | |_
  | |/ _ \ '_ \ / _` | |_| | | | | '_ \| __|
  | |  __/ | | | (_| |  _  | |_| | | | | |_
  |_|\___|_| |_|\__,_|_| |_|\__,_|_| |_|\__|

  UK Procurement Intelligence Platform
  Built in 1 week. Powered by Claude Code.
```

> **Turn public procurement data into actionable sales intelligence.**
> Discover contracts. Score them with AI. Reveal buyer contacts. Win deals.

---

## What is TendHunt?

TendHunt helps UK suppliers find and win government contracts. Instead of drowning in thousands of procurement notices, suppliers get an AI-powered copilot that:

1. **Ingests** live contract data from Find a Tender & Contracts Finder APIs
2. **Scores** every contract against your company profile using Claude Haiku
3. **Enriches** 2,384 public sector buyers with governance data, key personnel, and board documents
4. **Surfaces** pre-tender buying signals from board minutes before contracts are even published

```
                                  +-----------------+
                                  |   Claude Haiku  |
                                  |   AI Scoring    |
                                  +--------+--------+
                                           |
+----------------+    +----------+    +----v-----+    +-------------+
| Find a Tender  |--->|          |--->|  Vibe    |--->|  Dashboard  |
| Contracts      |    | MongoDB  |    | Scanner  |    |  + Buyer    |
| Finder APIs    |--->|  Atlas   |--->|  Engine  |--->|  Profiles   |
+----------------+    +----------+    +----------+    +-------------+
                           ^
                           |
                 +---------+---------+
                 | Enrichment Worker |
                 | 6-Stage Pipeline  |
                 +-------------------+
```

---

## The Hackathon Story

```
Day 0  ........ "What if procurement wasn't terrible?"
Day 1  ████░░░░ Foundation + Auth + MongoDB schemas
Day 1  ██████░░ Data pipeline: 10,000+ live UK contracts ingested
Day 1  ████████ Onboarding: upload docs, AI generates company profile
Day 2  ████████ Contract dashboard with search, filters, detail pages
Day 2  ████████ Vibe Scanner: AI-scored contract tables with custom columns
Day 2  ████████ Buyer intelligence: 2,384 orgs, contact reveal, credits
Day 3  ████████ Enrichment pipeline: ModernGov SOAP, governance scraping
Day 3  ████████ Buyer explorer: filters, enrichment scores, key personnel
Day 3  ████████ Spend data intelligence + entity linking (in progress...)
```

**38 plans executed. 2.33 hours total build time. Average 3.5 min per plan.**

That's not a typo. Claude Code built the entire platform in under 2.5 hours of execution time.

---

## Features

### Vibe Scanner
Create AI-powered scanners for RFPs, Board Meetings, and Buyers. Each scanner has customizable AI columns scored by Claude Haiku in real-time with streaming progress.

```
+-------+------------------+--------+-----------+-------------+
| Buyer | Contract         | Value  | Relevance | Bid Rec.    |
+-------+------------------+--------+-----------+-------------+
| NHS   | Cloud Migration  | 2.4M   |  9.2 [G]  | Strong [G]  |
| MOD   | IT Support       | 800K   |  7.1 [G]  | Medium [Y]  |
| HMRC  | Data Analytics   | 1.2M   |  4.3 [Y]  | Weak   [R]  |
+-------+------------------+--------+-----------+-------------+
        G = Green (>=7)  Y = Yellow (4-7)  R = Red (<4)
```

### Buyer Intelligence
Deep profiles on 2,384 UK public sector organizations with:
- Organization type classification (councils, NHS trusts, ICBs, police, fire, universities...)
- Key personnel extraction via Claude Haiku
- Board document scraping from governance portals
- Enrichment scores (0-100) across 9 weighted dimensions
- Spend pattern analysis from transparency data

### Live Data Pipeline
Cloudflare Workers running hourly cron jobs:
- `data-sync` - Ingests from Find a Tender + Contracts Finder OCDS APIs
- `enrichment` - 6-stage buyer enrichment pipeline (classify, governance, ModernGov, scrape, personnel, score)
- `spend-ingest` - Local authority transparency spending CSV ingestion

### Credit System
Contact reveal monetization model:
- 10 free credits on signup
- 1 credit per contact reveal (blur-to-reveal animation)
- Atomic deduction (no double-spend)
- Transaction history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (App Router, TypeScript) |
| Database | MongoDB Atlas |
| Auth | Clerk |
| AI | Claude Haiku (scoring, personnel extraction, profile generation) |
| UI | shadcn/ui + Tailwind CSS 4.1 + Glide Data Grid |
| Workers | Cloudflare Workers (data sync, enrichment, spend ingest) |
| Storage | Cloudflare R2 |
| Hosting | Cloudflare Pages + Workers |

---

## Project Structure

```
tendhunt.com/
├── apps/
│   ├── web/              # Next.js 16.1 dashboard (app.tendhunt.com)
│   ├── landing/          # Next.js 15.4 marketing site (tendhunt.com)
│   └── workers/
│       ├── data-sync/    # Live contract ingestion (hourly)
│       ├── enrichment/   # 6-stage buyer enrichment (hourly)
│       └── spend-ingest/ # Transparency CSV parsing (weekly)
├── .planning/            # Requirements, roadmap, state tracking
└── CLAUDE.md             # Claude Code project instructions
```

---

## Progress

| Phase | Status | What it does |
|-------|--------|-------------|
| 1. Foundation | Done | Next.js scaffold, Clerk auth, MongoDB schemas |
| 2. Data Pipeline | Done | 10K+ contracts from FaT + CF APIs |
| 3. Onboarding | Done | Document upload, AI profile generation |
| 4. Dashboard | Done | Contract feed, search, filters, detail pages |
| 5. Vibe Scanner | Done | AI-scored tables, custom columns, streaming |
| 6. Buyer Intelligence | Done | 2,384 buyer profiles, contact reveal, credits |
| 9. Enhanced Onboarding | Done | Auto logo extraction, AI analysis animations |
| 10. Live Pipeline | Done | Cloudflare Worker hourly sync |
| 12. Settings | Done | Company profile editor, sidebar restructure |
| 13. Enrichment | Done | 6-stage pipeline, ModernGov SOAP, key personnel |
| 14. Buyer Explorer | Done | Filter dropdowns, enrichment columns |
| 15. Entity Linking | In Progress | Contract-buyer ObjectId linking, region names |
| 11. Spend Intelligence | In Progress | Local authority transparency CSV data |
| 7. Buying Signals | Planned | Board minutes pre-tender signals |
| 8. Landing & Pricing | Planned | Marketing page, 3-tier pricing |

**11 of 13 phases complete. ~90% done.**

---

## Built With Claude Code

This entire platform was architected, planned, and coded using [Claude Code](https://claude.ai/code). Every phase went through the same workflow:

```
   Requirements          Plan            Execute         Verify
  ┌──────────┐      ┌──────────┐     ┌──────────┐    ┌──────────┐
  │ Define   │ ───> │ Break    │ ──> │ Build    │ -> │ Test &   │
  │ what to  │      │ into     │     │ each     │    │ commit   │
  │ build    │      │ plans    │     │ plan     │    │          │
  └──────────┘      └──────────┘     └──────────┘    └──────────┘
       │                 │                │                │
       v                 v                v                v
   REQUIREMENTS.md   PLAN.md files   Code + tests     STATE.md
   ROADMAP.md        (avg 3.5 min)   (auto-commit)    Linear sync
```

The `.planning/` directory contains the full paper trail: requirements, roadmap, per-phase plans, summaries, and velocity metrics.

**Velocity stats:**
- 38 plans executed across 13 phases
- 2.33 hours total execution time
- 3.5 min average per plan
- Phases 1-6 (core MVP) built in a single day

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in: MONGODB_URI, CLERK_*, ANTHROPIC_API_KEY, etc.

# Run the development server
pnpm dev
```

## Domains

| URL | What |
|-----|------|
| `tendhunt.com` | Marketing / landing page |
| `app.tendhunt.com` | Authenticated dashboard |

---

## Data Sources

| Source | Type | Volume |
|--------|------|--------|
| Find a Tender | Live API (OCDS) | ~5,400 contracts/sync |
| Contracts Finder | Live API (OCDS) | ~3,600 contracts/sync |
| DATA_SOURCES.md | Seed data | 2,368 UK public sector orgs |
| ModernGov SOAP API | Live API | Board meetings + documents |
| Transparency CSVs | Scraped | Local authority spend data |

---

## License

Private. Hackathon project.

---

```
  Built with determination, too much coffee,
  and an AI that types faster than you read.

  ██████████████████████████████  100% vibes
```
