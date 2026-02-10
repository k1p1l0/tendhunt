# Pitfalls Research

**Domain:** UK Procurement Sales Intelligence Platform (Hackathon MVP)
**Researched:** 2026-02-10
**Confidence:** HIGH (based on official API docs, existing competitive research, and verified ecosystem patterns)

---

## Critical Pitfalls

### Pitfall 1: LinkedIn Scraping Becomes a Legal and Technical Black Hole

**What goes wrong:**
The team spends 2-3 days building a LinkedIn scraping pipeline for buyer contact data, only to hit multiple walls: LinkedIn's anti-bot detection blocks the scraper within hours, GDPR compliance under the UK Data (Use and Access) Act 2025 creates legal exposure, and the scraped data is stale or incomplete. The demo day arrives with broken contact reveal — the one feature that differentiates TendHunt from free government portals.

**Why it happens:**
LinkedIn actively fights scrapers with CAPTCHAs, rate limiting, and account bans. UK GDPR requires lawful basis (legitimate interest at minimum), transparency obligations, and the ability to handle Subject Access Requests for any personal data scraped. PhantomBuster-style tools get detected and blocked. Building a robust scraper is a multi-week project, not a hackathon task.

**How to avoid:**
Do NOT build a real LinkedIn scraper for the hackathon. Instead:
1. **Pre-scrape 50-100 real procurement contacts manually** (browsing LinkedIn yourself is legal for individual use)
2. **Seed the database** with real names, titles, and organizations from publicly available sources (GOV.UK appointment announcements, council committee pages, NHS board member lists)
3. **Build the "reveal" UX** against this seeded data — the credit deduction, the contact card animation, the value moment all work the same
4. **For the demo script**, ensure the 5-10 contracts you demo have matching contact data pre-loaded
5. Post-hackathon, evaluate Apollo.io, RocketReach, or Lusha APIs which provide contact data with GDPR compliance built in (paid services, but legal)

**Warning signs:**
- Spending more than 4 hours on scraping infrastructure
- Getting LinkedIn account warnings or CAPTCHAs
- Discussing "rotating proxies" or "residential IPs" during a 1-week hackathon
- No contact data visible in the app by day 3

**Phase to address:** Phase 1 (Data Pipeline) — decision to use seeded data must be made on day 1, not discovered as a fallback on day 4.

---

### Pitfall 2: Three Government APIs, Zero Working Data Pipeline

**What goes wrong:**
The team attempts to integrate Find a Tender API, Contracts Finder API, and G-Cloud Digital Marketplace simultaneously. Each has different authentication, data formats (OCDS JSON vs custom JSON vs HTML scraping), pagination approaches (cursor-based vs offset vs none), and undocumented rate limits. By day 3, none of them reliably return clean, deduplicated data. The demo shows an empty dashboard.

**Why it happens:**
- **Find a Tender** uses OCDS 1.1.5 format with cursor-based pagination (max 100 results per request). Rate limits are undocumented — you discover them via HTTP 429 responses with `Retry-After` headers.
- **Contracts Finder** has a V2 API with different JSON structure and its own quirks. Documentation is sparse.
- **G-Cloud Digital Marketplace** was replaced by the Public Procurement Gateway — the old API endpoints may no longer work. No official public API exists for service listings.
- **Data overlap**: Under the Procurement Act 2023 (live since Feb 2025), Find a Tender is the single official portal for above-threshold notices. But legacy procurements still appear only on Contracts Finder. Deduplication between the two is non-trivial (no shared identifier).

**How to avoid:**
1. **Start with Find a Tender only** — it has the best-documented API (OCDS standard), covers above-threshold contracts (the high-value ones investors care about), and is the mandated portal under the new Procurement Act 2023
2. **Pre-fetch and cache data** — run one big initial pull of recent notices (e.g., last 90 days), store in PostgreSQL, then do incremental updates. Do NOT build a real-time streaming pipeline for day 1
3. **Add Contracts Finder as stretch goal** — if FaT is working by day 3, add CF. If not, the demo works fine with just FaT data
4. **Skip G-Cloud entirely** — it has no proper API, the marketplace was migrated, and the data is service listings (not tenders). It adds noise, not value, to an investor demo
5. **Seed 200-500 real notices** from a manual API pull on day 1 as fallback — even if the live pipeline breaks, you have real data to demo

**Warning signs:**
- Building API adapters for all 3 sources in parallel on day 1
- No data visible in the database by end of day 2
- Spending time on deduplication logic before any single source works
- Discussing "real-time" ingestion on a 1-week timeline

