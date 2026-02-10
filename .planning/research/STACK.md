# Technology Stack

**Project:** TendHunt -- UK Procurement Intelligence Platform
**Researched:** 2026-02-10
**Hackathon constraint:** 1-week build for investor demo
**Overall confidence:** HIGH (verified via official docs, npm, PyPI, changelogs)

---

## Decision Context

This stack is optimized for a **1-week hackathon** producing an investor demo. Every choice prioritizes:

1. **Speed of setup** -- can be productive in hours, not days
2. **Demo impressiveness** -- polished UI, fast interactions, real data
3. **Foundation for production** -- nothing that needs ripping out post-hackathon
4. **Solo/small team DX** -- minimal boilerplate, maximum type safety

The project context already locks in: Next.js (TypeScript), Python scrapers, Clerk auth, PostgreSQL, and AWS infrastructure. This document fills in the gaps and specifies versions.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.1.x (latest stable) | Full-stack framework (frontend + API routes) | Native React Server Components, App Router, Turbopack dev (5-14x faster), built-in API routes eliminate separate backend. Vercel deployment = zero-config. Latest LTS as of Jan 2026. | HIGH |
| **TypeScript** | 5.7.x | Type safety across entire codebase | Non-negotiable for a data-heavy dashboard app. Catches contract/type mismatches between API and UI at compile time. | HIGH |
| **React** | 19.x | UI library | Ships with Next.js 16. Server Components + Suspense boundaries = fast perceived load times for demo. | HIGH |

### UI Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Tailwind CSS** | 4.1.x | Utility-first styling | v4 brings 5x faster builds, CSS-first config (no tailwind.config.js), automatic content detection. Zero-config with Next.js 16. | HIGH |
| **shadcn/ui** | Latest (Feb 2026) | Component library | Not a dependency -- copies components into your codebase. Pre-built Table, Card, Dialog, Badge, Command components are exactly what a procurement dashboard needs. Now supports unified `radix-ui` package. Tailwind v4 compatible. | HIGH |
| **Recharts** | 2.15.x | Dashboard charts | Lightweight, React-native charting. For an investor demo, you need: pipeline value over time, signals by sector, alert volume trends. Recharts handles all of these with minimal code. | MEDIUM |
| **TanStack Table** | 8.21.x | Data table (contracts, signals, alerts) | Headless, 10-15kb, handles sorting/filtering/pagination. The core of the product is tabular data -- this is the standard. Pairs perfectly with shadcn/ui DataTable pattern. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Neon PostgreSQL** | Serverless | Primary database (hosted PostgreSQL) | Serverless Postgres with instant provisioning, scale-to-zero (free tier: 100 CU-hours/month, 0.5GB storage). Database branching for dev/preview. Free tier is generous enough for hackathon + early users. Acquired by Databricks (May 2025) -- well-funded, not going away. Launch plan only $5/mo when you graduate. | HIGH |
| **Drizzle ORM** | 0.45.x | TypeScript ORM | SQL-first, schema-as-code in TypeScript. No codegen step (unlike Prisma). 7.4kb bundle -- critical for serverless cold starts on Vercel. Drizzle Kit handles migrations. Type inference is instant (no `prisma generate`). Perfect for hackathon: define schema, push, query -- done. | HIGH |

### Authentication & Authorization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Clerk** | Latest SDK | Auth, user management, organizations | Already decided. Clerk is the right call for hackathon: pre-built sign-in/sign-up components, webhook sync to DB, org-level access control for team features later. Free tier: 10K MAUs. New "Clerk Skills" for AI coding agents speeds up integration. | HIGH |

### Payments & Credits

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Stripe** | 20.3.x (Node SDK) | Credit purchases, subscription billing | Industry standard. Well-documented credit system pattern: user buys credit pack via Stripe Checkout, webhook updates DB balance, contact reveal decrements balance. Stripe Checkout = hosted payment page (no PCI compliance headaches). | HIGH |
| **@stripe/stripe-js** | Latest | Client-side Stripe | For Stripe Elements / Checkout redirect on the frontend. | HIGH |

