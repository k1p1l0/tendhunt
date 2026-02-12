# Phase 17: Dashboard Home - Research

**Researched:** 2026-02-12
**Domain:** Next.js dashboard page replacement, Calendly embedding, MongoDB aggregation for scanner feeds
**Confidence:** HIGH

## Summary

Phase 17 replaces the current generic dashboard (`src/app/(dashboard)/dashboard/page.tsx`) -- which shows stat cards + quick filter badges + recent contracts -- with a personalized home hub inspired by Tussell's dashboard pattern. The new page has four sections: (1) Account Manager card with Matt's details and a Calendly booking CTA, (2) Saved Scanners showing the user's scanners with type badges and last activity, (3) Fresh Signals feed aggregating recent high-score results from across the user's scanners, and (4) Quick Action links for navigation shortcuts.

The implementation sits entirely within the existing tech stack. No new dependencies are required. The Calendly popup uses the official Calendly widget.js script loaded via Next.js `<Script>` component, avoiding the `react-calendly` NPM package which has uncertain React 19 compatibility (peer dep `>=16.8.0`, last published 9+ months ago, v4.4.0). Data fetching follows the established server component pattern with `auth()` + `dbConnect()` + Mongoose queries, using `Promise.all` for parallel fetching. All UI uses existing shadcn/ui components (Card, Avatar, Badge, Button, Skeleton, Separator).

The most interesting technical challenge is the "Fresh Signals" feed, which must aggregate recent high-value score entries from across multiple scanners, resolve the entity names from their respective collections (contracts, signals, buyers), and present them as a unified feed. This requires a dedicated server-side data function that queries scanners, extracts top scores, and batch-resolves entity names.

**Primary recommendation:** Build as a single server component page with parallel data fetching (`currentUser`, `scanners`, `topScores`), using a two-column responsive layout (left: AM card + scanners + signals, right: quick action links). Use the Calendly vanilla JS embed via `next/script` instead of `react-calendly`.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | Framework, Server Components, `next/script` | Already in project |
| @clerk/nextjs | ^6.37.3 | `auth()` for userId, `currentUser()` for user name/email | Already in project |
| mongoose | ^9.2.0 | Scanner, Contract, Signal, Buyer queries | Already in project |
| lucide-react | ^0.563.0 | Icons for quick action cards and section headers | Already in project |
| radix-ui | ^1.4.3 | Underlying primitives for shadcn/ui Avatar | Already in project |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Card | - | Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter | AM card, scanner cards, signal cards, action cards |
| shadcn/ui Avatar | - | AvatarImage, AvatarFallback for AM photo | Account manager photo display |
| shadcn/ui Badge | - | Scanner type badges (rfps/meetings/buyers) | Scanner type indicators |
| shadcn/ui Skeleton | - | Loading state placeholders | Initial server-component load states |
| shadcn/ui Separator | - | Visual dividers between sections | Section separation |
| shadcn/ui Button | - | "Book a meeting" CTA, "View all" links | Action buttons |

### External (No Install Required)
| Resource | URL | Purpose | Loading Strategy |
|----------|-----|---------|-----------------|
| Calendly widget.js | `https://assets.calendly.com/assets/external/widget.js` | Opens popup scheduler | `next/script` with `strategy="lazyOnload"` |
| Calendly widget.css | `https://assets.calendly.com/assets/external/widget.css` | Popup styling | `<link>` in `<head>` or inline import |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Calendly widget.js (vanilla) | react-calendly NPM package | react-calendly v4.4.0 last published 9+ months ago, peer dep `>=16.8.0` -- uncertain React 19.2.3 compat. Vanilla JS is zero-dep and officially supported |
| Server Component page | Client Component with useEffect | No benefit -- data fetching is simpler and faster in server components. Only the Calendly button click handler needs client interactivity |

**Installation:**
```bash
# No new packages needed. Everything is already installed.
```

## Architecture Patterns

