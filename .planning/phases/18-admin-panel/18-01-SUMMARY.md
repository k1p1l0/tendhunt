---
phase: 18-admin-panel
plan: 01
subsystem: admin, auth, ui
tags: [nextjs, clerk, mongoose, shadcn, tailwind, middleware, admin-role]

requires:
  - phase: 01-foundation
    provides: Clerk auth patterns, Next.js 16.1 config, MongoDB connection singleton
provides:
  - Buildable admin app workspace (apps/admin/) with Clerk auth
  - Admin role guard middleware via publicMetadata.role check
  - Sidebar layout with 6 navigation sections
  - MongoDB connection singleton for admin API routes
  - shadcn/ui component library installed and configured
affects: [18-02, 18-03, 18-04]

tech-stack:
  added: []
  patterns:
    - "Admin role check via Clerk publicMetadata.role in middleware"
    - "Route group (dashboard) with SidebarProvider layout"
    - "Pathname-based active nav item highlighting"

key-files:
  created:
    - apps/admin/package.json
    - apps/admin/src/proxy.ts
    - apps/admin/src/app/(dashboard)/layout.tsx
    - apps/admin/src/app/(dashboard)/page.tsx
    - apps/admin/src/components/layout/app-sidebar.tsx
    - apps/admin/src/components/layout/header.tsx
    - apps/admin/src/lib/mongodb.ts
    - apps/admin/components.json
  modified:
    - package.json

key-decisions:
  - "Reused exact Clerk/Mongoose/shadcn patterns from apps/web for consistency"
  - "Admin role guard checks publicMetadata.role via clerkClient backend API (not JWT claims)"
  - "Renamed .env.local.example to .env.example to match .gitignore exception pattern"
  - "Root page.tsx removed in favor of (dashboard) route group for / path"

patterns-established:
  - "Admin middleware pattern: publicMetadata.role === 'admin' check via Clerk backend API"
  - "Simplified header: pathname-based page name lookup instead of breadcrumb context"

duration: 5min
completed: 2026-02-12
---

# Phase 18 Plan 01: Admin App Scaffold Summary

**Next.js 16.1 admin workspace with Clerk admin-role middleware, sidebar navigation (6 sections), and MongoDB connection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-12T17:40:27Z
- **Completed:** 2026-02-12T17:45:18Z
- **Tasks:** 2
- **Files modified:** 28

## Accomplishments
- Scaffolded complete admin app as new bun workspace with all dependencies
- Installed 13 shadcn/ui components (sidebar, card, badge, table, button, etc.)
- Created admin-only Clerk middleware that blocks non-admin users with 403
- Built sidebar layout with 6 navigation items: Overview, Workers, Contracts, Buyers, Signals, Users

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin app scaffold** - `102835e` (feat)
2. **Task 2: Admin role middleware + sidebar layout** - `b8c6358` (feat)

## Files Created/Modified
- `apps/admin/package.json` - Admin workspace config (@tendhunt/admin)
- `apps/admin/tsconfig.json` - TypeScript config (mirrors apps/web)
- `apps/admin/next.config.ts` - Next.js 16.1 config with Turbopack
- `apps/admin/postcss.config.mjs` - Tailwind CSS 4.1 PostCSS plugin
- `apps/admin/src/app/globals.css` - Tailwind v4 theme with OKLCH tokens
- `apps/admin/src/app/layout.tsx` - Root layout with ClerkProvider + ThemeProvider
- `apps/admin/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in page
- `apps/admin/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up page
- `apps/admin/src/proxy.ts` - Admin role guard middleware
- `apps/admin/src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar
- `apps/admin/src/app/(dashboard)/page.tsx` - Overview placeholder page
- `apps/admin/src/components/layout/app-sidebar.tsx` - Sidebar with 6 nav items
- `apps/admin/src/components/layout/header.tsx` - Header with page name
- `apps/admin/src/lib/mongodb.ts` - MongoDB connection singleton
- `apps/admin/src/lib/utils.ts` - cn() utility function
- `apps/admin/components.json` - shadcn/ui configuration
- `apps/admin/.env.example` - Required env vars template
- `package.json` - Added admin workspace + dev/build/typecheck scripts

## Decisions Made
- Reused exact Clerk/Mongoose/shadcn patterns from apps/web for consistency
- Admin role guard checks publicMetadata.role via clerkClient backend API (not JWT claims) -- ensures fresh role data even if JWT is cached
- Renamed .env.local.example to .env.example to match .gitignore exception pattern (.env* is ignored, only .env.example is allowed)
- Root page.tsx removed in favor of (dashboard) route group handling the / path -- avoids Next.js route conflict
- Simplified header uses pathname-based page name lookup instead of breadcrumb context provider (admin has fewer, more static pages)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed .env.local.example to .env.example**
- **Found during:** Task 1 (git add)
- **Issue:** .gitignore pattern `.env*` with exception `!.env.example` rejected `.env.local.example`
- **Fix:** Renamed to `.env.example` to match the gitignore exception
- **Files modified:** apps/admin/.env.example
- **Verification:** git add succeeded
- **Committed in:** 102835e (Task 1 commit)

**2. [Rule 3 - Blocking] Removed root page.tsx, moved overview to (dashboard) route group**
- **Found during:** Task 2 (route group setup)
- **Issue:** Both app/page.tsx and app/(dashboard)/page.tsx would conflict for / route
- **Fix:** Removed root page.tsx, created (dashboard)/page.tsx as overview
- **Files modified:** apps/admin/src/app/page.tsx (deleted), apps/admin/src/app/(dashboard)/page.tsx (created)
- **Verification:** Build and typecheck pass, / route renders correctly
- **Committed in:** b8c6358 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes necessary for correct build/routing. No scope creep.

## Issues Encountered
- .next types cache became stale after deleting page.tsx -- resolved by cleaning .next directory before rebuild

## User Setup Required
None - admin app uses same Clerk and MongoDB credentials as web app. .env.local was created from web app's existing values.

## Next Phase Readiness
- Admin app scaffold complete, ready for Plan 02 (overview dashboard with stats)
- All 6 navigation sections defined, pages to be created in Plans 02-04
- MongoDB connection ready for API routes to query existing collections

## Self-Check: PASSED

All key files verified present on disk. Both task commits (102835e, b8c6358) confirmed in git log.

---
*Phase: 18-admin-panel*
*Completed: 2026-02-12*
