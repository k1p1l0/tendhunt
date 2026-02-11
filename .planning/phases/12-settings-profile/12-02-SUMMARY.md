---
phase: 12-settings-profile
plan: 02
subsystem: ui
tags: [settings, auto-save, tag-input, logo-upload, documents, debounce, sonner, react-dropzone, presigned-url]

# Dependency graph
requires:
  - phase: 12-settings-profile
    provides: GET/PATCH /api/profile, POST /api/profile/logo, POST /api/profile/logo-extract, DELETE /api/profile/documents, sonner toasts
  - phase: 03-onboarding
    provides: CompanyProfile model, DocumentDropzone pattern, TagInput original implementation, R2 presigned URL upload pattern
provides:
  - Settings page with 3-section auto-save profile editor (Company Info, AI Profile, Documents)
  - TagInput shared component at src/components/ui/tag-input.tsx with onBlur support
  - LogoUpload component with hover overlay, presigned R2 upload, and re-extract from website/LinkedIn
  - DocumentsSection component with document list, delete, and upload dropzone
  - Custom "profile-updated" event dispatched on logo change for cross-component sync
affects: [12-03-sidebar]

# Tech tracking
tech-stack:
  added: []
  patterns: [auto-save-on-blur-with-debounce, array-refs-for-stale-closure-fix, custom-event-for-cross-component-sync]

key-files:
  created:
    - src/components/ui/tag-input.tsx
    - src/components/settings/logo-upload.tsx
    - src/components/settings/documents-section.tsx
    - src/app/(dashboard)/settings/settings-form.tsx
  modified:
    - src/app/(dashboard)/settings/page.tsx
    - src/components/onboarding/profile-review.tsx
    - src/app/api/profile/route.ts

key-decisions:
  - "TagInput extracted to shared component with onBlur prop for auto-save trigger on blur and tag removal"
  - "Array field refs (arrayRefs) prevent stale closure bug when onBlur fires in same tick as onChange"
  - "logoUrl and documentKeys added to PATCH whitelist to support upload flows from Settings page"
  - "Custom profile-updated event dispatched on logo change for sidebar refresh in Plan 03"

patterns-established:
  - "Auto-save on blur: useDebouncedCallback(300ms) + comparison check against initialRef to prevent duplicate saves"
  - "Array refs pattern: arrayRefs.current updated synchronously in onChange, read in onBlur to get latest value"
  - "LogoUpload flow: POST /api/profile/logo -> presigned URL -> PUT to R2 -> PATCH /api/profile with key"
  - "Document upload flow: POST /api/upload/presigned -> PUT to R2 -> PATCH /api/profile with updated documentKeys"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 12 Plan 02: Settings Page UI Summary

**Full company profile editor with auto-save on blur, LogoUpload with hover overlay and re-extract, DocumentsSection with delete and dropzone upload, all wired into 3-section responsive Settings page**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-11T22:08:36Z
- **Completed:** 2026-02-11T22:14:38Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Replaced Settings placeholder with fully functional 3-section company profile editor
- TagInput extracted from onboarding to shared component with onBlur support for auto-save
- Auto-save on blur with 300ms debounce, comparison check prevents duplicate API calls
- LogoUpload component: hover overlay upload, presigned R2 flow, re-extract from website/LinkedIn
- DocumentsSection component: file list with delete, dropzone for new uploads via presigned URLs
- All 14 CompanyProfile fields editable with appropriate input types

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract TagInput to shared component, create Settings page with auto-save form** - `ac88e3b` (feat)
2. **Task 2: Create LogoUpload and DocumentsSection components** - `fdda1c5` (feat)
3. **Task 3: Wire LogoUpload and DocumentsSection into Settings page** - `0a1cbf5` (feat)

## Files Created/Modified
- `src/components/ui/tag-input.tsx` - Reusable TagInput with onBlur support, extracted from onboarding
- `src/components/settings/logo-upload.tsx` - Logo display with hover upload overlay, re-extract button, initials fallback
- `src/components/settings/documents-section.tsx` - Document list with delete buttons and upload dropzone
- `src/app/(dashboard)/settings/page.tsx` - Server-rendered Settings page, fetches profile and passes to form
- `src/app/(dashboard)/settings/settings-form.tsx` - Client component with all profile fields, auto-save, logo/document integration
- `src/components/onboarding/profile-review.tsx` - Updated to import shared TagInput instead of inline copy
- `src/app/api/profile/route.ts` - Added logoUrl and documentKeys to PATCH whitelist

## Decisions Made
- TagInput extracted as standalone shared component with onBlur prop -- enables auto-save trigger on both blur and tag removal events
- Array field refs pattern adopted to prevent stale closure bug (onBlur fires synchronously before React re-render from onChange)
- logoUrl and documentKeys added to PATCH /api/profile whitelist -- required for logo upload and document management flows from Settings page (12-01 had excluded them as safety measure, but Settings page is the authorized editor)
- Custom "profile-updated" CustomEvent dispatched via window on logo change -- allows sidebar to reactively refresh logo without polling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added logoUrl and documentKeys to PATCH whitelist**
- **Found during:** Task 2 (LogoUpload and DocumentsSection creation)
- **Issue:** Plan 12-01 excluded logoUrl and documentKeys from PATCH whitelist to prevent unauthorized overwrites, but the Settings page logo upload flow and document upload flow both need to PATCH these fields
- **Fix:** Added both fields to ALLOWED_FIELDS set in /api/profile/route.ts
- **Files modified:** src/app/api/profile/route.ts
- **Verification:** TypeScript compiles, upload flows can now update profile
- **Committed in:** fdda1c5 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed stale closure in TagInput onBlur for array fields**
- **Found during:** Task 1 (SettingsForm auto-save implementation)
- **Issue:** When TagInput's internal onBlur fires after addTag (which calls onChange), the parent's onBlur callback captures the old array value from the previous render, causing the save to miss the newly added tag
- **Fix:** Introduced arrayRefs pattern -- refs updated synchronously in onChange wrapper, read in handleArraySave to always get latest value
- **Files modified:** src/app/(dashboard)/settings/settings-form.tsx
- **Verification:** Array fields correctly save including tags added on blur
- **Committed in:** ac88e3b (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Settings page fully functional -- all profile fields editable with auto-save
- Plan 03 (sidebar restructure) can listen for "profile-updated" CustomEvent to refresh logo
- Plan 03 can use GET /api/profile to fetch company logo and name for sidebar header
- TagInput available as shared component for any future form that needs tag-style array inputs

## Self-Check: PASSED

All 7 files verified present. All 3 task commits confirmed in git log.

---
*Phase: 12-settings-profile*
*Completed: 2026-02-11*