### Recommended Component Structure
```
src/
  app/(dashboard)/dashboard/
    page.tsx                      # Server component -- main dashboard (replaces current)
  components/dashboard/
    account-manager-card.tsx      # Client component (needs Calendly onclick)
    saved-scanners-section.tsx    # Server component (receives scanner data as props)
    scanner-card.tsx              # Pure component -- single scanner row/card
    fresh-signals-feed.tsx        # Server component (receives signal data as props)
    signal-item.tsx               # Pure component -- single signal row
    quick-actions.tsx             # Server component -- static quick action links
  lib/
    dashboard.ts                  # Data fetching functions: getUserScanners, getTopScores
```

### Pattern 1: Server Component Page with Parallel Data Fetching
**What:** The dashboard page is an async server component that fetches all data in parallel using `Promise.all`.
**When to use:** Always for the main dashboard page -- avoids client-side loading spinners and waterfalls.
**Example:**
```typescript
// Source: Next.js docs (verified via Context7 /vercel/next.js)
// + Clerk docs (verified via Context7 /clerk/clerk-docs)
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserScanners, getTopScores } from "@/lib/dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, scanners, topScores] = await Promise.all([
    currentUser(),
    getUserScanners(userId),
    getTopScores(userId),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left column */}
      <div className="space-y-6">
        <AccountManagerCard userName={user?.firstName} />
        <SavedScannersSection scanners={scanners} />
        <FreshSignalsFeed signals={topScores} />
      </div>
      {/* Right column */}
      <div>
        <QuickActions />
      </div>
    </div>
  );
}
```

### Pattern 2: Calendly Popup via Vanilla JS + next/script
**What:** Load Calendly's widget.js as an external script, then call `Calendly.initPopupWidget()` on button click.
**When to use:** For the "Book a meeting" CTA in the Account Manager card.
**Example:**
```typescript
// Source: Calendly Help Center + Next.js Script docs
"use client";

import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export function BookMeetingButton({ calendlyUrl }: { calendlyUrl: string }) {
  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Button
        onClick={() => {
          window.Calendly?.initPopupWidget({ url: calendlyUrl });
        }}
      >
        <Calendar className="mr-2 h-4 w-4" />
        Book a meeting
      </Button>
    </>
  );
}
```

### Pattern 3: Data Fetching for Scanner Summary (Reuse Existing API Pattern)
**What:** A server-side function that queries the Scanner collection for a user's scanners and returns summary data.
**When to use:** For the Saved Scanners section -- mirrors the existing `GET /api/scanners` logic but as a direct DB function.
**Example:**
```typescript
// Source: Existing pattern from src/app/api/scanners/route.ts
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";

export interface ScannerSummary {
  _id: string;
  name: string;
  type: "rfps" | "meetings" | "buyers";
  description: string;
  lastScoredAt: Date | null;
  updatedAt: Date;
  totalEntries: number;
}

export async function getUserScanners(userId: string): Promise<ScannerSummary[]> {
  await dbConnect();
  const scanners = await Scanner.find({ userId })
    .sort({ updatedAt: -1 })
    .select("name type description lastScoredAt updatedAt scores")
    .lean();

  return scanners.map((s) => ({
    _id: String(s._id),
    name: s.name,
    type: s.type as ScannerSummary["type"],
    description: s.description || "",
    lastScoredAt: s.lastScoredAt || null,
    updatedAt: s.updatedAt!,
    totalEntries: new Set(
      (s.scores ?? []).map((sc: { entityId: unknown }) => String(sc.entityId))
    ).size,
  }));
}
```

