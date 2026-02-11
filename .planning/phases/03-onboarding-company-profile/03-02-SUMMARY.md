---
phase: 03-onboarding-company-profile
plan: 02
subsystem: onboarding, ai, profile, credits
tags: [anthropic-sdk, claude-haiku, structured-output, pdf-parse, officeparser, server-actions, clerk-metadata, mongoose, tag-input, onboarding-wizard]

# Dependency graph
requires:
  - phase: 03-onboarding-company-profile-01
    provides: "Upload infrastructure (R2 presigned URLs, dropzone, wizard shell), CompanyProfile model, Anthropic client, onboarding gate"
provides:
  - "Text extraction from PDF/DOCX/TXT (src/lib/extract-text.ts)"
  - "AI profile generation endpoint using Claude Haiku 4.5 with structured JSON output (/api/profile/generate)"
  - "Editable profile review form with tag-style inputs for array fields (ProfileReview)"
  - "completeOnboarding server action: saves profile, creates 10 SIGNUP_BONUS credits, updates Clerk publicMetadata"
  - "Complete 3-step onboarding wizard: Upload -> AI Generate -> Review/Edit/Save"
affects: [04-dashboard, 05-vibe-scanner, 06-buyer-credits]

# Tech tracking
tech-stack:
  added: [shadcn-textarea, shadcn-select, shadcn-label]
  patterns: [dynamic-import-pdf-parse, ai-structured-output, tag-input-component, server-action-onboarding, idempotent-credit-creation]

key-files:
  created:
    - src/lib/extract-text.ts
    - src/app/api/profile/generate/route.ts
    - src/app/onboarding/_actions.ts
    - src/components/onboarding/profile-review.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx
    - src/components/ui/label.tsx
  modified:
    - src/components/onboarding/onboarding-wizard.tsx

key-decisions:
  - "Dynamic import for pdf-parse to avoid DOMMatrix build error in Next.js static generation"
  - "Raw JSON schema for Anthropic output_config (no Zod helpers) to avoid Zod 4 compatibility issues"
  - "window.location.href over router.push for post-onboarding redirect -- forces Clerk session token refresh"
  - "Idempotent credit creation: check for existing CreditAccount before creating signup bonus"
  - "Tag-style inputs for array fields: comma/Enter to add, Backspace to remove last, click X to remove specific"

patterns-established:
  - "Dynamic import pattern for Node.js-only libraries that pull in browser APIs at module level"
  - "Structured AI output: anthropic.messages.create with output_config.format.type='json_schema'"
  - "Server action pattern: 'use server' + auth() + dbConnect() + upsert + return {success/error}"
  - "TagInput component: reusable array field editor with badges and inline input"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 3 Plan 02: AI Profile Generation & Onboarding Completion Summary

**Claude Haiku 4.5 generates structured company profiles from uploaded documents with editable review form, 10-credit signup bonus, and Clerk metadata completion flow**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T01:23:23Z
- **Completed:** 2026-02-11T01:28:04Z
- **Tasks:** 2 of 2 auto tasks completed
- **Files modified:** 8

## Accomplishments
- Text extraction pipeline handles PDF (pdf-parse), DOCX/DOC (officeparser v6), and TXT with graceful fallback for scanned/empty documents
- AI profile generation via Claude Haiku 4.5 with structured JSON output using output_config (not tool_choice or Zod helpers)
- ProfileReview component with editable form fields including tag-style inputs for array fields (sectors, capabilities, keywords, certifications, regions)
- completeOnboarding server action: upserts CompanyProfile, creates idempotent CreditAccount with 10 SIGNUP_BONUS credits, updates Clerk publicMetadata
- Complete 3-step onboarding wizard: Upload documents -> AI generates profile -> Review/edit/save -> redirect to dashboard
- Skip flow allows manual profile entry without document upload

## Task Commits

Each task was committed atomically:

1. **Task 1: Text extraction utility and AI profile generation endpoint** - `af4ebec` (feat)
2. **Task 2: Profile review form, onboarding completion, and full wizard integration** - `053e59a` (feat)

## Files Created/Modified
- `src/lib/extract-text.ts` - PDF/DOCX/TXT text extraction with dynamic imports for build compatibility
- `src/app/api/profile/generate/route.ts` - AI profile generation endpoint using Claude Haiku 4.5 structured output
- `src/app/onboarding/_actions.ts` - Server action: save profile, create credits, update Clerk metadata
- `src/components/onboarding/profile-review.tsx` - Editable profile form with tag-style inputs for array fields
- `src/components/onboarding/onboarding-wizard.tsx` - Complete 3-step wizard replacing placeholder steps 2-3
- `src/components/ui/textarea.tsx` - shadcn Textarea component
- `src/components/ui/select.tsx` - shadcn Select component
- `src/components/ui/label.tsx` - shadcn Label component

## Decisions Made
- **Dynamic import for pdf-parse:** pdf-parse v2 pulls in pdfjs-dist which references `DOMMatrix` at module evaluation time. This crashes the Next.js build during static page generation. Using `await import("pdf-parse")` inside the function avoids the issue since the module is only loaded when actually processing a PDF.
- **Raw JSON schema over zodOutputFormat:** The Anthropic SDK's Zod helpers may not be compatible with Zod 4 (project uses ^4.3.6). Using raw `output_config.format.type: "json_schema"` with a hand-written schema avoids this entirely.
- **Full page reload after onboarding:** Using `window.location.href = "/dashboard"` instead of Next.js router.push() to force a full navigation, which triggers Clerk to refresh the session token with the newly-set `publicMetadata.onboardingComplete = true`. Without this, the middleware redirect loop persists.
- **Idempotent credit creation:** The completeOnboarding action checks for an existing CreditAccount before creating one. This prevents duplicate signup bonuses if the action is called multiple times (e.g., user double-clicks, or retries after a transient error).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dynamic import for pdf-parse to avoid DOMMatrix build error**
- **Found during:** Task 1 (build verification)
- **Issue:** `import { PDFParse } from "pdf-parse"` at the top level causes pdfjs-dist to evaluate `DOMMatrix`, `ImageData`, `Path2D` during Next.js static build, resulting in `ReferenceError: DOMMatrix is not defined`
- **Fix:** Changed to `const { PDFParse } = await import("pdf-parse")` inside the extraction function
- **Files modified:** src/lib/extract-text.ts
- **Verification:** `npm run build` succeeds with all routes
- **Committed in:** af4ebec (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard build compatibility fix. No scope creep.

## Issues Encountered
None beyond the pdf-parse DOMMatrix issue documented above.

## User Setup Required

**External services configured in Plan 01 are required for this plan to work:**

1. **Cloudflare R2** - Documents must be stored in R2 (configured in Plan 01)
2. **Anthropic API** - `ANTHROPIC_API_KEY` must be set in `.env.local` for AI profile generation
3. **Clerk** - Must be configured with webhook and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding`

## Next Phase Readiness
- Full onboarding flow complete: Upload -> AI Generate -> Review/Edit -> Save -> Dashboard
- CompanyProfile stored in MongoDB with AI-generated or manual data
- CreditAccount initialized with 10 SIGNUP_BONUS credits
- Clerk publicMetadata.onboardingComplete = true enables middleware to allow dashboard access
- Phase 3 (Onboarding & Company Profile) is COMPLETE -- all 2 plans executed
- Ready for Phase 4 (Contract Dashboard) which depends on authenticated users with profiles

## Self-Check: PASSED

All 9 created files verified on disk. Both task commits (af4ebec, 053e59a) verified in git log.

---
*Phase: 03-onboarding-company-profile*
*Completed: 2026-02-11*
