# Quick Task 6: Redirect root page to dashboard

## Goal
Replace the default Next.js welcome screen at `/` with a server-side redirect to `/dashboard`.

## Tasks

### Task 1: Replace root page.tsx with redirect
- **File:** `apps/web/src/app/page.tsx`
- **Action:** Replace entire file with `redirect("/dashboard")` from `next/navigation`
- **Rationale:** Server-side redirect (307) — no client flash, no layout shift
