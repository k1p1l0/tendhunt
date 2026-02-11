---
phase: 03-onboarding-company-profile
plan: 03
subsystem: onboarding, ai, web-scraping, profile
tags: [company-info-form, web-content-fetching, claude-haiku, html-parsing, social-links, dynamic-form, promise-allSettled, separator-component]

# Dependency graph
requires:
  - phase: 03-onboarding-company-profile-01
    provides: "Upload infrastructure (R2 presigned URLs, dropzone, wizard shell), CompanyProfile model, Anthropic client, onboarding gate"
  - phase: 03-onboarding-company-profile-02
    provides: "Text extraction, AI profile generation endpoint, profile review form, completeOnboarding server action"
provides:
  - "CompanyProfile schema with website, address, socialLinks fields"
  - "Web content fetcher with HTML cleaning (src/lib/fetch-web-content.ts)"
  - "Claude Haiku web content extraction utility (src/lib/extract-web-info.ts)"
  - "Enriched AI profile generation combining documents + web content + company metadata"
  - "CompanyInfoForm component with name, website, address, dynamic social links"
  - "Wizard step 1 restructured: company info form above dropzone with separator"
  - "Profile review extended with website, address, social links editing"
  - "Continue button works with just company name or website (no documents required)"
affects: [04-dashboard, 05-vibe-scanner, 06-buyer-credits]

# Tech tracking
tech-stack:
  added: []
  patterns: [web-content-fetching-with-cleanup, claude-extraction-pipeline, parallel-web-fetch, dynamic-social-links-form]

key-files:
  created:
    - src/lib/fetch-web-content.ts
    - src/lib/extract-web-info.ts
    - src/components/onboarding/company-info-form.tsx
  modified:
    - src/models/company-profile.ts
    - src/app/api/profile/generate/route.ts
    - src/app/onboarding/_actions.ts
    - src/components/onboarding/onboarding-wizard.tsx
    - src/components/onboarding/profile-review.tsx

key-decisions:
  - "Web content fetcher returns null on any failure (4xx/5xx, timeout, size exceeded) for resilience"
  - "Claude extraction returns plain text (not JSON) to feed as additional context into main profile generation prompt"
  - "Promise.allSettled for parallel web fetching -- social media login walls expected to fail silently"
  - "Relaxed API validation: require either documents OR company info (not both) for profile generation"

patterns-established:
  - "Web content pipeline: fetch URL -> strip HTML noise -> extract via Claude Haiku -> feed as context"
  - "Dynamic social links form: Select for platform + Input for URL + remove button, max 5 links"
  - "Separator pattern: relative container with absolute centered span over Separator for section labels"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 3 Plan 03: Company Info Fields & Web Content Enrichment Summary

**Company info form (name, website, address, social links) in onboarding step 1 with Claude Haiku web content extraction for enriched AI profile generation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T02:02:04Z
- **Completed:** 2026-02-11T02:05:52Z
- **Tasks:** 2 of 2 auto tasks completed
- **Files modified:** 8

## Accomplishments
- CompanyProfile Mongoose schema extended with website, address, and socialLinks (platform enum + URL) fields
- Web content fetcher with HTML noise stripping (removes scripts, styles, nav, footer, comments, collapses whitespace), 5-second timeout, and 500KB size limit
- Claude Haiku extraction utility converts raw webpage text into concise company summaries for profile enrichment
- AI profile generation endpoint accepts companyInfo alongside documents, fetches website and social link content in parallel via Promise.allSettled, combines all sources into enriched context
- CompanyInfoForm component with dynamic social links (LinkedIn, X/Twitter, Facebook, Instagram, Other) and max 5 links
- Wizard step 1 restructured: company info form above dropzone with "Optional" separator, Continue works with just company name or website
- Profile review form extended with editable website URL, address, and dynamic social links fields
- API validation relaxed: either documents or company info sufficient for profile generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema update, web content fetching, Claude-based extraction, and API route enrichment** - `17cf406` (feat)
2. **Task 2: Company info form component, wizard integration, and profile review extension** - `4bac6cb` (feat)

## Files Created/Modified
- `src/lib/fetch-web-content.ts` - Server-side URL fetcher with HTML cleaning, timeout, size limits
- `src/lib/extract-web-info.ts` - Claude Haiku web content extraction returning plain text summaries
- `src/components/onboarding/company-info-form.tsx` - Company info form with name, website, address, dynamic social links
- `src/models/company-profile.ts` - Added website, address, socialLinks fields to schema
- `src/app/api/profile/generate/route.ts` - Major update: accepts companyInfo, parallel web fetching, enriched context building
- `src/app/onboarding/_actions.ts` - Extended ProfileData interface with website, address, socialLinks
- `src/components/onboarding/onboarding-wizard.tsx` - Restructured step 1 with company info form, updated AI generation flow
- `src/components/onboarding/profile-review.tsx` - Extended with website, address, social links editing fields

## Decisions Made
- **Web content fetcher resilience:** Returns null on any failure (timeout, HTTP errors, oversized pages). Social media login walls (LinkedIn, X) are expected to fail silently.
- **Claude extraction as plain text:** Returns plain text summaries rather than structured JSON. This feeds into the main profile generation prompt as additional context, letting the primary Claude call do the structuring.
- **Promise.allSettled for parallel fetching:** Website and social link content are fetched in parallel. Individual failures don't block other extractions.
- **Relaxed API validation:** Profile generation no longer requires documents. Company name and/or website alone are sufficient to trigger AI generation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

No additional setup beyond what Plans 01 and 02 required. The web content fetching uses standard server-side fetch (no additional API keys needed).

## Next Phase Readiness
- Full onboarding flow complete with company info enrichment: Company Info + Documents -> AI Generate (with web content) -> Review/Edit -> Save
- CompanyProfile in MongoDB stores all fields including website, address, socialLinks
- Phase 3 (Onboarding & Company Profile) is fully complete -- all 3 plans executed
- Ready for Phase 4 (Contract Dashboard) which depends on authenticated users with enriched profiles

---
*Phase: 03-onboarding-company-profile*
*Completed: 2026-02-11*
