---
phase: 03-onboarding-company-profile
plan: 01
subsystem: onboarding, upload, middleware
tags: [react-dropzone, aws-sdk-s3, presigned-urls, cloudflare-r2, anthropic-sdk, clerk-middleware, onboarding-gate, mongoose, nanoid]

# Dependency graph
requires:
  - phase: 01-foundation-02
    provides: "Mongoose models (CreditAccount/CreditTransaction), Clerk auth, dashboard shell, sidebar"
provides:
  - "R2 S3-compatible client singleton (src/lib/r2.ts)"
  - "Anthropic client singleton (src/lib/anthropic.ts)"
  - "CompanyProfile Mongoose model with all profile fields"
  - "Presigned URL upload endpoint (/api/upload/presigned)"
  - "Onboarding gate in middleware (redirect non-onboarded to /onboarding)"
  - "3-step onboarding wizard shell (Upload, Generate, Review)"
  - "DocumentDropzone with drag-and-drop, XHR progress, file removal"
  - "UploadProgress per-file status display"
  - "CustomJwtSessionClaims type for Clerk session metadata"
  - "Updated env validation for R2 and Anthropic env vars"
affects: [03-onboarding-company-profile-02, 04-dashboard, 05-vibe-scanner]

# Tech tracking
tech-stack:
  added: [react-dropzone, "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "@anthropic-ai/sdk", pdf-parse, officeparser, nanoid]
  patterns: [presigned-url-upload, clerk-onboarding-gate, xhr-progress-tracking, onboarding-wizard-steps]

key-files:
  created:
    - src/lib/r2.ts
    - src/lib/anthropic.ts
    - src/models/company-profile.ts
    - src/types/globals.d.ts
    - src/app/api/upload/presigned/route.ts
    - src/app/onboarding/layout.tsx
    - src/app/onboarding/page.tsx
    - src/components/onboarding/document-dropzone.tsx
    - src/components/onboarding/upload-progress.tsx
    - src/components/onboarding/onboarding-wizard.tsx
  modified:
    - src/lib/env.ts
    - src/proxy.ts
    - .env.example
    - package.json
    - scripts/lib/db.ts

key-decisions:
  - "Presigned URL uploads to R2 -- server never handles file bytes, only generates signed URLs"
  - "XHR for upload progress tracking -- fetch API lacks upload progress events"
  - "Onboarding gate in Clerk middleware -- sessionClaims.metadata.onboardingComplete check"
  - "Steps 2-3 of wizard are placeholder shells -- Plan 02 implements AI generation and profile review"
  - "Raw JSON schema over zodOutputFormat for Anthropic structured output -- avoids Zod 4 compatibility issues"

patterns-established:
  - "Presigned URL pattern: client POSTs to /api/upload/presigned, receives { url, key }, PUTs file directly to R2"
  - "Onboarding gate: proxy.ts checks sessionClaims.metadata.onboardingComplete, redirects to /onboarding if falsy"
  - "Onboarding layout: separate from dashboard, minimal branding header, no sidebar"
  - "Upload progress: XHR with upload.onprogress, state tracked per-file with status enum"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 3 Plan 01: Onboarding Upload Infrastructure Summary

**Presigned URL upload pipeline to Cloudflare R2 with drag-and-drop dropzone inside a 3-step onboarding wizard, gated by Clerk middleware session claims**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T01:16:24Z
- **Completed:** 2026-02-11T01:20:36Z
- **Tasks:** 2 of 2 auto tasks completed
- **Files modified:** 15

## Accomplishments
- R2 S3-compatible client and Anthropic client singletons created for document upload and AI profile generation
- CompanyProfile Mongoose model with 14 fields covering all profile aspects (sectors, capabilities, keywords, certifications, regions, etc.)
- Presigned URL API endpoint with content type validation (PDF, DOCX, DOC, TXT) and nanoid-based unique keys
- Clerk middleware onboarding gate redirecting non-onboarded users to /onboarding, allowing onboarding route access
- 3-step onboarding wizard shell with step indicator and navigation (Upload, Generate, Review)
- Document dropzone with react-dropzone integration, XHR upload progress tracking, per-file status display, and file removal
- Environment validation extended for R2 and Anthropic credentials

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependencies, R2/Anthropic clients, CompanyProfile model, env, types** - `9b7510d` (feat)
2. **Task 2: Presigned URL route, onboarding gate, wizard with dropzone** - `1dfa542` (feat)

## Files Created/Modified
- `src/lib/r2.ts` - R2 S3-compatible client singleton
- `src/lib/anthropic.ts` - Anthropic client singleton
- `src/models/company-profile.ts` - CompanyProfile Mongoose schema with all profile fields
- `src/types/globals.d.ts` - CustomJwtSessionClaims for onboarding metadata
- `src/lib/env.ts` - Added R2 and Anthropic env vars to server validation
- `.env.example` - Added R2 and Anthropic placeholder env vars
- `src/app/api/upload/presigned/route.ts` - Presigned URL generation with auth and content type validation
- `src/proxy.ts` - Onboarding gate: redirect non-onboarded users, allow onboarding route
- `src/app/onboarding/layout.tsx` - Onboarding layout with auth guard and branding header
- `src/app/onboarding/page.tsx` - Renders OnboardingWizard component
- `src/components/onboarding/document-dropzone.tsx` - Drag-and-drop file upload with XHR progress tracking
- `src/components/onboarding/upload-progress.tsx` - Per-file progress display with status icons
- `src/components/onboarding/onboarding-wizard.tsx` - 3-step wizard shell with step indicator
- `package.json` - 7 new dependencies (react-dropzone, aws-sdk, anthropic-sdk, pdf-parse, officeparser, nanoid)
- `scripts/lib/db.ts` - Fixed TypeScript narrowing for MONGODB_URI

## Decisions Made
- **Presigned URL uploads:** Server only generates signed URLs, client uploads directly to R2. This avoids serverless function memory limits and reduces latency.
- **XHR over fetch for uploads:** XMLHttpRequest provides `upload.onprogress` events; the Fetch API does not support upload progress natively.
- **Onboarding gate via session claims:** Uses Clerk `publicMetadata.onboardingComplete` synced to session token JWT claims, checked in middleware.
- **Placeholder steps 2-3:** Wizard shell with placeholder content for "Generate" and "Review" steps, to be implemented in Plan 02 with AI profile generation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed scripts/lib/db.ts TypeScript narrowing**
- **Found during:** Task 1 (build verification)
- **Issue:** `MONGODB_URI` declared as `string | undefined` from `process.env`, TypeScript narrowing doesn't propagate past the `if (!MONGODB_URI) throw` guard to the `const` declaration.
- **Fix:** Moved the guard before the const declaration and added explicit `string` type annotation.
- **Files modified:** scripts/lib/db.ts
- **Verification:** `npm run build` succeeds
- **Committed in:** 9b7510d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard TypeScript narrowing fix on pre-existing code. No scope creep.

## Issues Encountered
None beyond the pre-existing TypeScript narrowing issue documented above.

## User Setup Required

**External services require manual configuration before testing the upload flow:**

1. **Cloudflare R2** - File storage
   - Create R2 bucket named `tendhunt-documents` in Cloudflare Dashboard
   - Configure CORS: AllowedOrigins [https://app.tendhunt.com, http://localhost:3000], AllowedMethods [GET, PUT], AllowedHeaders [Content-Type], ExposeHeaders [ETag]
   - Create R2 API token and add to `.env.local`: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

2. **Anthropic API** - AI profile generation (used in Plan 02)
   - Create API key at Anthropic Console
   - Add ANTHROPIC_API_KEY to `.env.local`

3. **Clerk After Sign-Up URL** - Update redirect
   - Change NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL from `/dashboard` to `/onboarding` in `.env.local`

## Next Phase Readiness
- Upload pipeline complete: presigned URL generation, direct R2 upload with progress, file list management
- Onboarding gate active: middleware redirects non-onboarded users, wizard shell renders
- Plan 02 can extend wizard steps 2-3 with AI profile generation (text extraction, Claude Haiku, profile review/edit)
- Plan 02 can add completeOnboarding server action with credit bonus and Clerk metadata update
- CompanyProfile model ready for storing AI-generated profiles

---
*Phase: 03-onboarding-company-profile*
*Completed: 2026-02-11*