**Phase to address:** Phase 1 (Data Pipeline) — commit to FaT-first on day 1. Have a manual data seed script as insurance.

---

### Pitfall 3: Building a Real Credit System Instead of a Demo Credit System

**What goes wrong:**
The team implements a full credit lifecycle — purchase credits, deduct on action, handle edge cases (insufficient credits, refunds, expiration, concurrent deductions), integrate with a billing provider. This consumes 2-3 days of engineering time. The result is technically correct but the demo still has a static landing page and 3 contract cards.

**Why it happens:**
Stigg.io (a company that builds credit systems as a service) publicly documented that "the moment you introduce credits, you are not just adding a billing unit — you are building an economy." Real credit systems require idempotency across retries, real-time balance enforcement, lifecycle management (grants, promotions, expiration, rollovers), and revenue recognition compliance. This is weeks of work.

**How to avoid:**
Build a "demo credit system" — a single integer column on the user table:
1. `credits_remaining INTEGER DEFAULT 50` on the user record
2. On "reveal contact," decrement by 1. No concurrency handling needed (single user demo)
3. Show a credit balance badge in the header
4. When credits hit 0, show an "Upgrade" modal with pricing tiers (static, no real payment)
5. Total implementation time: 2-4 hours, not 2-3 days
6. The investor sees: credits work, monetization model is clear, upgrade path exists

**Warning signs:**
- Creating a `credits` table with `transaction_type`, `expires_at`, `source` columns
- Discussing Stripe integration before the dashboard shows data
- Building an "admin credit management" panel
- Implementing credit purchase flows

**Phase to address:** Phase 3 (Monetization Layer) — but scope it to the demo version from the start. Add a comment `// TODO: Replace with proper billing system post-hackathon` and move on.

---

### Pitfall 4: Scope Creep Through "Just One More Feature"

**What goes wrong:**
The team starts with a clear plan (dashboard + search + contact reveal) but by day 3, someone adds "we should also do email alerts," "what about saved searches," "let's add a map view of contract locations," "we need organization profiles." Each addition is individually small but collectively they fragment focus. The core flow (find contract -> see details -> reveal contact) never gets polished. The investor sees 7 half-finished features instead of 1 compelling workflow.

**Why it happens:**
Hackathon adrenaline. New ideas feel urgent. No one wants to say no. The team confuses "features visible" with "value demonstrated." Investors do not count features — they evaluate whether the core thesis works.

**How to avoid:**
1. **Define the demo script on day 1** — write the exact 3-minute walkthrough: "I log in, I see 15 fresh tenders, I filter by IT services, I click one, I see the details, I reveal the buyer contact, my credits go down, I see their name and title. That's TendHunt."
2. **Every feature request gets asked: "Is this in the demo script?"** If no, it goes on a "post-hackathon" list
3. **The feature freeze is day 4** — days 5-7 are polish, bug fixes, demo rehearsal only
4. **Keep a visible "NOT building" list** on a shared doc: email alerts, saved searches, bid analytics, map view, mobile, notifications

**Warning signs:**
- Adding new database tables after day 3
- Building features no one will click during the demo
- The demo script is undefined or keeps changing
- "It would be cool if..." conversations after day 2

**Phase to address:** All phases — but the demo script must be written and frozen in Phase 0 (Project Setup).

---

### Pitfall 5: Polished UI on Day 1, No Data on Day 5

**What goes wrong:**
The team starts with the frontend — beautiful Tailwind components, animated dashboards, loading skeletons. But no API feeds the components. By day 4, the data pipeline is still being debugged, and the beautiful UI shows "No results found" or hardcoded mock data that looks obviously fake. Investors see a design prototype, not a product.

**Why it happens:**
Frontend work feels productive (visible progress) and is comfortable for Next.js developers. Data pipeline work is invisible and frustrating (API debugging, data mapping, PostgreSQL schema iteration). The team gravitates toward what feels good.

**How to avoid:**
1. **Day 1-2: Data first** — get real procurement data from Find a Tender into PostgreSQL. Even if the UI is a plain HTML table, real data flowing proves the system works
2. **Day 2-3: API routes** — build Next.js API routes that query PostgreSQL and return real data
3. **Day 3-5: UI on top of real data** — now build the dashboard, and every component shows real contracts from day one
4. **Day 5-7: Polish** — animations, loading states, responsive tweaks for the projector/screen demo
5. **The acid test**: at any point, can you open the app and see real UK government contracts? If no, stop building UI

**Warning signs:**
- The Figma/design discussion lasts more than 2 hours on day 1
- Components exist but render mock data or "Lorem ipsum"
- API routes return hardcoded JSON
- Database has no data by end of day 2

