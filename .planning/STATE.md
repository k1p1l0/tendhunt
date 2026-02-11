# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Suppliers discover relevant UK government contracts and reveal buyer contacts -- turning public procurement data into actionable sales intelligence through AI-powered scoring.
**Current focus:** Phase 4 COMPLETE -- Contract Dashboard (all plans done, ready for Phase 5)

## Current Position

Phase: 4 of 9 (Contract Dashboard) -- COMPLETE
Plan: 2 of 2 in current phase (COMPLETE)
Status: Phase 04 complete -- contract feed, detail view, dashboard stats all done
Last activity: 2026-02-11 -- Contract detail page + dashboard with real MongoDB stats

Progress: [▓▓▓▓▓▓▓▓▓░] 85%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 4.2 min
- Total execution time: 0.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 6 min | 3 min |
| 02-data-pipeline | 3/3 | 17 min | 5.7 min |
| 03-onboarding | 4/4 | 16 min | 4 min |
| 09-enhance-onboarding | 2/2 | 6 min | 3 min |
| 04-contract-dashboard | 2/2 | 7 min | 3.5 min |

**Recent Trend:**
- Last 5 plans: 03-04 (4 min), 09-01 (3 min), 09-02 (3 min), 04-01 (4 min), 04-02 (3 min)
- Trend: Consistent ~3-4 min per plan

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

### Pending Todos

1. **Enhance onboarding with company photo upload and AI analysis animations** (ui) — Add company logo upload to onboarding step 1, implement AI reasoning/task/chain-of-thought animations during profile generation using shadcn patterns
2. **Rebuild Notus feature skeleton screens with TendHunt-specific illustrations** (ui) — Replace generic AI agent skeletons (LLM selector, chat UI, integrations) with TendHunt feature illustrations (contract search, Vibe Scanner scoring, buyer contact reveal)

### Roadmap Evolution

- Phase 9 added: Enhance Onboarding: Company Photo Upload + AI Analysis Animations

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 04-02-PLAN.md (contract detail page + dashboard real stats)
Next plan: Phase 5 (Vibe Scanner) -- requires planning phase
