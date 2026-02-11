---
phase: 12-settings-profile
plan: 01
subsystem: api
tags: [sonner, toast, next-themes, r2, presigned-url, profile-api, auto-save]

# Dependency graph
requires:
  - phase: 03-onboarding
    provides: CompanyProfile model, R2 presigned URL pattern, fetchWebContentWithOgImage, scrapeLinkedInCompany
  - phase: 01-foundation
    provides: Clerk auth, MongoDB connection, R2 client
provides:
  - GET /api/profile endpoint for fetching user profile
  - PATCH /api/profile endpoint with field-level whitelist updates
  - POST /api/profile/logo endpoint for presigned logo upload URLs
  - POST /api/profile/logo-extract endpoint for re-extracting logo from website/LinkedIn
  - DELETE /api/profile/documents endpoint for R2 + MongoDB atomic document removal
  - Sonner toast notification system in root layout with ThemeProvider
affects: [12-02-settings-ui, 12-03-sidebar]

# Tech tracking
tech-stack:
  added: [sonner, next-themes]
  patterns: [field-level-patch-whitelist, presigned-logo-upload, idempotent-r2-delete, theme-provider-in-layout]

key-files:
  created:
    - src/app/api/profile/route.ts
    - src/app/api/profile/logo/route.ts
    - src/app/api/profile/logo-extract/route.ts
    - src/app/api/profile/documents/route.ts
    - src/components/ui/sonner.tsx
  modified:
    - src/app/layout.tsx
    - package.json

key-decisions:
  - "ThemeProvider (next-themes) added to root layout for sonner useTheme hook compatibility"
  - "PATCH profile uses whitelist approach — only allowed fields can be updated, prevents overwriting logoUrl/documentKeys/userId"
  - "Profile PATCH upserts — creates profile if none exists, simplifying first-edit flow"

patterns-established:
  - "Field-level PATCH with whitelist: validate allowed fields server-side before $set"
  - "Presigned logo upload: client gets signed URL, uploads directly to R2, no server byte handling"
  - "Idempotent R2 delete: DeleteObjectCommand succeeds even if key doesn't exist"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 12 Plan 01: API Infrastructure & Toast System Summary

**6 profile API endpoints (GET/PATCH profile, POST logo upload/re-extract, DELETE document) with sonner toast notifications and ThemeProvider in root layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T22:01:48Z
- **Completed:** 2026-02-11T22:04:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Profile GET/PATCH API with field-level whitelist and upsert for auto-save support
- Logo management: presigned R2 upload URL generation and website/LinkedIn logo re-extraction
- Document deletion with atomic R2 + MongoDB cleanup
- Sonner toast system with ThemeProvider integrated into root layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Install sonner, add Toaster to root layout, create profile GET/PATCH API** - `1316345` (feat)
2. **Task 2: Create logo upload, logo re-extract, and document delete APIs** - `e959b91` (feat)

## Files Created/Modified
- `src/components/ui/sonner.tsx` - Sonner toast component from shadcn/ui with theme support
- `src/app/layout.tsx` - Added ThemeProvider and Toaster to root layout
- `src/app/api/profile/route.ts` - GET (fetch profile) and PATCH (whitelist field update with upsert)
- `src/app/api/profile/logo/route.ts` - POST generates presigned R2 URL for image uploads (jpeg, png, svg, webp, gif)
- `src/app/api/profile/logo-extract/route.ts` - POST re-runs logo extraction from website og:image and LinkedIn (LinkedIn priority)
- `src/app/api/profile/documents/route.ts` - DELETE removes file from R2 and key from CompanyProfile.documentKeys
- `package.json` - Added sonner and next-themes dependencies

## Decisions Made
- ThemeProvider (next-themes) added to root layout for sonner's useTheme hook compatibility — also enables future dark mode support
- PATCH profile uses whitelist approach: only companyName, website, address, linkedinUrl, summary, sectors, capabilities, keywords, certifications, idealContractDescription, companySize, regions can be updated (prevents overwriting logoUrl, documentKeys, userId, etc.)
- Profile PATCH uses upsert (findOneAndUpdate with upsert: true) so first edit auto-creates the profile document
- Logo upload presigned URLs expire after 300 seconds (5 min) vs 3600 seconds (1 hour) for document uploads, since logo uploads are quick

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ThemeProvider for sonner useTheme compatibility**
- **Found during:** Task 1 (Toaster integration)
- **Issue:** Sonner component imports useTheme from next-themes, which requires ThemeProvider ancestor
- **Fix:** Wrapped body children with ThemeProvider in root layout, added suppressHydrationWarning on html tag
- **Files modified:** src/app/layout.tsx
- **Verification:** TypeScript compiles clean, no hydration warnings expected
- **Committed in:** 1316345 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** ThemeProvider is required for sonner to work — no scope creep, enables future dark mode.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 API endpoints ready for Settings page UI in Plan 02
- toast() can be imported from sonner in any client component for save feedback
- Sidebar restructure in Plan 03 can use GET /api/profile for company logo and name
- Logo upload and re-extract endpoints ready for Settings page logo management section

## Self-Check: PASSED

All 7 files verified present. Both task commits (1316345, e959b91) confirmed in git log.

---
*Phase: 12-settings-profile*
*Completed: 2026-02-11*