**Phase to address:** Phase 1 (Data Pipeline) must complete before Phase 2 (Frontend) begins meaningful work. Overlap is acceptable only if frontend uses real API endpoints.

---

## Technical Debt Patterns

Shortcuts that are acceptable for a 1-week hackathon and shortcuts that are not.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single integer for credits | Ship in 2 hours | Must rebuild for real billing | Hackathon: ALWAYS. Replace post-raise |
| No deduplication between FaT and CF | Avoid complex matching logic | Some contracts appear twice | Hackathon: YES. Use only FaT to sidestep entirely |
| Hardcoded search filters | Skip building dynamic filter UI | Not configurable | Hackathon: YES. Pre-define 5-6 useful filters |
| No error handling on API calls | Faster development | App crashes on API failures | Hackathon: PARTIAL. Add try/catch with "Service unavailable" fallback, skip retry logic |
| Seeded contact data instead of live scraping | Avoid legal and technical risk | Not scalable | Hackathon: YES. Build the reveal UX, solve data sourcing later |
| No database migrations system | Skip tooling setup | Schema changes require manual SQL | Hackathon: YES. Use Prisma or Drizzle from start to avoid this |
| Server-side rendering everything | Simpler architecture | Performance issues at scale | Hackathon: YES. SSR is fine for demo-scale |
| No caching layer | Simpler stack | Slow on repeated queries | Hackathon: YES. PostgreSQL handles demo-scale queries fine |
| Storing API keys in `.env` without rotation | Quick setup | Security risk | Hackathon: YES, but NEVER commit `.env` to git |
| No rate limit handling on your own API | Faster development | Abuse vulnerability | Hackathon: YES. Single-user demo |

## Integration Gotchas

Common mistakes when connecting to the specific external services TendHunt uses.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Find a Tender API** | Requesting all notices without date filters, hitting rate limits immediately | Use `updatedFrom`/`updatedTo` params. Pull last 90 days. Paginate with `cursor` (max 100/request). Cache results in PostgreSQL |
| **Find a Tender API** | Assuming notice IDs are globally unique across systems | FaT uses format `nnnnnn-yyyy`. Contracts Finder uses different IDs. Store the source system alongside every record |
| **Contracts Finder API** | Using V1 API (deprecated) based on old documentation | Use V2 API explicitly. Check `/apidocumentation/V2` for current endpoints |
| **Contracts Finder API** | Not handling the different JSON structure from FaT's OCDS format | Build a normalizer layer that maps both formats to your internal schema. Do this mapping early |
| **G-Cloud / Digital Marketplace** | Assuming a public API exists for service listings | The Digital Marketplace was replaced by Public Procurement Gateway. No stable public API. Skip for hackathon |
| **Clerk Auth** | Implementing custom JWT verification instead of using Clerk's middleware | Use `@clerk/nextjs` middleware. It handles JWT validation (1-2ms after JWKS caching). Do not build custom auth logic |
| **Clerk Auth** | Relying solely on middleware for access control (CVE-2025-29927 pattern) | Verify auth at the data access layer too, not just middleware. Check `auth()` in API routes |
| **PostgreSQL** | Creating overly normalized schema (10+ tables) for a hackathon | 3-4 tables max: `users`, `contracts`, `contacts`, `credit_transactions` (optional). Denormalize for speed |

## Performance Traps

Patterns that work at demo scale but would fail in production.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-text search via `LIKE '%keyword%'` | Slow search as data grows | Use PostgreSQL `tsvector`/`tsquery` or `pg_trgm` extension | 10K+ contracts |
| No pagination on contract list | Page loads slow, browser freezes | Implement cursor-based pagination from day 1 (cheap to add) | 500+ contracts rendered |
| Fetching all contract fields for list view | Oversized API responses | Select only needed columns in list queries, full data on detail view | 1K+ contracts |
| No database indexes | Queries slow down silently | Add indexes on `sector`, `value`, `published_date`, `status` from start | 5K+ rows |
| Synchronous API calls to gov APIs on user request | User waits 5-10s for data | Pre-fetch and cache. Never call external APIs in the request path for user-facing pages | Always |

## Security Mistakes

