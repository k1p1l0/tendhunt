---
phase: 01-foundation
plan: 02
subsystem: database, ui
tags: [mongodb, mongoose, clerk-webhooks, sidebar, dashboard-shell, lucide-react]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: "Next.js 16 scaffold with Clerk auth, shadcn/ui components, Tailwind v4"
provides:
  - "MongoDB connection singleton (dbConnect)"
  - "5 Mongoose models: User, Contract, Buyer, Signal, CreditAccount/CreditTransaction"
  - "Clerk webhook handler (user.created/updated/deleted -> MongoDB)"
  - "Dashboard app shell with sidebar navigation and header"
  - "4 placeholder pages: /dashboard, /contracts, /buyers, /settings"
  - "TypeScript types for NavItem, ContractSource, SignalType, etc."
affects: [02-data-pipeline, 03-onboarding, 04-dashboard, 05-vibe-scanner, 06-buyer-credits]

# Tech tracking
tech-stack:
  added: []
  patterns: [mongoose-connect-noop-singleton, hot-reload-safe-model-registration, verifyWebhook-clerk, await-auth-nextjs16, sidebar-active-state-pathname]

key-files:
  created:
    - src/lib/mongodb.ts
    - src/models/user.ts
    - src/models/contract.ts
    - src/models/buyer.ts
    - src/models/signal.ts
    - src/models/credit.ts
    - src/types/index.ts
    - src/app/api/webhooks/clerk/route.ts
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/contracts/page.tsx
    - src/app/(dashboard)/buyers/page.tsx
    - src/app/(dashboard)/settings/page.tsx
    - src/components/layout/app-sidebar.tsx
    - src/components/layout/header.tsx
  modified: []

key-decisions:
  - "Mongoose 9.x connect() is a no-op when already connected -- no global caching needed"
  - "All models use mongoose.models.X || mongoose.model() for hot-reload safety"
  - "Used verifyWebhook from @clerk/nextjs/webhooks (not svix) for webhook verification"
  - "AppSidebar is client component (usePathname for active state), Header is client component (UserButton)"
  - "Dashboard layout uses await auth() as required by Next.js 16"

patterns-established:
  - "dbConnect(): Import and call before any Mongoose operation in API routes/server actions"
  - "Model pattern: mongoose.models.X || mongoose.model('X', schema) in every model file"
  - "Webhook pattern: verifyWebhook(req) then switch on evt.type"
  - "Dashboard layout: SidebarProvider > AppSidebar + SidebarInset > Header + main"
  - "Active nav: usePathname().startsWith(item.href) on SidebarMenuButton isActive"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 1 Plan 02: MongoDB + Mongoose Models + Clerk Webhook + Dashboard Shell Summary

**MongoDB connection with 5 Mongoose schemas (User, Contract, Buyer, Signal, Credit), Clerk webhook user sync via verifyWebhook, and authenticated dashboard shell with sidebar/header/4 placeholder pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T23:38:57Z
- **Completed:** 2026-02-10T23:42:26Z
- **Tasks:** 2 of 2 auto tasks completed (Task 3 is human-verify checkpoint)
- **Files modified:** 15

## Accomplishments
- MongoDB connection singleton using Mongoose 9.x no-op connect pattern (no global caching needed)
- 5 Mongoose models with proper indexes, validation, text search, and compound indexes
- Clerk webhook handler syncing user.created/updated/deleted to MongoDB User collection
- Dashboard app shell with sidebar navigation (4 items with lucide-react icons and active state)
- Header with SidebarTrigger (mobile hamburger) and Clerk UserButton (avatar + sign out)
- 4 placeholder pages rendering inside the dashboard layout
- TypeScript types for NavItem and all domain enums

## Task Commits

Each task was committed atomically:

1. **Task 1: MongoDB connection, 5 models, webhook handler** - `fcaa8f9` (feat)
2. **Task 2: Dashboard app shell, sidebar, header, pages** - `d82b6fa` (feat)
3. **Task 3: Verify Phase 1 foundation** - checkpoint:human-verify (awaiting user verification)

