# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Suppliers discover relevant UK government contracts and reveal buyer contacts -- turning public procurement data into actionable sales intelligence through AI-powered scoring.
**Current focus:** Phase 6 IN PROGRESS -- Buyer Intelligence & Credits (Plan 1/3 complete)

## Current Position

Phase: 6 of 10 (Buyer Intelligence & Credits)
Plan: 1 of 3 in current phase (06-01 complete)
Status: Plan 06-01 complete -- Backend APIs, credit store, sidebar balance
Last activity: 2026-02-11 -- Plan 06-01 executed (2 tasks, 4 min)

Progress: [▓▓▓▓▓▓▓▓▓▓] 100% (Phases 1-5, 9-10 complete) + Phase 6: 1/3 plans

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: 3.9 min
- Total execution time: 1.49 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 6 min | 3 min |
| 02-data-pipeline | 3/3 | 17 min | 5.7 min |
| 03-onboarding | 4/4 | 16 min | 4 min |
| 09-enhance-onboarding | 2/2 | 6 min | 3 min |
| 04-contract-dashboard | 2/2 | 7 min | 3.5 min |
| 05-vibe-scanner | 6/6 | 19 min | 3.2 min |
| 10-live-data-pipeline | 2/2 | 6 min | 3 min |
| 06-buyer-intelligence | 1/3 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 05-06 (4 min), 10-01 (4 min), 10-02 (2 min), 06-01 (4 min)
- Trend: Consistent ~2-5 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: MongoDB Atlas replaces PostgreSQL/Drizzle/Neon (flexibility, free tier)
- [Roadmap]: No LinkedIn scraping -- contacts from public sources only (GOV.UK, council pages, NHS boards)
- [Roadmap]: Vibe Scanner (Claude Haiku AI scoring) is the core differentiator
- [Roadmap]: G-Cloud dropped -- only Find a Tender and Contracts Finder APIs
- [Roadmap]: Data-first build order (data in DB before UI)
- [01-01]: ClerkProvider dynamic mode for build compatibility with placeholder keys
- [01-01]: proxy.ts at src/proxy.ts (inside src-dir) for Next.js 16
- [01-01]: Zod 4 for env validation (newer API, auto-installed)
- [01-02]: Mongoose 9.x connect() is a no-op when already connected -- no global caching needed
- [01-02]: All models use mongoose.models.X || mongoose.model() for hot-reload safety
- [01-02]: verifyWebhook from @clerk/nextjs/webhooks (not svix) for webhook verification
- [01-02]: Dashboard layout uses await auth() as required by Next.js 16
- [Infra]: Cloudflare infrastructure (Pages, Workers, R2) -- replaces AWS
- [Infra]: tendhunt.com = landing page, app.tendhunt.com = authenticated app (domain split)
- [02-01]: FaT API uses links.next full URLs for pagination (not bare cursor tokens)
- [02-01]: FaT API rejects comma-separated stages -- fetch each stage separately
- [02-01]: 60-day window with dual-stage fetch to ensure 200+ contracts
- [02-01]: Relative imports in scripts (../../src/) since tsx runs outside Next.js
- [02-02]: CF OCDS search API supports comma-separated stages (unlike FaT)
- [02-02]: CF uses publishedFrom/publishedTo date params (not updatedFrom/updatedTo)
- [02-02]: Per-release error handling for resilient batch mapping
- [02-03]: Signal upsert uses compound key {organizationName, signalType, title} for deduplication
- [02-03]: Buyer upsert uses {orgId} as unique identifier
- [02-03]: Static contractCount values for hackathon demo (real counts derivable post-ingestion)
- [02-03]: No LinkedIn data in contacts per project constraint -- empty string placeholder
- [03-01]: Presigned URL uploads to R2 -- server never handles file bytes, only generates signed URLs
- [03-01]: XHR for upload progress tracking -- fetch API lacks upload progress events
- [03-01]: Onboarding gate via Clerk middleware sessionClaims.metadata.onboardingComplete
- [03-01]: Steps 2-3 of wizard are placeholder shells -- Plan 02 implements AI generation and profile review
- [03-01]: Raw JSON schema over zodOutputFormat for Anthropic structured output -- avoids Zod 4 compatibility issues
- [03-02]: Dynamic import for pdf-parse -- avoids DOMMatrix build error in Next.js static generation
- [03-02]: window.location.href over router.push for post-onboarding redirect -- forces Clerk session token refresh
- [03-02]: Idempotent credit creation -- check for existing CreditAccount before creating signup bonus
- [03-02]: Tag-style inputs for array fields (sectors, capabilities, keywords, certifications, regions)
- [03-03]: Web content fetcher returns null on any failure for resilience (social media login walls expected)
- [03-03]: Claude extraction returns plain text (not JSON) to feed as additional context into profile prompt
- [03-03]: Promise.allSettled for parallel web fetching -- individual failures don't block others
- [03-03]: Relaxed API validation: require either documents OR company info (not both)
- [03-04]: Apify HTTP API with query param token auth (not Bearer header) per Apify's API design
- [03-04]: APIFY_API_TOKEN optional in env validation -- graceful degradation when not configured
- [03-04]: Promise.allSettled for parallel Apify actor calls -- company profile and posts fetched independently
- [03-04]: socialLinks replaced with linkedinUrl string field across entire stack (model, API, UI)
- [09-01]: LinkedIn logo has priority over og:image -- more reliable and specific to the company
- [09-01]: fetchWebContentWithOgImage as new function preserves backward compatibility of fetchWebContent
- [09-01]: logoUrl is NOT sent to Claude prompt -- extracted directly from data sources, not AI-generated
- [09-01]: logoUrl optional in ProfileData interface for backward compatibility with older callers
- [09-02]: No framer-motion -- tw-animate-css utility classes and Tailwind animate-pulse only
- [09-02]: 600ms delay between API completion and step transition for polished completion animation
- [09-02]: Plain img tag for logo (not Next.js Image) since URL is external and may not be in remotePatterns
- [09-02]: onError handler hides broken logo URLs gracefully instead of showing broken image placeholder
- [04-01]: URL-param-driven filters for shareability and browser back/forward navigation
- [04-01]: Record<string, 1 | -1> type annotation for Mongoose sort to avoid TypeScript union narrowing issue
- [04-01]: Excluded landing/ directory from tsconfig.json to fix pre-existing build error
- [04-02]: mongoose.isValidObjectId() before findById to prevent CastError on invalid IDs
- [04-02]: Value range display: "X - Y" when min/max differ, single value when same or only one exists
- [04-02]: estimatedDocumentCount() for fast approximate stats across contracts, buyers, signals collections
- [04-02]: Dashboard fetches stats + recent contracts in parallel with Promise.all
- [05-01]: Scoring prompt padded with CPV divisions, UK regions, procurement terminology to exceed 4096 tokens for Haiku prompt caching
- [05-01]: PUT /api/vibe-scanner for reset-to-default (regenerates from CompanyProfile) vs PATCH for user edits
- [05-01]: Embedded subdocuments for contractScores/buyerScores with _id:false for performance
- [05-01]: toObject() cast on Mongoose documents to access _id in API responses with InferSchemaType
- [05-02]: New Scanner model supports multiple scanners per user with type enum (rfps/meetings/buyers) -- evolving beyond single VibeScanner
- [05-02]: Default AI columns auto-populated per scanner type on creation (2 per type)
- [05-02]: AI query generation uses Claude Haiku structured JSON output with type-specific system prompts
- [05-02]: Radar icon replaces Sparkles for sidebar -- reflects multi-scanner monitoring concept
- [05-02]: Filters stored as flexible subdocument in Scanner model -- type-specific fields optional
- [05-03]: Composite key pattern (columnId:entityId) for scanner store scores -- flat Record over nested Maps for Zustand compatibility
- [05-03]: Separate getScore selector exported alongside store as standalone function
- [05-03]: API routes for signals and buyers data sources following existing contracts pattern
- [05-03]: ScoreBadge color thresholds: green >= 7, yellow >= 4, red < 4 on 10-point scale
- [05-04]: Scoring engine loads CompanyProfile and uses generateScoringPrompt() for base prompt since Scanner model lacks scoringPrompt field
- [05-04]: Signals model skipped for vibeScore source document updates -- model lacks vibeScore/vibeReasoning fields
- [05-04]: Score field uses type union ['number', 'null'] in JSON schema for text-only AI columns
- [05-04]: Promise.all collects concurrent results then yields sequentially for consistent event ordering per column
- [05-05]: Inline column creation (nanoid + $push) instead of separate lib/scanners.ts -- plan referenced non-existent file
- [05-05]: readSSEStream extracted as reusable helper for both Score All and single-column scoring flows
- [05-05]: $pull then $push for single-column score persistence -- idempotent re-scoring by column
- [05-06]: Threshold split rendering: above/below arrays with divider row instead of filter-based approach
- [05-06]: Collapsible below-threshold group with expand/collapse toggle when hide mode is active
- [05-06]: Column name map passed as prop from page to progress bar for decoupled components
- [05-06]: Legacy vibe-scanner page replaced with redirect (not deleted) for backward compatibility
- [10-01]: MongoClientOptions type cast needed due to @cloudflare/workers-types TLSSocket conflict
- [10-01]: @types/node added alongside @cloudflare/workers-types for mongodb driver type resolution
- [10-01]: valueMin uses minValue.amount falling back to value.amount for accurate OCDS range mapping
- [10-01]: buyerOrg extracted from OCDS party.id and buyer.id fields for Buyer schema mapping
- [10-02]: FaT dual-stage via closure variable and synthetic STAGE:award cursor -- clean FetchPageFn interface
- [10-02]: 60/40 budget split: FaT 5400 items (higher value) vs CF 3600 items per hourly invocation
- [10-02]: Sequential source processing (not parallel) to respect combined API rate limits
- [10-02]: BACKFILL_START_DATE env var overrides both default start dates for storage-constrained deployments
- [10-UAT]: FaT API parameter is `stages` (plural) not `stage` -- API changed since Phase 2 research
- [10-UAT]: CF base URL is `/Published/Notices/OCDS/Search` not `/Published/OCDS/Search`
- [10-UAT]: CF uses `links.next` full URLs for pagination (same as FaT, not bare cursor tokens)
- [10-UAT]: Worker deployed to https://tendhunt-data-sync.kozak-74d.workers.dev with hourly cron
- [06-01]: ContactReveal model tracks unlocks per-user (compound unique index) instead of Buyer.isRevealed
- [06-01]: estimatedDocumentCount for total buyers count matching contracts.ts pattern
- [06-01]: .npmrc with legacy-peer-deps to resolve marked peer conflict with glide-data-grid
- [06-01]: Excluded workers/ from tsconfig.json to fix pre-existing build error

### Pending Todos

1. **Enhance onboarding with company photo upload and AI analysis animations** (ui) — Add company logo upload to onboarding step 1, implement AI reasoning/task/chain-of-thought animations during profile generation using shadcn patterns
2. **Rebuild Notus feature skeleton screens with TendHunt-specific illustrations** (ui) — Replace generic AI agent skeletons (LLM selector, chat UI, integrations) with TendHunt feature illustrations (contract search, Vibe Scanner scoring, buyer contact reveal)
3. **Add custom data columns with field references and data types to scanner grid** (ui) — Users can add columns referencing entity fields (status, region, etc.) with configurable data types (Text, Number, Date, Badge, Currency, URL, Email, Checkbox, Paragraph). Detailed plan at `.claude/plans/wild-crafting-flurry.md`

### Roadmap Evolution

- Phase 9 added: Enhance Onboarding: Company Photo Upload + AI Analysis Animations
- Phase 11 added: Invoice & Spend Data Intelligence (local authority transparency spending CSV data, SME-friendliness scoring)

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 06-01-PLAN.md -- buyer APIs, credit APIs, credit store, sidebar balance
Next: Phase 6 Plan 02 (Buyer Profile UI) then Plan 03 (Contact Reveal Flow).