Domain-specific security issues for a procurement intelligence platform.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing scraped LinkedIn personal data without GDPR basis | ICO fines up to 4% of annual turnover, reputational damage | Use seeded/manual data for hackathon. Post-hackathon: use compliant data providers (Apollo, RocketReach) with DPA agreements |
| Exposing contract contact details without credit check on API | Users bypass frontend, call API directly to get contacts for free | Verify credit balance server-side in the API route, not just in the UI |
| Committing API keys to git repository | Key exposure, unauthorized access | `.env.local` in `.gitignore`. Use environment variables. Never hardcode keys in source files |
| No authentication on Python scraper endpoints | Anyone can trigger expensive scraping jobs | Run scrapers as cron/scheduled tasks, not as API endpoints. If API-triggered, require auth |
| Caching procurement contact data indefinitely | Data becomes stale, GDPR right-to-erasure violations | Set TTL on contact data (30-90 days). For hackathon: acceptable as data is seeded |

## UX Pitfalls

Common user experience mistakes in procurement intelligence platforms, informed by competitor analysis.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw OCDS data fields (`tender.procuringEntity.name`) | Users don't understand procurement jargon | Map to human-readable labels: "Buying Organization," "Contract Value," "Deadline" |
| Overwhelming dashboard with all contracts at once | Information overload, no sense of relevance | Show a curated "Top matches" section first, then "All contracts" below. Even if matching is simple (keyword-based), the curation UX matters |
| Requiring profile setup before showing any value | Users bounce before seeing the product | Show contracts immediately on first login. Let profile/preferences be optional for enriching results |
| Hiding contract value ranges behind a click | Users need to quickly assess if a contract is worth pursuing | Show estimated value prominently in the card/list view. It's the #1 qualification criterion for suppliers |
| Making the "reveal contact" action ambiguous | Users don't understand what credits buy | Clear CTA: "Reveal 3 buyer contacts (1 credit)" with a preview showing org name but blurred contact details |
| No "why this matters" context on contracts | Users see data but don't understand the opportunity | Add a 1-line AI summary: "NHS Trust seeking cloud migration partner, estimated 500K, deadline in 3 weeks" |

## "Looks Done But Isn't" Checklist

Things that appear complete in a demo but are missing critical pieces.

- [ ] **Contract search:** Often missing handling of empty results — verify the "no results" state has a helpful message, not a blank page
- [ ] **Credit system:** Often missing the "zero credits" state — verify the upgrade prompt appears and the reveal button is disabled
- [ ] **Auth flow:** Often missing the post-signup redirect — verify new users land on the dashboard, not a blank page or error
- [ ] **Contract detail page:** Often missing the "contract expired/closed" state — verify stale contracts are visually distinct
- [ ] **Data freshness:** Often missing any indication of when data was last updated — verify a "Last updated: 2 hours ago" timestamp exists
- [ ] **Demo resilience:** Often missing offline/error fallback — verify the app gracefully handles Find a Tender API being down (show cached data, not an error page)
- [ ] **Mobile view:** Not relevant for hackathon demo, but verify the app doesn't break if an investor accidentally opens it on their phone
- [ ] **Loading states:** Often missing between "click reveal" and "show contact" — verify there's a loading spinner, not a frozen UI

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LinkedIn scraper blocked/broken | LOW | Switch to seeded data (should already exist as backup). Update demo script to not mention "live LinkedIn data" |
| Find a Tender API down during demo | LOW | Pre-cache 200+ contracts. Add "Last synced" timestamp. Demo works from cache. API outage is invisible |
| Credit system has bugs | LOW | Hardcode `credits_remaining = 50` for the demo account. Fix post-demo |
| Data quality issues (missing fields, duplicates) | MEDIUM | Write a cleanup script day before demo. Remove obviously broken records. Quality > quantity |
| Scope creep consumed all time, core flow incomplete | HIGH | Day 5 emergency: cut everything except search + detail + reveal. Polish this one flow obsessively. 1 great flow > 5 broken ones |
| Clerk auth not working | MEDIUM | Have a "skip auth" bypass for demo (environment flag). Show the auth flow in screenshots. Demonstrate it works when internet is stable |
| Database schema needs rework | MEDIUM | Drop and recreate tables. Re-run seed script. This is why keeping a seed script is essential |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LinkedIn scraping black hole | Phase 0 (Setup) — decide seeded data strategy | Contact data visible in DB by end of day 1 |
| Three APIs, zero data | Phase 1 (Data Pipeline) — FaT-first, single source | 100+ real contracts in PostgreSQL by end of day 2 |
| Over-engineered credit system | Phase 3 (Monetization) — integer column approach | Credit deduction works in under 2 hours of dev time |
| Scope creep | Phase 0 (Setup) — write and freeze demo script | Demo script unchanged after day 2 |
| UI-first, data-never | Phase 1 (Data Pipeline) — data before UI rule | Real data visible in browser by end of day 2 |
| G-Cloud API doesn't exist | Phase 0 (Setup) — remove from scope | G-Cloud not in sprint backlog |
| Data quality/deduplication | Phase 1 (Data Pipeline) — single source avoids this | No duplicate contracts visible in UI |
| Stale/broken contact data | Phase 2 (Frontend/UX) — seeded data quality check | All demo-path contracts have matching contacts |
| API rate limiting surprises | Phase 1 (Data Pipeline) — batch pre-fetch with backoff | Seed script runs without 429 errors |
| GDPR exposure from scraping | Phase 0 (Setup) — no scraping decision | No automated scraping code in the codebase |