### Email & Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Resend** | Latest SDK | Transactional email (alerts, welcome, receipts) | Developer-first email API. Free tier: 3,000 emails/month. First-class Next.js SDK. Pair with React Email for templates. Way faster to set up than SendGrid/Mailgun for a hackathon. | MEDIUM |
| **React Email** | Latest | Email templates in JSX | Build email templates as React components. Same mental model as your UI. Dark mode support, responsive out of the box. | MEDIUM |

### Background Jobs & Scheduling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Inngest** | Latest SDK | Background jobs, cron schedules, event-driven workflows | Zero-infrastructure job queue that works with Vercel/serverless. Define functions in your Next.js codebase, deploy with your app. Use for: daily scraper triggers, alert email digests, credit expiry checks. Cron syntax built-in. Auto-retry on failure. Free tier: 25K function runs/month. | MEDIUM |

### Data Scraping (Python)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Scrapy** | 2.14.x | Structured web scraping (Contracts Finder, Find a Tender, ModernGov) | Industry standard Python scraping framework. v2.14 adds native async/await. Handles rate limiting, retries, pipelines. Perfect for the ~676 council sites. Requires Python 3.10+. | HIGH |
| **Playwright (Python)** | 1.58.x | JavaScript-rendered page scraping | For sites that require JS execution (some NHS trusts, custom council sites). Headless Chromium. Use `scrapy-playwright` integration for seamless Scrapy pipeline. | HIGH |
| **httpx** | 0.28.x | Async HTTP client | For API calls to Contracts Finder REST API, Find a Tender OCDS API. Lighter than Scrapy for pure API consumption. | MEDIUM |

### Contact Data / LinkedIn

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **ScrapIn API** | N/A | LinkedIn profile data enrichment | Proxycurl was shut down (Jan 2026 LinkedIn lawsuit). ScrapIn offers real-time, GDPR-compliant LinkedIn data API. Use for buyer contact reveal feature (the credit system). Scrapes only public data, no fake accounts. | LOW |
| **Bright Data (fallback)** | N/A | LinkedIn data if ScrapIn insufficient | Industry leader, successfully defended scraping in US courts. More expensive but highest reliability. | LOW |

**CRITICAL WARNING:** LinkedIn contact data is the highest-risk component of this stack. Proxycurl's shutdown in 2026 after LinkedIn's lawsuit demonstrates the legal fragility. For the hackathon demo, use mock/seed data for contact reveals. Validate the actual data provider during post-hackathon research.

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Zustand** | 5.x | Global client state (filters, UI state, user preferences) | 1.2kb, zero boilerplate, works with React 19. For a dashboard app: filter state, sidebar state, selected contract state. Don't reach for Redux -- overkill for this. | HIGH |
| **React Server Components** | (built-in) | Server state | Next.js 16 RSC handles data fetching server-side. No need for TanStack Query for most data -- fetch in server components, pass to client. | HIGH |
| **TanStack Query** | 5.x | Client-side data fetching (mutations, optimistic updates) | Only for interactive features: credit balance after reveal, real-time alert counts. Not needed for initial data display (RSC handles that). | MEDIUM |

### Validation & Forms

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Zod** | 3.24.x | Schema validation (API, forms, env vars) | TypeScript-first validation. Use for: API route input validation, form schemas, environment variable parsing. Pairs with `drizzle-zod` for auto-generated schemas from DB tables. | HIGH |
| **React Hook Form** | 7.54.x | Form handling | Minimal re-renders, great DX with Zod resolver. For: search filters, alert preferences, account settings. | HIGH |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel** | N/A | Next.js hosting (hackathon) | Zero-config deployment for Next.js. Free tier handles demo traffic. Deploy on `git push`. Edge functions, preview deployments, analytics built in. **For hackathon only** -- migrate to AWS later if needed for cost control at scale. | HIGH |
| **AWS (post-hackathon)** | N/A | Production infrastructure | EC2/ECS for Python scrapers (long-running), S3 for document storage, CloudFront CDN. Not needed for hackathon demo -- Vercel handles the Next.js app, scrapers run locally or on a small EC2 instance. | MEDIUM |
| **Vercel Cron Jobs** | N/A | Scheduled tasks (hackathon) | Trigger Inngest functions or API routes on schedule. For demo: "daily new contract alerts" simulation. | HIGH |