## Files Created/Modified
- `src/lib/mongodb.ts` - Mongoose connection singleton with dbConnect()
- `src/models/user.ts` - User model synced from Clerk (clerkId, email, name, imageUrl)
- `src/models/contract.ts` - Unified contract schema (Find a Tender + Contracts Finder) with text/compound indexes
- `src/models/buyer.ts` - Buyer organization with embedded contacts array and vibe scoring
- `src/models/signal.ts` - Buying signal model (6 signal types, confidence score)
- `src/models/credit.ts` - CreditAccount + CreditTransaction models for credit system
- `src/types/index.ts` - TypeScript interfaces (NavItem) and domain type aliases
- `src/app/api/webhooks/clerk/route.ts` - Clerk webhook handler using verifyWebhook
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with auth guard and SidebarProvider
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard with 4 stat cards and empty state
- `src/app/(dashboard)/contracts/page.tsx` - Contracts placeholder page
- `src/app/(dashboard)/buyers/page.tsx` - Buyers placeholder page
- `src/app/(dashboard)/settings/page.tsx` - Settings placeholder page
- `src/components/layout/app-sidebar.tsx` - Sidebar with 4 nav items and active state
- `src/components/layout/header.tsx` - Header with SidebarTrigger and UserButton

## Decisions Made
- **Mongoose 9.x connect pattern:** No global.mongoose caching needed -- mongoose.connect() is a no-op when already connected in Mongoose 9.x, simplifying the singleton.
- **verifyWebhook over svix:** Used @clerk/nextjs/webhooks verifyWebhook() which handles signature verification internally, eliminating the svix dependency.
- **Client components for sidebar/header:** AppSidebar needs usePathname() for active state, Header needs UserButton -- both must be client components.
- **Crosshair icon for logo:** Used lucide-react Crosshair icon as a simple radar/target icon for the TendHunt brand in sidebar header.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MONGODB_URI TypeScript narrowing**
- **Found during:** Task 1 (build verification)
- **Issue:** TypeScript reported `string | undefined` not assignable to `string` for MONGODB_URI even though we throw if missing. The `const` declaration before the `if` check doesn't narrow the type.
- **Fix:** Moved the `if (!process.env.MONGODB_URI)` throw check before the `const` declaration, then declared `const MONGODB_URI: string = process.env.MONGODB_URI` after the guard.
- **Files modified:** src/lib/mongodb.ts
- **Verification:** `npm run build` succeeds
- **Committed in:** fcaa8f9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Standard TypeScript narrowing fix. No scope creep.

## Issues Encountered
None beyond the TypeScript narrowing issue documented above.

## User Setup Required

**External services require manual configuration.** Before Task 3 verification:

1. **MongoDB Atlas** - Database
   - Ensure MONGODB_URI in `.env.local` points to a real MongoDB Atlas cluster
   - Ensure database is named `tendhunt`
   - Ensure 0.0.0.0/0 is in Network Access for development

2. **Clerk Webhook** - User sync
   - Set up ngrok: `ngrok http 3000`
   - Create webhook endpoint in Clerk Dashboard pointing to `{ngrok-url}/api/webhooks/clerk`
   - Subscribe to events: user.created, user.updated, user.deleted
   - Copy Signing Secret to CLERK_WEBHOOK_SIGNING_SECRET in `.env.local`

## Next Phase Readiness
- Complete Phase 1 foundation ready for all subsequent phases
- MongoDB schemas ready for Phase 2 data pipeline (Contract, Buyer models)
- Dashboard shell ready for Phase 4 (contract feed UI) and Phase 6 (buyer profiles)
- Clerk webhook ready for Phase 3 onboarding (User model populated on signup)
- Credit models ready for Phase 6 credit system
- Awaiting user verification of full stack (Task 3 checkpoint)

---
*Phase: 01-foundation*
*Completed: 2026-02-10*