## Hackathon-Specific Time Traps

These are not just pitfalls but specific activities that consume disproportionate time relative to demo value.

| Time Trap | Estimated Time Cost | Demo Value | Verdict |
|-----------|-------------------|------------|---------|
| Setting up CI/CD pipeline | 4-6 hours | Zero for demo | SKIP. Deploy manually via `next build && scp` or Vercel |
| Writing automated tests | 4-8 hours | Zero for demo | SKIP. Test manually. Write tests post-hackathon |
| Building email notification system | 6-10 hours | Minimal (investors won't check email) | SKIP entirely |
| Custom design system / component library | 8-12 hours | Moderate (looks nice) | USE shadcn/ui or similar pre-built components |
| Real-time WebSocket updates | 6-8 hours | Flashy but unnecessary | SKIP. Manual refresh or polling is fine |
| Multi-tenant organization support | 8-12 hours | Zero for single-user demo | SKIP. Single user model |
| Building an admin panel | 4-6 hours | Zero (no one sees it) | SKIP. Use PostgreSQL CLI or pgAdmin for data management |
| Implementing proper logging/monitoring | 4-6 hours | Zero for demo | SKIP. Console.log is fine for 1 week |
| Data migration system setup | 2-4 hours | Prevents schema change pain | DO IT. Use Prisma or Drizzle. Worth the 2-hour investment |
| Docker/containerization | 3-5 hours | Zero for demo | SKIP unless team already has Docker muscle memory |

## Sources

- [Find a Tender API Documentation](https://www.find-tender.service.gov.uk/Developer/Documentation) — Official API docs (HIGH confidence)
- [Find a Tender OCDS Release Packages API](https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages) — Pagination and rate limit details (HIGH confidence)
- [Contracts Finder API V2 Release Notes](https://www.contractsfinder.service.gov.uk/apidocumentation/V2) — Official V2 API docs (HIGH confidence)
- [Stigg.io: "We've built AI Credits. And it was harder than we expected."](https://www.stigg.io/blog-posts/weve-built-ai-credits-and-it-was-harder-than-we-expected) — Credit system complexity (MEDIUM confidence)
- [Marketscan: Legality of Scraping B2B Data from LinkedIn](https://www.marketscan.co.uk/insights/the-legality-of-scraping-b2b-data-from-linkedin/) — GDPR scraping risks (MEDIUM confidence)
- [LinkedIn Compliance 2025: UK GDPR, Data Act & Posting Rules](https://melaniegoodmanlinkedinconsultant.substack.com/p/linkedin-compliance-2025-uk) — UK Data Act 2025 implications (MEDIUM confidence)
- [Tussell: 8 Public Sector Tender Portals to Track in 2026](https://www.tussell.com/insights/8-public-sector-tender-portals-you-need-to-track) — Portal landscape and Procurement Act 2023 (MEDIUM confidence)
- [BidDetail: Guide to UK Contracts Finder and Find a Tender](https://www.biddetail.com/blogdetail/a-complete-guide-to-the-uk-government-contracts-finder-and-find-a-tender-service/1041) — Platform scope differences (MEDIUM confidence)
- Existing competitive analysis at `/specs/COMPETITIVE_ANALYSIS.md` — Competitor landscape (HIGH confidence, primary research)
- Existing data sources research at `/specs/DATA_SOURCES.md` — API details for council/NHS data (HIGH confidence, primary research)
- [Clerk: Building Scalable Authentication in Next.js](https://clerk.com/articles/building-scalable-authentication-in-nextjs) — Auth best practices (MEDIUM confidence)
- [Metronome: AI Pricing in Practice 2025](https://metronome.com/blog/ai-pricing-in-practice-2025-field-report-from-leading-saas-teams) — Credit-based monetization patterns (MEDIUM confidence)

---
*Pitfalls research for: TendHunt UK Procurement Intelligence Platform (Hackathon MVP)*
*Researched: 2026-02-10*