### Developer Experience

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Biome** | 2.x | Linting + formatting | Replaces ESLint + Prettier with a single, faster tool. Rust-based, instant feedback. Less config than ESLint. | MEDIUM |
| **Turbopack** | (built into Next.js 16) | Dev server bundler | Default in Next.js 16.1. File system caching = 5-14x faster dev restarts. No configuration needed. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **ORM** | Drizzle | Prisma | Prisma 7 removed Rust engine (good), but still requires codegen step. Drizzle is lighter for serverless (7.4kb vs Prisma client size), faster iteration for hackathon (no `prisma generate` after schema changes). |
| **Database hosting** | Neon | Supabase | Supabase is a BaaS -- we already have Clerk for auth, Next.js API routes for backend. Paying for services we won't use. Neon is pure Postgres, cheaper, scales to zero. |
| **Database hosting** | Neon | AWS RDS | RDS requires VPC setup, security groups, fixed provisioning. Takes hours to configure properly. Neon: create project in 30 seconds, get connection string, done. |
| **UI components** | shadcn/ui | MUI / Ant Design | MUI is heavy (large bundle), opinionated design system. shadcn/ui copies into your codebase (no dependency), Tailwind-native, easy to customize for investor demo branding. |
| **Charting** | Recharts | D3 / Victory / Nivo | D3 is too low-level for a hackathon. Victory and Nivo are fine but heavier. Recharts is the simplest for standard dashboard charts (bar, line, area, pie). |
| **Email** | Resend | SendGrid / Mailgun | SendGrid setup is painful (domain verification, template builder). Resend: npm install, API key, send email in 3 lines. React Email templates in JSX. |
| **Background jobs** | Inngest | BullMQ + Upstash Redis | BullMQ requires Redis setup, worker processes, connection management. Inngest: define function, deploy with Next.js, done. No infrastructure to manage. |
| **Deployment** | Vercel (hackathon) | AWS Amplify | Amplify supports Next.js but lags behind Vercel on latest features. Vercel is built by the Next.js team -- zero friction for hackathon. Migrate to AWS post-hackathon if costs are a concern. |
| **Auth** | Clerk | Auth.js (NextAuth) | Auth.js is free but requires DB session management, custom UI, email provider setup. Clerk: pre-built components, webhooks, 10 minutes to integrate. Worth the cost for hackathon speed. |
| **State management** | Zustand | Redux Toolkit | Redux is overkill for a dashboard app with RSC. Zustand: create store in 5 lines, use in components. No providers, no reducers, no actions. |
| **CSS** | Tailwind v4 | CSS Modules / styled-components | Tailwind v4 is the standard with shadcn/ui. No context switching between files. v4's CSS-first config means zero setup. |
| **LinkedIn data** | ScrapIn | Proxycurl | Proxycurl was shut down after LinkedIn lawsuit (Jan 2026). Not an option. |
| **Forms** | React Hook Form | Formik | Formik is effectively unmaintained. React Hook Form has better performance (uncontrolled inputs), better Zod integration. |
| **Linter** | Biome | ESLint + Prettier | Biome is a single tool replacing both, 10-100x faster. Less config. For hackathon, speed of setup matters. |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Prisma** | Codegen step slows iteration. Larger bundle for serverless. Drizzle is better for this use case. |
| **Supabase** | Overlaps with Clerk (auth) and Next.js API routes (backend). You'd pay for features you don't use. Just use Neon for Postgres. |
| **Redux** | Overkill. A procurement dashboard doesn't need global state middleware. Zustand + RSC covers everything. |
| **tRPC** | Adds complexity without benefit when you already have Next.js Server Actions and API routes. Good for monorepo multi-app setups, not for a single Next.js app. |
| **Mongoose / MongoDB** | Relational data (contracts, buyers, credits, users) belongs in PostgreSQL. MongoDB would be a mistake for this domain. |
| **Express.js** | You don't need a separate backend. Next.js API routes + Server Actions handle all server logic. Adding Express means two servers, two deploys, twice the complexity. |
| **Proxycurl** | Shut down after LinkedIn lawsuit. Dead product. |
| **Firebase** | Vendor lock-in, NoSQL data model wrong for relational procurement data, expensive at scale. |
| **Vercel Postgres** | Rebranded Neon with markup. Use Neon directly for better pricing and direct access to features like branching. |
| **Docker (for hackathon)** | Adds setup time. Deploy Next.js to Vercel, run Python scrapers locally or on a small EC2. Containerize post-hackathon. |

