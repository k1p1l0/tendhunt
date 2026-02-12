# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Suppliers discover relevant UK government contracts and reveal buyer contacts -- turning public procurement data into actionable sales intelligence through AI-powered scoring.
**Current focus:** Phase 19 COMPLETE (4/4 plans), Phase 11 IN PROGRESS (1/5 plans), Phase 15 IN PROGRESS (1/2 plans)

## Current Position

Phase: 19 COMPLETE, 18 COMPLETE, 11 + 15 in progress
Plan: 19 ALL COMPLETE (4/4), 18 ALL COMPLETE (4/4), 11-01 COMPLETE (1/5), 15-01 COMPLETE (1/2)
Status: Phase 19 Plan 04 complete -- Agent panel polish (Cmd+K shortcut, DOMPurify markdown, error retry, animations, accessibility)
Last activity: 2026-02-12 - Completed quick task 1: Add PDF spend file parsing to spend-ingest worker pipeline with R2 storage

Progress: [▓▓▓▓▓▓▓▓▓▓] ~92% (Phases 11, 15 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 46
- Average duration: 3.4 min
- Total execution time: 2.73 hours

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
| 06-buyer-intelligence | 3/3 | 8 min | 2.7 min |
| 12-settings-profile | 3/3 | 11 min | 3.7 min |
| 13-buyer-data-enrichment | 6/6 | 23 min | 3.8 min |
| 14-buyer-explorer-filters | 3/3 | 9 min | 3 min |
| 15-buyer-dedup-linkedin-data-detail-page | 1/2 | 3 min | 3 min |
| 11-invoice-spend-data-intelligence | 1/5 | 4 min | 4 min |
| 18-admin-panel | 4/4 | 15 min | 3.8 min |
| 19-research-agent-chat-panel | 4/4 | 10 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 19-04 (3 min), 19-03 (3 min), 19-02 (2 min), 19-01 (2 min), 18-03 (4 min)
- Trend: Consistent ~2-4 min per plan

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
- [06-02]: BuyerDetailClient wrapper manages isUnlocked state client-side for reactive blur-to-reveal without page refresh
- [06-02]: Deterministic attribute scores via hashCode(name + attribute) % 60 + 30 for consistent 30-90 range
- [06-02]: BuyerBreadcrumb as separate client component for clean server/client boundary in Next.js 16
- [06-02]: UnlockButton integrated directly into ContactsTab for immediate unlock flow
- [06-03]: Atomic findOneAndUpdate with $gte:1 filter for credit deduction -- single operation prevents double-spend
- [06-03]: Server balance as source of truth -- setBalance(data.balance) from API response, not local decrement
- [06-03]: BuyerDetailClient wraps server component page for local isUnlocked state management
- [06-03]: Contract card buyer name links to buyer profile for cross-entity navigation
- [12-01]: ThemeProvider (next-themes) in root layout for sonner useTheme compatibility -- also enables future dark mode
- [12-01]: PATCH /api/profile whitelist approach -- only allowed fields updatable, prevents overwriting logoUrl/documentKeys/userId
- [12-01]: Profile PATCH upserts (findOneAndUpdate with upsert:true) so first edit auto-creates profile
- [12-03]: SidebarFooterContent named export (not SidebarFooter) to avoid naming conflict with shadcn SidebarFooter from @/components/ui/sidebar
- [12-03]: Company logo Avatar uses rounded-md (square), Clerk fallback uses default rounded (circle) -- visual distinction for workspace vs user identity
- [12-03]: Custom event pattern: profile-updated event with { logoUrl, companyName } detail for cross-component sync
- [12-02]: TagInput extracted to shared component at src/components/ui/tag-input.tsx with onBlur prop for auto-save
- [12-02]: Array refs pattern prevents stale closure when onBlur fires in same tick as onChange
- [12-02]: logoUrl and documentKeys added to PATCH whitelist -- Settings page is authorized editor for these fields
- [12-02]: Auto-save pattern: useDebouncedCallback(300ms) + comparison check against initialRef prevents duplicate saves
- [13-01]: Runtime markdown parsing over hardcoded arrays for DATA_SOURCES.md seed script -- maintainable when spec updates
- [13-01]: Abolished/merged orgs tracked with status field and successorOrg -- preserves historical data and org lineage
- [13-01]: Tier 1 expansion orgs use numbered placeholder entries to reach target counts (1,154 MATs, 165 universities, 228 FE colleges)
- [13-01]: DataSource as canonical org registry -- all enrichment stages reference this collection
- [13-02]: Name normalization strips 16 institutional patterns before fuzzy matching for robust UK org matching
- [13-02]: Fuse.js threshold 0.3 with ignoreLocation for strict-but-flexible fuzzy matching
- [13-02]: Unimplemented stages gracefully log and auto-complete so pipeline can always progress
- [13-02]: Per-domain rate limiter tracks last request time per hostname within single Worker invocation
- [13-06]: SVG circle with stroke-dasharray for enrichment score (no third-party lib)
- [13-06]: Green/yellow/red thresholds at 70/40 for enrichment badge and confidence bars
- [13-06]: Tabs additive only: Board Documents and Key Personnel inserted after Signals, before Attributes
- [13-06]: Empty states always shown (not hidden tabs) for non-enriched buyers
- [13-03]: Double-parse pattern for ModernGov SOAP: outer envelope parse, then inner GetMeetingsResult XML string re-parse
- [13-03]: Batch size 20 for Stage 3 (vs 100 for Stage 2) because each buyer requires HTTP calls
- [13-03]: testConnection uses raw fetch with 5s AbortController timeout (not fetchWithDomainDelay) for quick health checks
- [13-03]: $nin filter for democracyPortalUrl to exclude both null and empty string in single MongoDB operator
- [13-04]: HTML extraction uses regex strip (scripts/styles/tags) -- no DOM parser needed for text-only extraction
- [13-04]: Stage 4 tries URLs in priority order: boardPapersUrl > democracyPortalUrl > website/about/board > website/about/governance
- [13-04]: Stage 5 uses p-limit(2) for concurrent Claude API calls to balance throughput vs rate limits
- [13-04]: Combined text from up to 3 board documents, max 8000 chars, for Claude Haiku context window
- [13-04]: 10-second AbortController timeout per fetch to avoid blocking on unresponsive sites
- [13-04]: Typed Collection<T> parameters for helper functions to avoid MongoDB generic type inference conflicts
- [13-05]: Score weights sum to exactly 100: orgType(15) + governance(10) + boardPapers(10) + website(5) + description(5) + staff(10) + budget(10) + personnel(20) + docs(15)
- [13-05]: Batch aggregate queries for keypersonnel/boarddocuments counts instead of per-buyer countDocuments
- [13-05]: Full Record<EnrichmentStage, StageFn> (not Partial) since all 6 stages are implemented
- [14-01]: ContactReveal import kept in buyers.ts because fetchBuyerById still uses it -- Plan 02 will simplify
- [14-01]: Credit gating fully removed from all buyer detail components (isUnlocked, UnlockButton, blur effects)
- [14-01]: Filter values cleaned (null/empty removed) and sorted alphabetically for dropdown UX
- [14-02]: orgTypeLabel duplicated in buyer-table.tsx (same as buyer-header.tsx) -- keeps components self-contained
- [14-02]: Score color thresholds 70/40 (green/yellow/red) match enrichment badge convention from Phase 13
- [14-02]: Website column shows domain-only text via URL parsing (strips protocol + www prefix)
- [14-03]: Dynamic dropdown population via Buyer.distinct() queries -- not hardcoded filter values
- [14-03]: fetchBuyerById simplified: removed ContactReveal query and userId param (credit gating fully removed from data layer)
- [14-03]: filteredCount drives pagination; footer shows filtered vs total count when filters active
- [15-01]: autoExtractBuyers returns buyerIdMap via follow-up find() after bulkWrite -- bulkWrite only returns upsertedIds for new docs
- [15-01]: Sync engine order reversed: extract buyers FIRST (get IDs), THEN upsert contracts (with IDs)
- [15-01]: Static NUTS mapping includes both 2016 and 2021 codes for Scotland (UKM2/M3 + UKM5-M9) and London (UKI1/I2 + UKI3-I7)
- [15-01]: buyerId stored as indexed ObjectId with ref on Contract schema for O(1) buyer detail page queries
- [11-01]: Exact enrichment Worker pattern for spend-ingest Worker (same engine, stage, job tracking architecture)
- [11-01]: SpendTransaction compound dedup key: buyerId + date + vendor + amount + reference
- [11-01]: Weekly cron (Monday 3AM UTC) vs hourly for enrichment -- spend data changes less frequently
- [11-01]: Default maxItemsPerRun 200 (vs 500 for enrichment) -- spend parsing is heavier per item
- [18-01]: Admin role guard checks publicMetadata.role via Clerk backend API (not JWT claims) -- ensures fresh role data
- [18-01]: Simplified header with pathname-based page name lookup instead of breadcrumb context
- [18-01]: .env.example (not .env.local.example) to match .gitignore exception pattern
- [18-04]: NonNullable cast for mongoose.connection.db to avoid mongodb type version conflicts between mongoose-bundled and direct mongodb types
- [18-02]: Native MongoDB queries via mongoose.connection.db instead of duplicating Mongoose models in admin app
- [18-02]: Status derivation logic: running > error > complete > idle precedence for overall worker status
- [18-02]: Cache-Control: no-store on API responses to ensure polling always gets fresh data
- [18-02]: Collapsible error log on workers detail page to keep UI clean by default
- [18-04]: Purple badge for admin role, secondary badge for user role -- visual role distinction in user table
- [18-04]: Summary stats computed client-side via useMemo over fetched users array -- avoids separate API endpoint
- [18-03]: DataTable uses { _id?: unknown } constraint instead of Record<string, unknown> for typed interface compatibility
- [18-03]: Client-side sorting sufficient for 100-item dataset -- no server-side sort endpoint
- [18-03]: Enrichment score thresholds 70/40 (green/yellow/red) match Phase 13 convention
- [19-01]: Reuse existing fetchBuyers/fetchContracts/fetchBuyerById/fetchContractById for agent tool handlers -- zero query duplication
- [19-01]: Sliding window of last 10 messages to manage Sonnet token budget
- [19-01]: Max 5 tool-use iterations to prevent infinite agent loops
- [19-01]: Web search returns stub for MVP -- internal data tools are the priority
- [19-01]: EnrichmentScore filter applied client-side since fetchBuyers interface doesn't support it natively
- [19-02]: AgentProvider wraps inside BreadcrumbProvider for access to both contexts
- [19-02]: Sheet showCloseButton=false with custom close button in AgentPanelHeader for consistent header layout
- [19-02]: getActiveMessages as standalone selector function (not computed store property) for Zustand compatibility
- [19-02]: marked.parse with sync mode and dangerouslySetInnerHTML for assistant markdown rendering
- [19-02]: Auto-create conversation on first message send if none active (nanoid for IDs)
- [19-02]: useAgentStore.getState() for header button to avoid unnecessary re-renders
- [19-03]: useAgent hook manages full lifecycle (send, stream, abort, new conversation) -- panel components become props-driven
- [19-03]: AgentContextSetter component pattern for server component pages that cannot use hooks
- [19-03]: Conversation persistence happens server-side after stream completion, not fire-and-forget from client
- [19-03]: conversation_id SSE event sent back to client so subsequent messages update the same MongoDB document
- [19-03]: AgentInput gets isStreaming as prop (not from store) for explicit prop-driven control
- [19-04]: DOMPurify with explicit ALLOWED_TAGS whitelist for safe markdown rendering (no raw HTML injection)
- [19-04]: marked link renderer override for target=_blank and rel=noopener noreferrer on all links
- [19-04]: useReducedMotion from motion/react (not custom hook) for accessibility
- [19-04]: isError flag on AgentMessage + removeMessage store method for retry flow
- [19-04]: min-h-[44px] on all interactive buttons for mobile tap target compliance

### Pending Todos

1. **Enhance onboarding with company photo upload and AI analysis animations** (ui) — Add company logo upload to onboarding step 1, implement AI reasoning/task/chain-of-thought animations during profile generation using shadcn patterns
2. **Rebuild Notus feature skeleton screens with TendHunt-specific illustrations** (ui) — Replace generic AI agent skeletons (LLM selector, chat UI, integrations) with TendHunt feature illustrations (contract search, Vibe Scanner scoring, buyer contact reveal)
3. **Add custom data columns with field references and data types to scanner grid** (ui) — Users can add columns referencing entity fields (status, region, etc.) with configurable data types (Text, Number, Date, Badge, Currency, URL, Email, Checkbox, Paragraph). Detailed plan at `.claude/plans/wild-crafting-flurry.md`

### Roadmap Evolution

- Phase 9 added: Enhance Onboarding: Company Photo Upload + AI Analysis Animations
- Phase 11 added: Invoice & Spend Data Intelligence (local authority transparency spending CSV data, SME-friendliness scoring)
- Phase 13 added: Buyer Data Enrichment (6-stage enrichment pipeline, 4 new collections, Cloudflare Worker, 2,368 org DATA_SOURCES spec)
- Phase 14 added: Buyer Explorer Filters & Data Visibility (filter dropdowns, enrichment columns, remove credit gating, server-side filtering)
- Phase 15 added: Contract-Buyer Entity Linking, Region Humanization & Contract Page Enhancement
- Phase 18 added: Admin Panel (admin app scaffold, overview dashboard, workers management, data/users pages)
- Phase 19 added: Research Agent Chat Panel (backend tools, SSE streaming, chat UI, conversation persistence)

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Add PDF spend file parsing to spend-ingest worker pipeline with R2 storage | 2026-02-12 | dcf5616 | [1-add-pdf-spend-file-parsing-to-spend-inge](./quick/1-add-pdf-spend-file-parsing-to-spend-inge/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed quick-1-PLAN.md -- PDF spend file parsing added to spend-ingest worker and enrich-buyer script
Next: Phase 19 COMPLETE. Pending: 11-02, 15-02.
