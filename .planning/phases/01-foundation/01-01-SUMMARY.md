---
phase: 01-foundation
plan: 01
subsystem: auth
tags: [nextjs, clerk, tailwind-v4, shadcn-ui, mongodb, mongoose, zod, zustand]

# Dependency graph
requires: []
provides:
  - "Next.js 16 project scaffold with Turbopack"
  - "Clerk auth with proxy.ts route protection"
  - "Tailwind CSS v4 CSS-first config with OKLCH tokens"
  - "shadcn/ui component library (button, card, badge, sidebar, sheet, avatar, dropdown-menu, separator, input, tooltip, skeleton)"
  - "Zod environment variable validation"
  - "Sign-in and sign-up pages with catch-all routing"
affects: [01-02, 02-data-pipeline, 03-onboarding, 04-dashboard]

# Tech tracking
tech-stack:
  added: [next@16.1.6, react@19.2.3, mongoose@9.2.0, "@clerk/nextjs@6.37.3", zod@4.3.6, zustand@5.0.11, tailwindcss@4, tw-animate-css, shadcn/ui, radix-ui, lucide-react]
  patterns: [proxy.ts-route-protection, css-first-tailwind-config, dynamic-clerk-provider, zod-env-validation]

key-files:
  created:
    - src/proxy.ts
    - src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
    - src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
    - src/app/(auth)/layout.tsx
    - src/lib/env.ts
    - src/lib/utils.ts
    - components.json
    - .env.example
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - package.json

key-decisions:
  - "Used ClerkProvider with dynamic prop for build compatibility with placeholder keys"
  - "proxy.ts at src/proxy.ts (inside src-dir) for Next.js 16 middleware replacement"
  - "Zod 4 for env validation (installed via npm, newer API)"
  - "Fixed .gitignore to exclude .env* but include .env.example"

patterns-established:
  - "proxy.ts: Route protection via createRouteMatcher + auth.protect()"
  - "CSS-first Tailwind v4: All config in globals.css with @theme inline and OKLCH colors"
  - "ClerkProvider dynamic: Defers key validation to runtime for build compatibility"
  - "Zod env validation: Server vars validated only on server side (typeof window check)"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 1 Plan 01: Next.js 16 + Clerk Auth + Tailwind v4 + shadcn/ui Foundation Summary

**Next.js 16 scaffold with Clerk auth (proxy.ts route protection), Tailwind CSS v4 OKLCH tokens, and 11 shadcn/ui components ready for dashboard development**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T23:27:38Z
- **Completed:** 2026-02-10T23:30:55Z
- **Tasks:** 2 of 2 auto tasks completed (Task 3 is human-verify checkpoint)
- **Files modified:** 38

## Accomplishments
- Next.js 16.1.6 project scaffolded with TypeScript, Tailwind CSS v4, App Router, Turbopack
- Clerk authentication configured with proxy.ts protecting all non-public routes
- Sign-in and sign-up pages at /sign-in and /sign-up with catch-all routing
- 11 shadcn/ui components installed (button, card, badge, sidebar, sheet, avatar, dropdown-menu, separator, input, tooltip, skeleton)
- Environment variable validation with Zod 4 (MONGODB_URI, Clerk keys, redirect URLs)
- Build passes successfully with `npm run build`

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 project** - `f69310c` (feat)
2. **Task 2: Configure Clerk auth with proxy.ts** - `acad0a7` (feat)
3. **Task 3: Verify Clerk auth flow** - checkpoint:human-verify (awaiting user verification)

## Files Created/Modified
- `package.json` - Project manifest with all dependencies (Next.js 16, Clerk, Mongoose, Zod, Zustand)
- `src/proxy.ts` - Clerk auth proxy replacing middleware.ts (public routes: /, /sign-in, /sign-up, /api/webhooks)
- `src/app/layout.tsx` - Root layout with ClerkProvider (dynamic mode), Geist fonts, metadata
- `src/app/globals.css` - Tailwind v4 CSS-first config with OKLCH color tokens and sidebar variables
- `src/app/(auth)/layout.tsx` - Centered auth layout (flexbox min-h-screen)
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Clerk SignIn component
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - Clerk SignUp component
- `src/lib/env.ts` - Zod-validated environment variables (server + client separation)
- `src/lib/utils.ts` - cn() utility from shadcn/ui (clsx + tailwind-merge)
- `components.json` - shadcn/ui configuration (new-york style, RSC, Tailwind v4)
- `src/components/ui/*.tsx` - 11 shadcn/ui components
- `.env.example` - Environment variable documentation
- `.gitignore` - Updated to exclude .env files but include .env.example
- `next.config.ts` - Minimal config (mongoose auto-externalized, Turbopack default)
- `tsconfig.json` - TypeScript config with @/* import alias

## Decisions Made
- **ClerkProvider dynamic mode:** Used `<ClerkProvider dynamic>` to defer publishable key validation to runtime instead of build-time. This allows `npm run build` to succeed with placeholder keys while real keys are configured in Task 3 checkpoint.
- **proxy.ts location:** Placed at `src/proxy.ts` (inside src/ directory) since project uses `--src-dir`. Next.js 16 recognizes this location.
- **Zod 4:** Package installed as zod@4.3.6 (latest). API is compatible with standard z.object/z.string patterns.
- **.gitignore fix:** Added `!.env.example` exception since the default `.env*` pattern excludes it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ClerkProvider dynamic mode for build compatibility**
- **Found during:** Task 2 (Clerk auth configuration)
- **Issue:** `npm run build` failed with "The publishableKey passed to Clerk is invalid" because placeholder `pk_test_placeholder` doesn't match Clerk's expected key format. ClerkProvider validates keys at SSG time.
- **Fix:** Added `dynamic` prop to ClerkProvider which defers key validation to runtime (client-side). This is the official Clerk pattern for apps that may not have real keys at build time.
- **Files modified:** src/app/layout.tsx
- **Verification:** `npm run build` succeeds, all routes render correctly
- **Committed in:** acad0a7 (Task 2 commit)

**2. [Rule 3 - Blocking] .gitignore excluding .env.example**
- **Found during:** Task 1 (staging files for commit)
- **Issue:** Default `.gitignore` pattern `.env*` excluded `.env.example` from git
- **Fix:** Added `!.env.example` exception to `.gitignore`
- **Files modified:** .gitignore
- **Verification:** `git add .env.example` succeeds
- **Committed in:** f69310c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes necessary for correct build and version control. No scope creep.

## Issues Encountered
- Mongoose 9.2.0 requires Node >= 20.19.0, current environment has 20.11.0. npm warnings shown but package installs and works correctly.
- `create-next-app` refused to scaffold into directory with existing files (.claude/, .planning/, CLAUDE.md). Worked around by scaffolding into temp directory and copying files.

## User Setup Required

**External services require manual configuration.** Before Task 3 verification:

1. **Clerk** - Authentication service
   - Create a Clerk account at [clerk.com](https://clerk.com) if you don't have one
   - Create a new application named "TendHunt"
   - Enable Email/Password and Google social login
   - Copy Publishable Key and Secret Key from Dashboard > API Keys
   - Update `.env.local` with real values:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
     - `CLERK_SECRET_KEY=sk_test_...`

## Next Phase Readiness
- Foundation scaffold complete, ready for Plan 02 (App Shell + Dashboard Layout)
- shadcn/ui Sidebar component installed, ready for dashboard shell
- Clerk auth configured, ready for user sync webhook (Plan 02)
- Awaiting user verification of auth flow (Task 3 checkpoint)

---
*Phase: 01-foundation*
*Completed: 2026-02-10*