---

## Installation

### Next.js App (Primary)

```bash
# Create Next.js 16 app with TypeScript, Tailwind v4, App Router
npx create-next-app@latest tendhunt --typescript --tailwind --app --turbopack

# Core dependencies
npm install drizzle-orm @neondatabase/serverless
npm install @clerk/nextjs
npm install stripe @stripe/stripe-js
npm install zustand
npm install @tanstack/react-table @tanstack/react-query
npm install zod react-hook-form @hookform/resolvers
npm install recharts
npm install resend @react-email/components
npm install inngest

# Dev dependencies
npm install -D drizzle-kit
npm install -D @biomejs/biome
npm install -D drizzle-zod

# shadcn/ui setup (interactive -- picks components)
npx shadcn@latest init
npx shadcn@latest add table card badge dialog command input button sheet tabs separator avatar dropdown-menu toast
```

### Python Scrapers

```bash
# Create virtual environment
python3 -m venv .venv && source .venv/bin/activate

# Core scraping
pip install scrapy==2.14.1
pip install playwright==1.58.0
pip install scrapy-playwright
playwright install chromium

# API clients & utilities
pip install httpx==0.28.0
pip install psycopg2-binary  # Direct DB access from scrapers
pip install python-dotenv
pip install beautifulsoup4 lxml  # HTML parsing
```

---

## Environment Variables

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/tendhunt?sslmode=require

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Background Jobs (Inngest)
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# UK Procurement APIs
CONTRACTS_FINDER_API_URL=https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS
FIND_A_TENDER_API_URL=https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages

