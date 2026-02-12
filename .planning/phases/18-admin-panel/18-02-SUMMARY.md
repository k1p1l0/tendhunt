---
phase: 18-admin-panel
plan: 02
subsystem: admin, api, ui, dashboard
tags: [nextjs, mongodb, polling, worker-health, platform-stats, shadcn, date-fns]

requires:
  - phase: 18-admin-panel
    plan: 01
    provides: Admin app scaffold with Clerk auth, sidebar navigation, MongoDB connection
provides:
  - Worker status API endpoint querying 3 job collections
  - Platform stats API endpoint with 9 collection counts + recent activity
  - Overview dashboard with stats cards, worker health summary, and activity feed
  - Workers detail page with per-stage breakdown and collapsible error logs
  - 15-second auto-polling pattern for live data refresh
affects: [18-03, 18-04]

tech-stack:
  added: []
  patterns:
    - "Native MongoDB driver via mongoose.connection.db for admin queries (no model duplication)"
    - "15-second polling via useEffect/setInterval with manual refresh reset"
    - "Skeleton loading on initial fetch, silent data updates on subsequent polls"
    - "Status derivation: running if any stage running, error if any error, complete if all complete, else idle"

key-files:
  created:
    - apps/admin/src/lib/workers.ts
    - apps/admin/src/lib/stats.ts
    - apps/admin/src/app/api/workers/status/route.ts
    - apps/admin/src/app/api/stats/route.ts
    - apps/admin/src/components/dashboard/worker-status-card.tsx
    - apps/admin/src/components/dashboard/stats-cards.tsx
    - apps/admin/src/components/dashboard/recent-activity.tsx
    - apps/admin/src/app/(dashboard)/workers/page.tsx
  modified:
    - apps/admin/src/app/(dashboard)/page.tsx

key-decisions:
  - "Native MongoDB queries via mongoose.connection.db instead of duplicating Mongoose models in admin app"
  - "Status derivation logic: running > error > complete > idle precedence for overall worker status"
  - "Cache-Control: no-store on API responses to ensure polling always gets fresh data"
  - "Collapsible error log on workers detail page to keep UI clean by default"

patterns-established:
  - "Admin data access pattern: dbConnect() then mongoose.connection.db for raw collection queries"
  - "Polling pattern: fetchData in useCallback, setInterval in useEffect, reset interval on manual refresh"
  - "Health banner pattern: green All Healthy when all complete/idle, red Attention Required when any error"

duration: 4min
completed: 2026-02-12
---

# Phase 18 Plan 02: Overview Dashboard & Workers Monitoring Summary

**Live-polling overview dashboard with 8 platform stat cards, 3 worker health cards, recent activity feed, and detailed workers page with per-stage breakdown and collapsible error logs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-12T17:48:21Z
- **Completed:** 2026-02-12T17:52:36Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built worker status API that queries syncjobs, enrichmentjobs, and spendingestjobs collections in parallel with status derivation logic
- Built platform stats API that returns counts for 9 collections and 10 most recent items across contracts/buyers/signals
- Created overview dashboard with 8 stat cards (4 primary + 4 secondary), 3 worker health summary cards, and recent activity feed
- Created workers detail page with per-stage breakdown, stage timing, collapsible error logs, and health banners
- Both pages auto-refresh every 15 seconds via polling with skeleton loading on initial fetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Worker status API + stats API + data access functions** - `415c632` (feat)
2. **Task 2: Overview dashboard + workers page with polling UI** - `e6baadc` (feat)

## Files Created/Modified
- `apps/admin/src/lib/workers.ts` - Data access: queries 3 worker job collections, derives overall status
- `apps/admin/src/lib/stats.ts` - Data access: 9 collection counts + 10 recent items merged and sorted
- `apps/admin/src/app/api/workers/status/route.ts` - GET endpoint for worker health data
- `apps/admin/src/app/api/stats/route.ts` - GET endpoint for platform statistics
- `apps/admin/src/components/dashboard/worker-status-card.tsx` - Worker card with status badge, stage dots, error log
- `apps/admin/src/components/dashboard/stats-cards.tsx` - 8-card grid with skeleton loading states
- `apps/admin/src/components/dashboard/recent-activity.tsx` - Mixed activity feed with type badges
- `apps/admin/src/app/(dashboard)/page.tsx` - Overview page with polling and manual refresh
- `apps/admin/src/app/(dashboard)/workers/page.tsx` - Workers detail page with health banners

## Decisions Made
- Used native MongoDB driver (`mongoose.connection.db`) instead of duplicating Mongoose model definitions in admin app -- keeps admin lightweight and avoids schema drift
- Status derivation uses precedence: running/backfilling/syncing > error > complete > idle -- single glance tells admin if anything needs attention
- Cache-Control: no-store ensures polling always hits MongoDB, not stale browser cache
- Error log is collapsible by default in detailed view -- keeps cards clean, errors available on demand
- Skeleton loading only on initial fetch, silent updates on subsequent polls -- prevents UI flicker during background refresh

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing type errors found in untracked data page files (apps/admin/src/app/(dashboard)/data/) from future plan work -- not related to this plan's changes, no action needed

## User Setup Required
None - admin app uses same credentials as web app. No new env vars needed.

## Next Phase Readiness
- Dashboard and workers pages fully operational, ready for Plan 03 (data browsing pages)
- Polling infrastructure established as reusable pattern for future admin pages
- API routes demonstrate the raw MongoDB query pattern for data tables

## Self-Check: PASSED

All key files verified present on disk. Both task commits (415c632, e6baadc) confirmed in git log.

---
*Phase: 18-admin-panel*
*Completed: 2026-02-12*
