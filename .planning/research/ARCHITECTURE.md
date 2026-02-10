# Architecture Research

**Domain:** Sales intelligence / procurement intelligence (UK public sector)
**Researched:** 2026-02-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA INGESTION LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Find a       │  │ Contracts    │  │ G-Cloud      │                   │
│  │ Tender       │  │ Finder       │  │ Digital      │                   │
│  │ Scraper      │  │ Scraper      │  │ Marketplace  │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                 │                            │
│         └────────────┬────┴─────────────────┘                            │
│                      │                                                   │
│              ┌───────▼──────────┐                                        │
│              │  Normalizer /    │                                        │
│              │  Deduplicator    │                                        │
│              └───────┬──────────┘                                        │
├──────────────────────┼───────────────────────────────────────────────────┤
│                      │          DATA STORAGE LAYER                       │
│              ┌───────▼──────────┐                                        │
│              │   PostgreSQL     │                                        │
│              │  ┌────────────┐  │                                        │
│              │  │ tenders    │  │                                        │
│              │  │ buyers     │  │                                        │
│              │  │ contacts   │  │                                        │
│              │  │ credits    │  │                                        │
│              │  │ users      │  │                                        │
│              │  └────────────┘  │                                        │
│              └───────┬──────────┘                                        │
├──────────────────────┼───────────────────────────────────────────────────┤
│                      │          APPLICATION LAYER                        │
│              ┌───────▼──────────┐                                        │
│              │   Next.js App    │                                        │
│              │  ┌────────────┐  │                                        │
│              │  │ API Routes │◄─┼──── Clerk Auth Middleware               │
│              │  │ Server     │  │                                        │
│              │  │ Components │  │                                        │
│              │  │ Server     │  │                                        │
│              │  │ Actions    │  │                                        │
│              │  └────────────┘  │                                        │
│              └───────┬──────────┘                                        │
├──────────────────────┼───────────────────────────────────────────────────┤
│                      │          PRESENTATION LAYER                       │
│              ┌───────▼──────────┐                                        │
│              │  React Dashboard │                                        │
│              │  ┌────────────┐  │                                        │
│              │  │ Tender Feed│  │                                        │
│              │  │ Search     │  │                                        │
│              │  │ Contacts   │  │                                        │
│              │  │ Credits    │  │                                        │
│              │  └────────────┘  │                                        │
│              └──────────────────┘                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                    ENRICHMENT LAYER (async)                               │
│  ┌──────────────┐  ┌──────────────┐                                     │
│  │ Contact      │  │ AI Relevance │                                     │
│  │ Enrichment   │  │ Scoring      │                                     │
│  │ (Apollo/     │  │ (OpenAI)     │                                     │
│  │  BrightData) │  │              │                                     │
│  └──────────────┘  └──────────────┘                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Tender Scrapers** | Pull raw tender data from UK government APIs on a schedule | Python scripts using OCDS APIs (Find a Tender, Contracts Finder) with cursor-based pagination |
| **Normalizer** | Standardize data from 3 sources into a unified schema | Python service mapping OCDS fields to internal `tenders` table |
| **PostgreSQL** | Store all application state: tenders, contacts, users, credits | Single PostgreSQL instance with Prisma ORM, Clerk user IDs as foreign keys |
| **Next.js App** | Full-stack application: API routes, server components, server actions | Next.js 15 App Router with Clerk middleware for auth |
| **Clerk Auth** | Authentication, session management, user profiles | clerkMiddleware() protecting all /dashboard/* and /api/* routes |
| **Contact Enrichment** | Find buyer contact details (name, email, role) for procurement officers | Apollo.io or Bright Data API calls, results cached in `contacts` table |
| **AI Scoring** | Score tender relevance to supplier profile | OpenAI GPT-4o-mini via simple prompt, score stored on `tenders` |
| **React Dashboard** | Investor-facing UI showing live data | Server components for initial load, client components for interactivity |

## Recommended Project Structure

```
tendhunt.com/
├── src/                           # Next.js application
│   ├── app/                       # App Router pages
│   │   ├── (marketing)/           # Public landing pages
│   │   │   ├── page.tsx           # Landing page
│   │   │   └── layout.tsx         # Marketing layout
│   │   ├── (dashboard)/           # Authenticated dashboard
│   │   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       # Main feed: latest tenders
│   │   │   ├── tenders/
│   │   │   │   ├── page.tsx       # Search/filter tenders
│   │   │   │   └── [id]/page.tsx  # Tender detail + contact reveal
│   │   │   ├── contacts/
│   │   │   │   └── page.tsx       # Revealed contacts history
│   │   │   └── credits/
│   │   │       └── page.tsx       # Credit balance + purchase
│   │   ├── api/                   # API route handlers
│   │   │   ├── tenders/
│   │   │   │   ├── route.ts       # GET: search tenders
│   │   │   │   └── [id]/route.ts  # GET: tender detail
│   │   │   ├── contacts/
│   │   │   │   └── reveal/route.ts # POST: reveal contact (deduct credit)
│   │   │   ├── credits/
│   │   │   │   └── route.ts       # GET balance, POST purchase
│   │   │   └── webhooks/
│   │   │       └── clerk/route.ts  # Clerk user sync webhook
│   │   └── sign-in/[[...sign-in]]/page.tsx   # Clerk sign-in
│   ├── components/                # React components
│   │   ├── ui/                    # Shadcn/ui base components
│   │   ├── dashboard/             # Dashboard-specific components
│   │   │   ├── tender-card.tsx
│   │   │   ├── tender-feed.tsx
│   │   │   ├── contact-reveal.tsx
│   │   │   ├── credit-display.tsx
│   │   │   └── search-filters.tsx
│   │   └── layout/                # Layout components
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── lib/                       # Shared utilities
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── auth.ts                # Clerk helpers
│   │   └── utils.ts               # General utilities
│   ├── server/                    # Server-side business logic
│   │   ├── actions/               # Server actions (mutations)
│   │   │   ├── reveal-contact.ts  # Credit deduction + contact reveal
│   │   │   └── update-profile.ts  # User profile/preferences
│   │   └── queries/               # Data fetching functions
│   │       ├── tenders.ts         # Tender queries
│   │       ├── contacts.ts        # Contact queries
│   │       └── credits.ts         # Credit balance queries
│   └── types/                     # TypeScript type definitions
│       ├── tender.ts
│       ├── contact.ts
│       └── credit.ts
├── scrapers/                      # Python data ingestion (separate runtime)
│   ├── requirements.txt
│   ├── config.py                  # API endpoints, credentials
│   ├── find_a_tender.py           # Find a Tender OCDS scraper
│   ├── contracts_finder.py        # Contracts Finder OCDS scraper
│   ├── gcloud_marketplace.py      # G-Cloud Digital Marketplace scraper
│   ├── normalizer.py              # Unified tender schema mapping
│   ├── contact_enricher.py        # Apollo/BrightData contact lookup
│   └── runner.py                  # Cron-triggered orchestrator
├── prisma/
│   └── schema.prisma              # Database schema
├── middleware.ts                   # Clerk auth middleware
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Structure Rationale

- **`src/app/(dashboard)/`:** Route group isolates authenticated pages with shared dashboard layout. Clerk middleware protects the entire group.
- **`src/server/`:** Separates server-side data logic from components. `queries/` for reads (used in Server Components), `actions/` for mutations (used in forms/buttons). This keeps the data access layer testable and centralized.
- **`src/app/api/`:** API routes only for external-facing endpoints (webhook handlers, future mobile API). Internal data fetching uses Server Components and Server Actions directly -- fewer HTTP round trips.
- **`scrapers/`:** Python lives completely outside the Next.js app. No monorepo tooling needed -- just a separate `requirements.txt`. Scrapers run on a schedule (AWS Lambda or cron) and write directly to PostgreSQL. The Next.js app reads from the same database.

## Architectural Patterns

### Pattern 1: Decoupled Scraper + Monolith App

**What:** Python scrapers run independently from the Next.js application. They share only the PostgreSQL database. No message queue, no API contract between them.

**When to use:** Always for this project. The scraper and the app have completely different runtime requirements (Python data libraries vs. Node.js rendering), different scaling profiles (scrapers run on schedule, app runs on demand), and different deployment cycles.

**Trade-offs:**
- Pro: Each side can be developed and deployed independently
- Pro: Scraper failures do not affect the dashboard
- Pro: No complex inter-service communication
- Con: Database is the implicit API contract -- schema changes require coordination
- Con: No real-time push from scraper to app (acceptable for tenders that update daily)

**Example:**
```python
# scrapers/find_a_tender.py
import httpx
from datetime import datetime, timedelta

OCDS_URL = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"

def fetch_recent_tenders(hours_back: int = 24):
    """Fetch tenders updated in the last N hours via OCDS API."""
    updated_from = (datetime.utcnow() - timedelta(hours=hours_back)).strftime("%Y-%m-%dT%H:%M:%S")
    cursor = None

    while True:
        params = {"updatedFrom": updated_from, "limit": 100}
        if cursor:
            params["cursor"] = cursor

        response = httpx.get(OCDS_URL, params=params)
        package = response.json()

        for release in package.get("releases", []):
            yield normalize_tender(release)

        # Cursor-based pagination
        cursor = extract_cursor(package)
        if not cursor:
            break
```

### Pattern 2: Server Components for Data Display, Server Actions for Mutations

**What:** Use Next.js Server Components to fetch and display tender data (zero client-side JS), and Server Actions for user mutations (credit deduction, contact reveal).

**When to use:** All dashboard pages. Server Components provide faster initial page loads and smaller client bundles. Server Actions provide type-safe mutations without API route boilerplate.

**Trade-offs:**
- Pro: No API routes needed for most internal operations
- Pro: Data fetching co-located with rendering -- no loading spinners for initial data
- Pro: Server Actions provide built-in progressive enhancement
- Con: Real-time updates need client components with polling or webhooks
- Con: Complex filtering UX still needs client components for interactivity

**Example:**
```typescript
// src/app/(dashboard)/dashboard/page.tsx -- Server Component
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { TenderFeed } from "@/components/dashboard/tender-feed";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Direct database query in Server Component -- no API round trip
  const tenders = await db.tender.findMany({
    where: { status: "OPEN" },
    orderBy: { publishedDate: "desc" },
    take: 50,
  });

  const creditBalance = await db.creditAccount.findUnique({
    where: { clerkUserId: userId },
    select: { balance: true },
  });

  return (
    <div>
      <CreditDisplay balance={creditBalance?.balance ?? 0} />
      <TenderFeed initialTenders={tenders} />
    </div>
  );
}
```

```typescript
// src/server/actions/reveal-contact.ts -- Server Action
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const REVEAL_COST = 1; // 1 credit per contact reveal

export async function revealContact(tenderId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Transaction: deduct credit + reveal contact atomically
  const result = await db.$transaction(async (tx) => {
    const account = await tx.creditAccount.findUnique({
      where: { clerkUserId: userId },
    });

    if (!account || account.balance < REVEAL_COST) {
      throw new Error("Insufficient credits");
    }

    // Deduct credit
    await tx.creditAccount.update({
      where: { clerkUserId: userId },
      data: { balance: { decrement: REVEAL_COST } },
    });

    // Log transaction
    await tx.creditTransaction.create({
      data: {
        accountId: account.id,
        amount: -REVEAL_COST,
        type: "CONTACT_REVEAL",
        metadata: { tenderId },
      },
    });

    // Return contact (already enriched by scraper)
    return tx.contact.findFirst({
      where: { tenderId },
    });
  });

  revalidatePath("/dashboard");
  return result;
}
```

### Pattern 3: Credit Ledger with Optimistic Locking

**What:** Credit balance maintained via a ledger of transactions rather than a single mutable balance field. Each deduction is a row in `credit_transactions`. Balance is derived or cached.

**When to use:** Any credit/token system where auditability matters (investor demo needs to show the business model works).

**Trade-offs:**
- Pro: Full audit trail of every credit operation
- Pro: Easy to reverse/refund by adding a compensating transaction
- Pro: Race conditions handled by Prisma `$transaction` with `UPDATE ... SET balance = balance - 1 WHERE balance >= 1`
- Con: Slightly more complex than a simple balance field
- Con: For hackathon: a cached `balance` column on `credit_accounts` with atomic decrement is sufficient, skip full event sourcing

**Example:**
```sql
-- Atomic credit deduction (prevents double-spend via WHERE clause)
UPDATE credit_accounts
SET balance = balance - 1, updated_at = NOW()
WHERE clerk_user_id = $1 AND balance >= 1
RETURNING balance;
-- If 0 rows affected, insufficient credits
```

## Data Flow

### Primary Data Flow: Tenders to Dashboard

```
UK Government APIs (OCDS)
    │
    ├── Find a Tender API ──────────┐
    │   GET /api/1.0/ocdsReleasePackages
    │   (public, no auth, cursor pagination)
    │                               │
    ├── Contracts Finder API ───────┤
    │   GET /Published/Notices/OCDS/Search
    │   (public, cursor pagination) │
    │                               │
    └── G-Cloud Marketplace ────────┤
        (scrape or Digital          │
         Marketplace API)           │
                                    │
                    ┌───────────────▼──────────────┐
                    │     Python Normalizer        │
                    │  - Map OCDS → internal schema │
                    │  - Deduplicate across sources │
                    │  - Classify by CPV code       │
                    │  - Extract buyer org details  │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │       PostgreSQL              │
                    │  tenders, buyers, contacts    │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │     Next.js Server           │
                    │  Components (direct DB read)  │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │     React Dashboard          │
                    │  (rendered HTML, hydrated)    │
                    └──────────────────────────────┘
```

### Contact Reveal Flow

```
User clicks "Reveal Contact" on tender detail page
    │
    ▼
Client Component calls Server Action: revealContact(tenderId)
    │
    ▼
Server Action (reveal-contact.ts):
    1. Authenticate via Clerk (auth())
    2. Check credit balance (SELECT ... FOR UPDATE)
    3. If sufficient:
       a. Deduct credit (atomic UPDATE with WHERE balance >= 1)
       b. Log transaction in credit_transactions
       c. Check if contact already cached in contacts table
       d. If not cached: call Apollo/BrightData API for buyer org
       e. Cache result in contacts table
       f. Return contact data
    4. If insufficient: return error, prompt credit purchase
    │
    ▼
Client receives contact (name, email, role, org)
    │
    ▼
revalidatePath() refreshes credit display on dashboard
```

### Scraper Scheduling Flow

```
AWS EventBridge / Cron (every 6 hours)
    │
    ▼
Trigger: scrapers/runner.py
    │
    ├── find_a_tender.py
    │   GET /api/1.0/ocdsReleasePackages?updatedFrom={last_run}
    │   Paginate through all new/updated notices
    │
    ├── contracts_finder.py
    │   GET /Published/Notices/OCDS/Search?publishedFrom={last_run}
    │   Paginate through all new notices
    │
    └── gcloud_marketplace.py
        Scrape or API call for new cloud service listings
    │
    ▼
normalizer.py
    - Map each source format to unified tender schema
    - Upsert into PostgreSQL (ON CONFLICT update)
    - Mark stale/expired tenders
    │
    ▼
contact_enricher.py (optional, can run separately)
    - For new buyer organizations, look up procurement contacts
    - Cache in contacts table (not revealed to users yet)
    │
    ▼
Log results, update last_run timestamp
```

### Key Data Flows

1. **Tender Ingestion:** Government OCDS APIs -> Python scrapers (every 6h) -> Normalizer -> PostgreSQL. No authentication needed for OCDS read endpoints. Both Find a Tender and Contracts Finder support cursor-based pagination with 100 items per page.

2. **Dashboard Display:** User visits /dashboard -> Clerk middleware authenticates -> Server Component queries PostgreSQL directly via Prisma -> Returns rendered HTML with tender cards. No API route round trip for reads.

3. **Contact Reveal (credit deduction):** User clicks reveal -> Server Action authenticates + deducts credit atomically -> Returns cached or freshly-enriched contact data -> Triggers revalidation of credit display.

4. **Search/Filter:** User applies filters -> Client component sends request to API route `/api/tenders?sector=NHS&region=London&minValue=50000` -> Prisma query with dynamic WHERE clause -> JSON response -> Client re-renders.

## Database Schema (Prisma)

```prisma
model Tender {
  id              String    @id @default(cuid())
  ocid            String?   @unique  // OCDS procurement ID
  noticeId        String    @unique  // Source-specific ID
  source          Source    // FIND_A_TENDER, CONTRACTS_FINDER, G_CLOUD

  title           String
  description     String?   @db.Text

  buyerName       String
  buyerOrg        String?
  buyerRegion     String?

  cpvCodes        String[]  // Common Procurement Vocabulary codes
  sector          String?   // Derived from CPV: IT, Healthcare, Construction, etc.

  valueMin        Decimal?  @db.Decimal(15,2)
  valueMax        Decimal?  @db.Decimal(15,2)
  currency        String    @default("GBP")

  publishedDate   DateTime
  deadlineDate    DateTime?
  stage           Stage     // PLANNING, TENDER, AWARD
  status          Status    // OPEN, CLOSED, AWARDED

  sourceUrl       String    // Link back to original notice
  rawData         Json?     // Full OCDS release for reference

  relevanceScore  Float?    // AI-computed, 0-1

  contacts        Contact[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([publishedDate(sort: Desc)])
  @@index([sector])
  @@index([status])
  @@index([deadlineDate])
}

model Contact {
  id              String    @id @default(cuid())
  tenderId        String?
  tender          Tender?   @relation(fields: [tenderId], references: [id])

  buyerOrg        String
  name            String
  email           String?
  jobTitle        String?
  linkedinUrl     String?
  phone           String?

  source          String    // APOLLO, BRIGHT_DATA, MANUAL
  enrichedAt      DateTime  @default(now())

  reveals         ContactReveal[]

  @@unique([buyerOrg, email])
}

model CreditAccount {
  id              String    @id @default(cuid())
  clerkUserId     String    @unique
  balance         Int       @default(10)  // Start with 10 free credits

  transactions    CreditTransaction[]
  reveals         ContactReveal[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model CreditTransaction {
  id              String    @id @default(cuid())
  accountId       String
  account         CreditAccount @relation(fields: [accountId], references: [id])

  amount          Int       // Positive = purchase, negative = spend
  type            TransactionType // SIGNUP_BONUS, PURCHASE, CONTACT_REVEAL, REFUND
  metadata        Json?

  createdAt       DateTime  @default(now())
}

model ContactReveal {
  id              String    @id @default(cuid())
  accountId       String
  account         CreditAccount @relation(fields: [accountId], references: [id])
  contactId       String
  contact         Contact   @relation(fields: [contactId], references: [id])

  createdAt       DateTime  @default(now())

  @@unique([accountId, contactId])  // Prevent double-charging
}

enum Source {
  FIND_A_TENDER
  CONTRACTS_FINDER
  G_CLOUD
}

enum Stage {
  PLANNING
  TENDER
  AWARD
}

enum Status {
  OPEN
  CLOSED
  AWARDED
  CANCELLED
}

enum TransactionType {
  SIGNUP_BONUS
  PURCHASE
  CONTACT_REVEAL
  REFUND
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users (hackathon/demo) | Single PostgreSQL instance, scrapers on cron, Next.js on single deployment. Everything works as described above. |
| 100-10K users | Add database indexes for search queries, implement Redis caching for hot tender lists, move scrapers to AWS Lambda for reliability, add full-text search via PostgreSQL `tsvector` or Algolia. |
| 10K+ users | Dedicated search index (Elasticsearch/Typesense), read replicas for PostgreSQL, queue-based contact enrichment (SQS), real-time alerts via WebSockets or server-sent events, CDN for dashboard assets. |

### Scaling Priorities

1. **First bottleneck: Database queries for search/filter.** With 50K+ tenders and complex WHERE clauses (sector + region + value range + keyword), PostgreSQL will slow down without proper indexing. Prevention: compound indexes on commonly-filtered columns from day 1.

2. **Second bottleneck: Contact enrichment API rate limits.** Apollo.io and similar services have rate limits (typically 100-300 requests/minute on paid plans). Prevention: pre-enrich contacts for new buyer organizations during scraper runs, not at reveal time. Reveal just unlocks cached data.

## Anti-Patterns

### Anti-Pattern 1: Real-Time Scraping on User Request

**What people do:** Fetch tender data from government APIs when a user loads the dashboard.
**Why it's wrong:** Government APIs are slow (1-5s per page), rate-limited (429 on Find a Tender, 403 on Contracts Finder), and unreliable. A single slow API response blocks the entire dashboard load.
**Do this instead:** Pre-fetch all tenders on a schedule (every 6 hours). Dashboard reads from PostgreSQL, which is fast and reliable. Stale-by-6-hours is perfectly acceptable for tenders with week-long deadlines.

### Anti-Pattern 2: Microservices for a Hackathon

**What people do:** Split the app into separate services (auth service, tender service, credit service, contact service) with inter-service communication.
**Why it's wrong:** For a 1-week build with 1-2 developers, microservices add coordination overhead (service discovery, API contracts, deployment orchestration) without any benefit. You are not at the scale where a monolith is a problem.
**Do this instead:** Single Next.js application with clear module boundaries (`server/queries/`, `server/actions/`). Python scrapers are the only separate runtime because they genuinely need different language capabilities. Everything else is one deployment unit.

### Anti-Pattern 3: Building a Custom Auth System

**What people do:** Implement JWT tokens, password hashing, email verification, session management from scratch.
**Why it's wrong:** Authentication bugs are security vulnerabilities. Building auth from scratch takes 2-3 days of a 7-day hackathon. It will not impress investors -- a working product will.
**Do this instead:** Clerk handles everything. 15 minutes to set up. Use `clerkMiddleware()` + `auth()` everywhere. Clerk user IDs become the foreign key to your credit system.

### Anti-Pattern 4: Contact Enrichment at Reveal Time

**What people do:** Call Apollo/BrightData API when the user clicks "Reveal Contact", making them wait 3-5 seconds.
**Why it's wrong:** Slow reveal UX. Enrichment APIs can fail or be rate-limited. User pays a credit but might get an error.
**Do this instead:** Pre-enrich contacts during scraper runs. When a new buyer organization appears, background job looks up 2-3 procurement contacts. Reveal is instant -- just removes the blur/lock from cached data. Graceful fallback: if contact not yet enriched, show buyer organization details and queue enrichment.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Find a Tender OCDS API** | Public REST API, GET with cursor pagination, no auth required | `GET /api/1.0/ocdsReleasePackages?updatedFrom=...&limit=100`. Rate limit: 429 with Retry-After header. |
| **Contracts Finder OCDS API** | Public REST API, GET with cursor pagination | `GET /Published/Notices/OCDS/Search?publishedFrom=...&limit=100`. Rate limit: 403, wait 5 minutes. |
| **G-Cloud Digital Marketplace** | Crown Commercial Service GitHub API (Flask-based) or direct scraping | Open source codebase at github.com/Crown-Commercial-Service. Bearer token auth for API, or scrape public listing pages. |
| **Clerk** | Next.js SDK with middleware | `clerkMiddleware()` in `middleware.ts`. Webhook to `/api/webhooks/clerk` for user creation events (to create credit accounts). |
| **Apollo.io / Bright Data** | REST API for contact enrichment | Lookup by company name + job title keywords ("procurement", "commercial", "contracts"). Cache all results. |
| **OpenAI** | REST API for relevance scoring | GPT-4o-mini to score tender-to-supplier relevance. Batch process during scraper runs, not real-time. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Scrapers <-> Database** | Direct PostgreSQL writes via psycopg2/SQLAlchemy | No API layer between them. Scrapers have DB write access. Schema is the contract. |
| **Next.js <-> Database** | Prisma ORM (reads and writes) | Server Components for reads, Server Actions for writes. Single Prisma client instance. |
| **Dashboard <-> Server** | React Server Components (initial), Server Actions (mutations), API routes (search) | Minimize client-side fetching. Use `searchParams` for filter state in URL. |
| **Clerk <-> Credit System** | Webhook on user creation -> create CreditAccount with signup bonus | `POST /api/webhooks/clerk` creates account with 10 free credits. |

## Hackathon-Specific Simplifications

### What Must Be Real for Investor Demo

| Component | Why Real | Effort |
|-----------|----------|--------|
| **Tender data from government APIs** | Investors need to see real contracts flowing in. Mock data is immediately obvious. | 1 day |
| **Search and filter** | Core UX. Investors will type keywords and expect results. | 0.5 days |
| **Credit system working** | Demonstrates the business model. "Pay to reveal" is the monetization story. | 0.5 days |
| **Clerk authentication** | Professional sign-in flow shows product readiness. | 2 hours |
| **Dashboard UI** | First impression. Must look polished -- Shadcn/ui + Tailwind gives professional look fast. | 1.5 days |

### What Can Be Stubbed or Simplified

| Component | Simplification | Why Acceptable |
|-----------|---------------|----------------|
| **Contact data** | Seed 200-300 realistic contacts manually or from a CSV rather than building full Apollo integration | Investors see the reveal UX working. They do not care if the data came from an API or a spreadsheet. |
| **AI relevance scoring** | Hardcode scores based on keyword matching (CPV code overlap) instead of LLM calls | Demonstrates the concept. Can swap in LLM later without architectural changes. |
| **G-Cloud scraper** | Defer to Phase 2. Find a Tender + Contracts Finder alone provide thousands of tenders. | Two data sources is enough to demonstrate aggregation. |
| **Email alerts** | Skip entirely. Dashboard-only for demo. | Already in "Out of Scope" per PROJECT.md. |
| **Payment processing** | Credits are granted manually or via signup bonus. No Stripe integration. | Shows the credit UX without billing complexity. |
| **Scraper scheduling** | Run scrapers manually or via a simple cron instead of AWS EventBridge | For demo, manually seeding DB once is sufficient. Automated scraping is a post-hackathon concern. |

### Suggested Build Order (Dependencies)

```
Day 1: Foundation
  ├── Next.js project + Clerk auth + Prisma schema
  ├── PostgreSQL database setup
  └── Basic layout with sidebar navigation

Day 2: Data Pipeline
  ├── Find a Tender OCDS scraper (Python)
  ├── Contracts Finder OCDS scraper (Python)
  ├── Normalizer -> PostgreSQL inserts
  └── Run scrapers to seed database with real tenders

Day 3: Core Dashboard
  ├── Tender feed page (Server Component, reads from DB)
  ├── Tender detail page
  ├── Search/filter (API route with Prisma query)
  └── Basic tender card component

Day 4: Credit System + Contact Reveal
  ├── Credit account creation (Clerk webhook)
  ├── Credit display in header
  ├── Contact reveal Server Action (atomic deduction)
  ├── Contact detail component (blurred -> revealed)
  └── Seed contact data (CSV import or manual)

Day 5: Polish + Investor UX
  ├── Landing page (marketing layout)
  ├── Dashboard visual polish (charts, stats cards)
  ├── Loading states, error handling
  ├── Empty states with good copy
  └── Final data refresh from government APIs

Day 6-7: Buffer
  ├── Bug fixes from testing
  ├── Performance optimization (indexes, caching)
  ├── Demo script preparation
  └── AI relevance scoring (if time allows)
```

## Sources

- [Find a Tender OCDS API Documentation](https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages) - PUBLIC, no auth, cursor pagination, 100 items/page -- HIGH confidence
- [Contracts Finder OCDS Search API](https://www.contractsfinder.service.gov.uk/apidocumentation/Notices/1/GET-Published-Notice-OCDS-Search) - PUBLIC, cursor pagination, 403 rate limit -- HIGH confidence
- [Contracts Finder API v2 Documentation](https://www.contractsfinder.service.gov.uk/apidocumentation/V2) - OAuth2 for write operations -- HIGH confidence
- [Crown Commercial Service Digital Marketplace API (GitHub)](https://github.com/Crown-Commercial-Service/digitalmarketplace-api) - Open source Flask app, MIT license -- HIGH confidence
- [Digital Marketplace Application Architecture](https://crown-commercial-service.github.io/digitalmarketplace-manual/developing-the-digital-marketplace/application-architecture.html) - 8 Flask services, PostgreSQL + OpenSearch -- HIGH confidence
- [Stotles Platform](https://www.stotles.com/platform) - Competitor feature reference: 1000+ portals, 210K contacts, signal scoring -- MEDIUM confidence
- [Tussell UK Tender Portals 2026](https://www.tussell.com/insights/8-public-sector-tender-portals-you-need-to-track) - Portal landscape reference -- MEDIUM confidence
- [Tender Data Aggregation Architecture](https://groupbwt.com/blog/how-to-aggregate-tender-data/) - ETL pipeline patterns, normalization, compliance tagging -- MEDIUM confidence
- [Proxycurl Shutdown (LinkedIn scraping legal risk)](https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down) - LinkedIn filed lawsuit Jan 2026. Use Apollo.io or Bright Data instead. -- HIGH confidence
- [SaaS Credits System Implementation Guide](https://colorwhistle.com/saas-credits-system-guide/) - Credit ledger pattern, optimistic locking, idempotency -- MEDIUM confidence
- [Clerk Next.js Middleware Documentation](https://clerk.com/docs/reference/nextjs/clerk-middleware) - clerkMiddleware() for route protection -- HIGH confidence
- [Next.js Server Actions vs API Routes](https://makerkit.dev/docs/next-supabase/how-to/api/api-routes-vs-server-actions) - Server Actions for mutations, API routes for external/complex endpoints -- MEDIUM confidence
- [Prisma + Next.js Monorepo Guide](https://www.prisma.io/docs/guides/nextjs) - Prisma client singleton pattern, Next.js integration -- HIGH confidence
- [UK Gov Tender Scraper (GitHub)](https://github.com/rithwikshetty/gov-opportunity-scraper) - Reference Python implementation for Find a Tender scraping -- MEDIUM confidence

---
*Architecture research for: UK procurement intelligence / sales intelligence platform*
*Researched: 2026-02-10*