# LinkedIn Data (post-hackathon)
SCRAPIN_API_KEY=xxx
```

---

## Version Verification Sources

| Technology | Version | Source | Verified Date |
|------------|---------|--------|---------------|
| Next.js | 16.1.x | [nextjs.org/blog/next-16-1](https://nextjs.org/blog/next-16-1) | 2026-02-10 |
| Tailwind CSS | 4.1.x | [tailwindcss.com/blog/tailwindcss-v4-1](https://tailwindcss.com/blog/tailwindcss-v4-1) | 2026-02-10 |
| shadcn/ui | Feb 2026 | [ui.shadcn.com/docs/changelog](https://ui.shadcn.com/docs/changelog) | 2026-02-10 |
| Drizzle ORM | 0.45.x | [npm: drizzle-orm](https://www.npmjs.com/package/drizzle-orm) | 2026-02-10 |
| TanStack Table | 8.21.x | [npm: @tanstack/react-table](https://www.npmjs.com/package/@tanstack/react-table) | 2026-02-10 |
| Stripe (Node) | 20.3.x | [npm: stripe](https://www.npmjs.com/package/stripe) | 2026-02-10 |
| Scrapy | 2.14.1 | [pypi: Scrapy](https://pypi.org/project/Scrapy/) | 2026-02-10 |
| Playwright (Python) | 1.58.0 | [pypi: playwright](https://pypi.org/project/playwright/) | 2026-02-10 |
| Neon | Serverless | [neon.com/pricing](https://neon.com/pricing) | 2026-02-10 |
| Clerk | Latest SDK | [clerk.com/changelog](https://clerk.com/changelog) | 2026-02-10 |

---

## Hackathon Week Cost Estimate

| Service | Free Tier | Sufficient for Demo? |
|---------|-----------|---------------------|
| Vercel | Hobby (free) | Yes -- handles all Next.js hosting |
| Neon | 100 CU-hours/mo, 0.5GB | Yes -- more than enough for demo data |
| Clerk | 10,000 MAUs free | Yes -- investor demo has <10 users |
| Stripe | Test mode (free) | Yes -- use test keys for demo |
| Resend | 3,000 emails/mo free | Yes -- only need a few demo emails |
| Inngest | 25,000 runs/mo free | Yes -- a few cron jobs for demo |
| **Total hackathon cost** | | **$0** |

---

## Post-Hackathon Migration Path

| Hackathon | Production | When to Migrate | Why |
|-----------|------------|-----------------|-----|
| Vercel Hobby | Vercel Pro or AWS (OpenNext) | >100K pageviews/mo or need SSR cost control | Vercel Pro is $20/mo per member; AWS cheaper at scale but requires DevOps |
| Neon Free | Neon Launch ($5/mo) or Scale ($69/mo) | >0.5GB data or need more compute | Neon Launch gives 300 CU-hours, 10GB storage |
| Local Python scrapers | AWS ECS/Fargate | Need scheduled 24/7 scraping | Scrapers are long-running -- not suitable for serverless |
| Inngest Free | Inngest Pro | >25K function runs/mo | Scales pricing with usage |
| ScrapIn (evaluate) | ScrapIn or Bright Data | When contact reveal feature goes live | Need to validate data quality and legal posture first |

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 16.1 Blog Post](https://nextjs.org/blog/next-16-1)
- [Tailwind CSS v4.1 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4-1)
- [shadcn/ui Changelog Feb 2026](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- [Drizzle ORM PostgreSQL Docs](https://orm.drizzle.team/docs/get-started-postgresql)
- [Neon Pricing](https://neon.com/pricing)
- [Clerk Changelog](https://clerk.com/changelog)
- [Stripe Node.js SDK](https://www.npmjs.com/package/stripe)
- [Scrapy 2.14 Release Notes](https://docs.scrapy.org/en/latest/news.html)
- [Playwright Python on PyPI](https://pypi.org/project/playwright/)
- [Contracts Finder API](https://www.contractsfinder.service.gov.uk/apidocumentation)
- [Find a Tender API](https://www.find-tender.service.gov.uk/Search)
- [Inngest Docs - Background Jobs](https://www.inngest.com/docs/guides/background-jobs)
- [Resend - Next.js SDK](https://resend.com/nextjs)

### Comparison Articles (MEDIUM confidence)
- [Drizzle vs Prisma 2026 - MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Neon vs Supabase - Bytebase](https://www.bytebase.com/blog/neon-vs-supabase/)
- [Best Next.js Hosting 2026 - MakerKit](https://makerkit.dev/blog/tutorials/best-hosting-nextjs)
- [Zustand vs Redux vs Jotai - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/)

### Ecosystem Research (LOW-MEDIUM confidence)
- [LinkedIn data providers 2026 - Netrows](https://www.netrows.com/blog/best-linkedin-data-api-providers-2026)
- [Proxycurl alternatives - Bright Data](https://brightdata.com/blog/web-data/proxycurl-alternatives)
- [Top transactional email services 2026 - Knock](https://knock.app/blog/the-top-transactional-email-services-for-developers)
