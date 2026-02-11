---
phase: 03-onboarding-company-profile
plan: 04
subsystem: onboarding, api, linkedin, scraping
tags: [apify, linkedin-scraper, promise-allSettled, company-profile, env-validation, onboarding-simplification]

# Dependency graph
requires:
  - phase: 03-onboarding-company-profile-03
    provides: "Company info form with social links, web content fetching, Claude extraction, enriched AI profile generation"
provides:
  - "LinkedIn scraper utility via Apify actors (company profile + recent posts)"
  - "Simplified onboarding UI with single LinkedIn URL field (replaces multi-platform social links)"
  - "CompanyProfile schema with linkedinUrl string field (replaces socialLinks array)"
  - "API route that feeds LinkedIn company data and recent posts into Claude prompt"
  - "APIFY_API_TOKEN env validation (optional, graceful degradation)"
affects: [04-dashboard, 05-vibe-scanner, 06-buyer-credits]

# Tech tracking
tech-stack:
  added: [apify-http-api]
  patterns: [apify-actor-parallel-calls, linkedin-url-validation, optional-env-var-with-runtime-check]

key-files:
  created:
    - src/lib/linkedin-scraper.ts
  modified:
    - src/lib/env.ts
    - src/models/company-profile.ts
    - src/app/api/profile/generate/route.ts
    - src/app/onboarding/_actions.ts
    - src/components/onboarding/company-info-form.tsx
    - src/components/onboarding/onboarding-wizard.tsx
    - src/components/onboarding/profile-review.tsx
    - .env.example

key-decisions:
  - "Apify HTTP API with query param token auth (not Bearer header) per Apify's API design"
  - "APIFY_API_TOKEN optional in env validation -- graceful degradation when not configured"
  - "Promise.allSettled for parallel Apify actor calls -- company profile and posts fetched independently"
  - "30-second timeout per Apify actor call (actors take 10-20s typically)"
  - "Post content truncated to 500 chars max to keep Claude prompt within token limits"

patterns-established:
  - "Apify actor pattern: POST to run-sync-get-dataset-items with query param token, parse JSON array response"
  - "Optional env var pattern: z.string().optional().default('') in schema, runtime check before usage"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 3 Plan 04: LinkedIn Scraping via Apify Actors & Simplified Onboarding UI Summary

**Apify actors for LinkedIn company profile + recent posts scraping, replacing multi-platform social links with single LinkedIn URL input in onboarding**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T02:38:12Z
- **Completed:** 2026-02-11T02:42:42Z
- **Tasks:** 2 of 2 auto tasks completed
- **Files modified:** 9

## Accomplishments
- LinkedIn scraper utility calling two Apify actors in parallel: company profile (dev_fusion/Linkedin-Company-Scraper) and recent posts (harvestapi/linkedin-company-posts)
- API route updated to include LinkedIn company data (description, industry, size, specialties) and recent posts (last 5 with engagement) in Claude prompt
- Onboarding step 1 simplified from dynamic multi-platform social links to single LinkedIn Company Page URL field
- CompanyProfile Mongoose schema replaced socialLinks array with linkedinUrl string field
- All socialLinks references removed from entire codebase (model, API, actions, UI components)
- Profile review form updated with editable LinkedIn URL field
- Build passes clean with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: LinkedIn scraper utility using Apify actors and API route update** - `e1278ce` (feat)
2. **Task 2: Simplify onboarding UI to LinkedIn-only and update profile review** - `1afec6f` (feat)

## Files Created/Modified
- `src/lib/linkedin-scraper.ts` - LinkedIn data extraction via two Apify actors (company profile + recent posts) with parallel execution and graceful failure
- `src/lib/env.ts` - Added APIFY_API_TOKEN as optional server env var
- `src/models/company-profile.ts` - Replaced socialLinks array with linkedinUrl string field
- `src/app/api/profile/generate/route.ts` - Replaced social links web fetching with LinkedIn scraping via Apify, updated Claude prompt and output schema
- `src/app/onboarding/_actions.ts` - Updated ProfileData type: socialLinks -> linkedinUrl
- `src/components/onboarding/company-info-form.tsx` - Replaced dynamic social links UI with single LinkedIn URL input, removed Select/Button imports
- `src/components/onboarding/onboarding-wizard.tsx` - Updated state, API payload, and profile mapping for linkedinUrl
- `src/components/onboarding/profile-review.tsx` - Replaced social links section with LinkedIn URL input field
- `.env.example` - Added APIFY_API_TOKEN placeholder

## Decisions Made
- **Apify query param auth:** Apify API uses token as query parameter (not Bearer header), matching their official API design.
- **Optional env var:** APIFY_API_TOKEN uses `z.string().optional().default("")` in Zod schema with runtime check in scraper. This allows build to pass without the token configured, with graceful degradation at runtime.
- **Parallel actor calls:** Promise.allSettled for both Apify actors -- if company profile fetch fails, posts may still succeed (and vice versa).
- **30-second timeout:** Apify actors can take 10-20s, so 30s timeout provides headroom without blocking indefinitely.
- **Post content truncation:** Each LinkedIn post truncated to 500 chars to keep Claude prompt size manageable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made APIFY_API_TOKEN optional in env validation**
- **Found during:** Task 2 (build verification)
- **Issue:** Build failed because APIFY_API_TOKEN was required in env schema but not present in .env.local
- **Fix:** Changed env validation to `z.string().optional().default("")`, added runtime check in linkedin-scraper.ts
- **Files modified:** src/lib/env.ts, src/lib/linkedin-scraper.ts
- **Verification:** Build passes without APIFY_API_TOKEN configured
- **Committed in:** 1afec6f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for build to pass without Apify credentials configured. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required

To enable LinkedIn scraping during onboarding:
1. Sign up at https://apify.com and get an API token
2. Add `APIFY_API_TOKEN=your_token_here` to `.env.local`
3. The onboarding will work without the token -- LinkedIn data simply won't be included in AI generation

## Next Phase Readiness
- Phase 3 (Onboarding & Company Profile) fully complete with all 4 plans executed
- Full onboarding flow: Company Info (name, website, address, LinkedIn URL) + optional documents -> AI generation with LinkedIn enrichment -> Review/Edit -> Save to MongoDB
- CompanyProfile in MongoDB stores linkedinUrl field for future reference
- Ready for Phase 4 (Contract Dashboard) which depends on authenticated users with enriched profiles

---
*Phase: 03-onboarding-company-profile*
*Completed: 2026-02-11*