### Pattern 4: Fresh Signals Aggregation
**What:** Extracts top-scoring entities across all user scanners, resolves entity names from the respective collections.
**When to use:** For the Fresh Signals feed.
**Example:**
```typescript
// Source: Project-specific pattern combining Scanner scores + entity resolution
export async function getTopScores(userId: string, limit = 10) {
  await dbConnect();

  const scanners = await Scanner.find({ userId })
    .select("name type scores aiColumns")
    .lean();

  // Collect all score entries with scanner context
  const allScores: Array<{
    scannerId: string;
    scannerName: string;
    scannerType: string;
    entityId: string;
    columnId: string;
    columnName: string;
    score: number;
    reasoning: string;
  }> = [];

  for (const scanner of scanners) {
    const columnMap = new Map(
      (scanner.aiColumns ?? []).map((c: any) => [c.columnId, c.name])
    );
    for (const entry of scanner.scores ?? []) {
      if (entry.score != null && entry.score >= 7) {
        allScores.push({
          scannerId: String(scanner._id),
          scannerName: scanner.name,
          scannerType: scanner.type,
          entityId: String(entry.entityId),
          columnId: entry.columnId,
          columnName: columnMap.get(entry.columnId) || entry.columnId,
          score: entry.score,
          reasoning: entry.reasoning || "",
        });
      }
    }
  }

  // Sort by score descending, take top N
  allScores.sort((a, b) => b.score - a.score);
  const top = allScores.slice(0, limit);

  // Batch-resolve entity names from respective collections
  // Group by scanner type, then batch-fetch
  // ... (Contract.find, Signal.find, Buyer.find)

  return top;
}
```

### Pattern 5: Two-Column Responsive Layout
**What:** Desktop shows left content column + right sidebar; mobile stacks vertically.
**When to use:** The overall dashboard page layout.
**Example:**
```tsx
<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <div className="space-y-6">
    {/* Main content: AM card, scanners, signals */}
  </div>
  <div className="space-y-6">
    {/* Quick actions sidebar */}
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Client-side data fetching for initial render:** Do NOT use `useEffect` + `fetch()` for the main dashboard data. The current scanners page does this, but the dashboard should be a server component for faster initial render and no loading spinner.
- **Loading full scanner scores array in memory:** Only select the fields needed. Use `.select()` and do NOT return the full `scores` array to the client.
- **Embedding Calendly inline:** Do NOT use an inline iframe for Calendly. A popup button is the correct UX -- it does not consume page real estate and only loads when clicked.
- **Using react-calendly package:** Avoid adding this dependency. It has uncertain React 19 compatibility, and the vanilla JS embed is simpler, officially supported, and zero-dependency.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendly booking popup | Custom modal with iframe | `Calendly.initPopupWidget()` via `widget.js` | Calendly handles scheduling logic, timezone, availability, confirmations |
| Relative time formatting ("2 hours ago") | Custom date math | Reuse `formatRelativeTime()` from `scanner-list.tsx` | Already exists in codebase, handles all edge cases |
| Scanner type badges with colors | Custom badge styling | Reuse `TYPE_CONFIG` pattern from `scanner-list.tsx` | Already has rfps/meetings/buyers color schemes |
| User avatar display | Custom image component | shadcn `Avatar` + `AvatarImage` + `AvatarFallback` | Already used in sidebar-company-header.tsx |
| Loading states | Custom shimmer/spinner | shadcn `Skeleton` component | Already used in sidebar-company-header.tsx |

**Key insight:** Most of the UI patterns needed for this phase already exist in the codebase. The scanner-list component has relative time formatting, type badges, and the scanner row pattern. The sidebar-company-header has avatar display with fallback. The contract-card has the score badge component. Reuse these patterns rather than reinventing.

## Common Pitfalls

### Pitfall 1: Calendly Script Not Loaded When Button Clicked
**What goes wrong:** User clicks "Book a meeting" but `window.Calendly` is undefined because the script hasn't loaded yet (especially with `lazyOnload` strategy).
**Why it happens:** `lazyOnload` defers script loading until browser idle. On fast clicks, the script may not be ready.
**How to avoid:** Use `strategy="afterInteractive"` instead of `lazyOnload` if this becomes an issue. Alternatively, add a null check: `window.Calendly?.initPopupWidget(...)` and show a brief "Loading..." state if Calendly is not yet available.
**Warning signs:** Button click does nothing. No error in console (just silently fails).

### Pitfall 2: N+1 Query Problem in Fresh Signals Feed
**What goes wrong:** For each score entry, a separate database query resolves the entity name, causing dozens of queries.
**Why it happens:** Naive loop: `for (score of topScores) { await Contract.findById(score.entityId) }`.
**How to avoid:** Batch-resolve: collect all entity IDs by type, then do 3 queries max (one per collection: Contract, Signal, Buyer). Use `Collection.find({ _id: { $in: ids } })`.
**Warning signs:** Dashboard page takes >2s to load. Mongoose debug output shows many individual `findById` calls.

### Pitfall 3: Empty State Not Handled for New Users
**What goes wrong:** New user with no scanners or scores sees a blank dashboard with empty sections.
**Why it happens:** No conditional rendering for zero-data states.
**How to avoid:** Every section must have an empty state: "No scanners yet -- Create your first scanner" with a CTA button. "No signals yet -- Run your first scanner to see results here." Check for zero-length arrays and render appropriate empty states.
**Warning signs:** Dashboard looks broken for new users during demo.

### Pitfall 4: Score Data Shape Mismatch
**What goes wrong:** The `scores` array in Scanner model stores `entityId` as `Schema.Types.ObjectId`, but when resolving entities, the ID type may not match between collections.
**Why it happens:** ObjectId comparison requires consistent typing. `String(entityId)` is needed for Map lookups.
**How to avoid:** Always convert entityIds to strings when using as Map keys or comparing. Use `String(score.entityId)` consistently.
**Warning signs:** Entity names resolve as "Unknown" despite existing in the database.

### Pitfall 5: Calendly URL Hardcoded in Multiple Places
**What goes wrong:** Matt's Calendly URL is scattered across components, making it hard to update.
**Why it happens:** Quick implementation without centralization.
**How to avoid:** Define account manager details (name, email, calendlyUrl, photoUrl) as a constant in a single config file (e.g., `lib/constants.ts` or `lib/dashboard.ts`).
**Warning signs:** URL needs changing and requires multi-file search.

### Pitfall 6: Server Component Importing Client Component Incorrectly
**What goes wrong:** The `"use client"` boundary is not properly set up for the Calendly button, causing build errors.
**Why it happens:** The `AccountManagerCard` needs `onClick` for Calendly and `Script` component (client-only), but the parent dashboard page is a server component.
**How to avoid:** Make the `AccountManagerCard` (or just the `BookMeetingButton`) a `"use client"` component. Pass only serializable props from the server component. Keep the overall page as a server component.
**Warning signs:** Build error: "Event handlers cannot be passed to Client Component props."

## Code Examples

Verified patterns from official sources and existing codebase:

### Server-Side User Data with Clerk currentUser()
```typescript
// Source: Context7 /clerk/clerk-docs - verified pattern
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  // user.firstName, user.lastName, user.emailAddresses[0]?.emailAddress, user.imageUrl
}
```

### Reusable Scanner Type Config (from existing codebase)
```typescript
// Source: src/components/scanners/scanner-list.tsx (existing)
const TYPE_CONFIG: Record<ScannerType, { label: string; emoji: string; badgeClass: string }> = {
  rfps: {
    label: "RFPs",
    emoji: "\ud83d\udcc4",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  meetings: {
    label: "Meetings",
    emoji: "\ud83d\udcc5",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  buyers: {
    label: "Buyers",
    emoji: "\ud83d\udc64",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};
```

### Relative Time Formatting (from existing codebase)
```typescript
// Source: src/components/scanners/scanner-list.tsx (existing)
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
```

### Next.js Script Component for External JS
```typescript
// Source: Context7 /vercel/next.js - Script component docs
import Script from "next/script";

// In a client component:
<Script
  src="https://assets.calendly.com/assets/external/widget.js"
  strategy="lazyOnload"
/>
```

### Account Manager Config Pattern
```typescript
// Recommended: centralize in lib/constants.ts or lib/dashboard.ts
export const ACCOUNT_MANAGER = {
  name: "Matt",
  email: "matt@tendhunt.com",  // User to provide actual email
  calendlyUrl: "https://calendly.com/matt-tendhunt",  // User to provide actual URL
  photoUrl: "/images/matt.jpg",  // Or a placeholder
  greeting: "Hi! I'm Matt, your dedicated account manager. I'm here to help you get the most out of TendHunt.",
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic stat cards dashboard | Personalized hub with AM card + scanner feed | Phase 17 | User sees personalized, actionable content on login |
| Client-side scanner list page | Server component dashboard with scanner summaries | Phase 17 | Faster initial render, no loading spinner |
| No Calendly integration | Vanilla JS Calendly popup | Phase 17 | Direct booking CTA without npm dependency |

**Deprecated/outdated:**
- The current `getContractStats()` + `fetchContracts()` dashboard pattern will be fully replaced. Those imports can be removed from `page.tsx`.
- The quick filter badges section (Open Tenders, Recently Published, High Value) will be removed in favor of quick action links.

## Open Questions

1. **Matt's Calendly URL**
   - What we know: The user wants a "Book a meeting" CTA with Calendly
   - What's unclear: The actual Calendly URL to embed
   - Recommendation: Use a placeholder URL like `https://calendly.com/matt-tendhunt/30min` and store it as a constant. Easy to update later.

2. **Matt's Email Address**
   - What we know: The AM card should show Matt's email
   - What's unclear: The actual email address
   - Recommendation: Use a placeholder like `matt@tendhunt.com` in the constant. User can update.

3. **Matt's Photo**
   - What we know: The AM card in Tussell's pattern shows a photo
   - What's unclear: Whether a real photo exists, or if we should use an avatar/initials fallback
   - Recommendation: Use Avatar component with AvatarFallback ("M" initials) by default. Support an optional `photoUrl` in the config for when a real photo is available.

4. **Score Threshold for "Fresh Signals"**
   - What we know: Should show "high-value" results
   - What's unclear: What score threshold constitutes "high-value" (>=7? >=8?)
   - Recommendation: Use >=7 as default threshold (matches the existing green score badge threshold in contract-card.tsx). Can be made configurable later.

5. **Greeting Personalization**
   - What we know: Tussell shows "Hi [Name], welcome to Tussell"
   - What's unclear: Should this use the Clerk user's first name?
   - Recommendation: Yes, use `currentUser().firstName` for "Welcome back, {firstName}" greeting. Already available via Clerk server-side helper.

## Sources

### Primary (HIGH confidence)
- Context7 `/clerk/clerk-docs` - `currentUser()` helper, server component usage, user object shape
- Context7 `/vercel/next.js` - Server component data fetching, Promise.all parallel pattern, Script component
- Existing codebase `src/app/(dashboard)/dashboard/page.tsx` - Current dashboard pattern being replaced
- Existing codebase `src/models/scanner.ts` - Scanner schema with scores array
- Existing codebase `src/app/api/scanners/route.ts` - Scanner summary computation pattern
- Existing codebase `src/components/scanners/scanner-list.tsx` - Type config, relative time formatting, ScannerRow interface

### Secondary (MEDIUM confidence)
- Calendly Help Center + GitHub tcampb/react-calendly - Embed options, `initPopupWidget` API, widget.js/widget.css URLs
- NPM react-calendly v4.4.0 - Peer deps `>=16.8.0`, last published 9+ months ago

### Tertiary (LOW confidence)
- react-calendly React 19 compatibility - Not explicitly confirmed or denied. Peer dep allows it (`>=16.8.0`) but no official statement. Avoiding it in favor of vanilla JS is the safer choice.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies needed
- Architecture: HIGH - Follows established project patterns (server components, Clerk auth, Mongoose queries, shadcn/ui)
- Pitfalls: HIGH - Identified from direct codebase analysis and known Next.js/Clerk patterns
- Calendly integration: MEDIUM - Vanilla JS embed is well-documented but React 19 + next/script interaction is straightforward but not deeply tested
- Fresh Signals aggregation: MEDIUM - Logic is custom (no library), but follows standard Mongoose query patterns

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days -- stable domain, no fast-moving dependencies)
