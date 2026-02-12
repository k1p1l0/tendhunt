# Phase 18: Admin Panel - Research

**Researched:** 2026-02-12
**Domain:** Next.js admin dashboard with Cloudflare Workers monitoring
**Confidence:** MEDIUM-HIGH

## Summary

Phase 18 requires building a separate Next.js admin application (`apps/admin/`) that provides operational visibility into the TendHunt platform. The admin panel needs to monitor three Cloudflare Workers (data-sync, enrichment, spend-ingest), display recently ingested data (contracts, buyers, signals), show what's being parsed and saved, and manage users with key metrics.

The research reveals that Next.js 16.1 with shadcn/ui provides a production-ready foundation for admin dashboards in 2026. shadcn/ui has dedicated **Blocks** - pre-built dashboard layouts with sidebar navigation, cards, and data tables that are fully responsive and accessible. For Cloudflare Workers monitoring, the platform provides comprehensive observability through the Workers Observability API, metrics, logs, and GraphQL analytics endpoints. Real-time updates can be implemented using Server-Sent Events (SSE) for one-way server-to-client communication or traditional polling for simpler use cases.

Key architectural decision: Deploy admin panel as a separate Next.js app in the monorepo (`apps/admin/`) with its own subdomain (`admin.tendhunt.com`), sharing the MongoDB database and Clerk authentication with the main app. Use Cloudflare's GraphQL Analytics API to query worker metrics, MongoDB aggregation pipelines to fetch recent data, and SSE for real-time job status updates.

**Primary recommendation:** Use shadcn/ui Blocks for dashboard layout (sidebar + data tables), Clerk for authentication with role-based access control, Cloudflare Workers Observability API for metrics, and Server-Sent Events for real-time status updates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1 | Full-stack framework | Already used in apps/web, supports Server Components, API routes, and SSR |
| shadcn/ui | 3.8.4 | UI component library | Already in project, provides Blocks for admin dashboards |
| Tailwind CSS | 4.1 | Styling | Already in project, required by shadcn/ui |
| Clerk | 6.37.3+ | Authentication & user management | Already in project, provides admin dashboard + RBAC |
| MongoDB | 9.2.0+ (mongoose) | Database | Already in project, all worker job data stored here |
| TypeScript | 5.x | Type safety | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 2.15.4+ | Charts & graphs | Visualizing metrics, already in apps/web |
| @tanstack/react-table | 8.x | Data tables | Complex table requirements (shadcn/ui uses this) |
| zustand | 5.0.11+ | State management | Already in project, lightweight store for SSE state |
| date-fns or dayjs | Latest | Date formatting | Worker timestamps, job schedules |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Blocks | Custom layout | Blocks provide pre-built, accessible admin layouts with less code |
| SSE for real-time | WebSockets | SSE is simpler, unidirectional (server→client), perfect for status updates |
| Clerk RBAC | Custom roles | Clerk provides built-in org/role management, less code to maintain |
| Recharts | Chart.js | Recharts integrates better with React/shadcn/ui ecosystem |

**Installation:**
```bash
# Admin app will be created as new workspace
cd apps/admin
bun install next@16.1.6 react@19.2.3 react-dom@19.2.3
bun install @clerk/nextjs mongoose recharts date-fns
bun install -D typescript @types/node @types/react @types/react-dom
bun install -D tailwindcss @tailwindcss/postcss shadcn
```

## Architecture Patterns

### Recommended Project Structure
```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Dashboard layout group
│   │   │   ├── layout.tsx        # Sidebar layout
│   │   │   ├── page.tsx          # Overview dashboard
│   │   │   ├── workers/          # Worker monitoring
│   │   │   │   ├── page.tsx      # All workers overview
│   │   │   │   └── [worker]/     # Individual worker detail
│   │   │   ├── data/             # Recent data views
│   │   │   │   ├── contracts/
│   │   │   │   ├── buyers/
│   │   │   │   └── signals/
│   │   │   └── users/            # User management
│   │   ├── api/
│   │   │   ├── workers/
│   │   │   │   ├── status/route.ts      # SSE endpoint
│   │   │   │   └── metrics/route.ts     # CF API proxy
│   │   │   └── data/
│   │   │       └── recent/route.ts      # MongoDB recent data
│   │   └── layout.tsx            # Root layout with Clerk
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── dashboard/            # Dashboard-specific
│   │   │   ├── sidebar.tsx
│   │   │   ├── worker-status-card.tsx
│   │   │   └── real-time-badge.tsx
│   │   └── data-tables/
│   ├── lib/
│   │   ├── db/                   # MongoDB connection (shared from apps/web)
│   │   ├── cloudflare/           # CF API client
│   │   └── sse/                  # SSE utilities
│   └── types/
├── public/
├── .env.local
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

### Pattern 1: Sidebar Layout with shadcn/ui Blocks
**What:** Use shadcn/ui's built-in Sidebar component and SidebarProvider for consistent navigation
**When to use:** Main admin dashboard layout
**Example:**
```typescript
// Source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/base/sidebar.mdx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}

// components/app-sidebar.tsx
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>Admin Panel</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuItem href="/workers">Overview</SidebarMenuItem>
            <SidebarMenuItem href="/workers/data-sync">Data Sync</SidebarMenuItem>
            <SidebarMenuItem href="/workers/enrichment">Enrichment</SidebarMenuItem>
            <SidebarMenuItem href="/workers/spend-ingest">Spend Ingest</SidebarMenuItem>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
```

### Pattern 2: Worker Status Monitoring Cards
**What:** Status cards showing worker health, last run, errors
**When to use:** Workers overview page
**Example:**
```typescript
// Source: https://context7.com/shadcn-ui/ui/llms.txt (adapted)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface WorkerStatusCardProps {
  name: string
  status: "running" | "error" | "complete"
  lastRun: Date
  totalProcessed: number
  errorCount: number
}

export function WorkerStatusCard({ name, status, lastRun, totalProcessed, errorCount }: WorkerStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <Badge variant={status === "error" ? "destructive" : "default"}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Run</span>
            <span>{formatDistanceToNow(lastRun)} ago</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processed</span>
            <span>{totalProcessed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Errors</span>
            <span className={errorCount > 0 ? "text-destructive" : ""}>
              {errorCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Pattern 3: Server-Sent Events for Real-Time Updates
**What:** SSE endpoint streams worker status updates to dashboard
**When to use:** Real-time monitoring without polling overhead
**Example:**
```typescript
// Source: https://javascript.plainenglish.io/real-time-updates-with-server-sent-events-sse-in-next-js-typescript-a-beginners-guide-d7bb3e932269
// app/api/workers/status/route.ts
import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/client"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const db = await connectToDatabase()

      // Send initial status
      const jobs = await db.collection("enrichmentjobs").find({}).toArray()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(jobs)}\n\n`))

      // Poll for updates every 5 seconds
      const interval = setInterval(async () => {
        const updated = await db.collection("enrichmentjobs").find({}).toArray()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(updated)}\n\n`))
      }, 5000)

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

// Client component
"use client"
import { useEffect, useState } from "react"

export function WorkerStatusMonitor() {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    const eventSource = new EventSource("/api/workers/status")

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setJobs(data)
    }

    return () => eventSource.close()
  }, [])

  return (
    <div className="grid gap-4">
      {jobs.map(job => (
        <WorkerStatusCard key={job._id} {...job} />
      ))}
    </div>
  )
}
```

### Pattern 4: Cloudflare Workers Analytics Query
**What:** Query Cloudflare GraphQL API for worker metrics
**When to use:** Fetching worker performance metrics (requests, errors, CPU time)
**Example:**
```typescript
// lib/cloudflare/analytics.ts
// Source: https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
interface WorkerMetrics {
  requests: number
  errors: number
  cpuTime: number
  duration: number
}

export async function queryWorkerMetrics(
  accountId: string,
  scriptName: string,
  startDate: Date,
  endDate: Date
): Promise<WorkerMetrics> {
  const query = `
    query WorkerMetrics($accountTag: string, $scriptName: string, $start: Time, $end: Time) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            filter: { scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end }
            limit: 10000
          ) {
            sum {
              requests
              errors
              cpuTime
              duration
            }
          }
        }
      }
    }
  `

  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        scriptName,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    }),
  })

  const data = await response.json()
  return data.data.viewer.accounts[0].workersInvocationsAdaptive.sum
}
```

### Pattern 5: Recent Data Aggregation
**What:** MongoDB aggregation to fetch recently added/updated data
**When to use:** "Recently Added" views for contracts, buyers, signals
**Example:**
```typescript
// app/api/data/recent/route.ts
import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/client"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const collection = searchParams.get("collection") || "contracts"
  const limit = parseInt(searchParams.get("limit") || "50")

  const db = await connectToDatabase()

  const recentData = await db
    .collection(collection)
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          updatedAt: 1,
          // Collection-specific fields
          ...(collection === "contracts" && {
            buyerName: 1,
            status: 1,
            valueMax: 1,
          }),
          ...(collection === "buyers" && {
            name: 1,
            sector: 1,
            enrichmentScore: 1,
          }),
          ...(collection === "signals" && {
            organizationName: 1,
            signalType: 1,
            title: 1,
          }),
        },
      },
    ])
    .toArray()

  return NextResponse.json(recentData)
}
```

### Pattern 6: Clerk User Management with RBAC
**What:** Display users from Clerk with metadata, support role-based views
**When to use:** User management page
**Example:**
```typescript
// app/api/users/route.ts
// Source: https://clerk.com/docs/guides/users/managing
import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if current user is admin (via Clerk metadata or organization role)
  const currentUser = await clerkClient.users.getUser(userId)
  const isAdmin = currentUser.publicMetadata?.role === "admin"

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch all users
  const users = await clerkClient.users.getUserList({
    limit: 100,
  })

  // Enrich with MongoDB data (company profiles, credits)
  const db = await connectToDatabase()
  const enrichedUsers = await Promise.all(
    users.data.map(async (user) => {
      const profile = await db.collection("companyprofiles").findOne({ userId: user.id })
      const credits = await db.collection("credits").findOne({ clerkId: user.id })

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        companyName: profile?.companyName,
        creditsRemaining: credits?.creditsRemaining || 0,
      }
    })
  )

  return NextResponse.json(enrichedUsers)
}
```

### Anti-Patterns to Avoid
- **Polling every second:** SSE or 5-10s polling is sufficient for admin dashboards
- **Exposing worker secrets:** Never pass MONGODB_URI or API keys to client
- **Direct MongoDB queries from client:** Always use API routes with Clerk auth
- **Embedding worker URLs:** Use worker names + Cloudflare API instead
- **Shared state between admin and main app:** Keep zustand stores separate

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashboard layout | Custom sidebar/navigation | shadcn/ui Sidebar + Blocks | Accessible, responsive, pre-built with state management |
| Data tables | Custom table with sorting/pagination | shadcn/ui Data Table (@tanstack/react-table) | Complex features (sorting, filtering, pagination) already solved |
| Authentication | Custom admin login | Clerk with RBAC | User management, org roles, webhooks already integrated |
| Real-time updates | Custom WebSocket server | Server-Sent Events (SSE) | Simpler for one-way updates, built into HTTP |
| Worker metrics | Scraping worker logs | Cloudflare Workers Observability API | Official API with GraphQL, metrics, logs |
| Date formatting | Manual timestamp parsing | date-fns or dayjs | Edge cases (timezones, locales) already handled |
| Charts | Canvas/SVG from scratch | Recharts | Responsive, accessible, React-native |

**Key insight:** Admin dashboards are a solved problem in 2026. shadcn/ui Blocks provide production-ready layouts, Clerk handles user management, and Cloudflare's official APIs provide worker observability. Focus on data integration, not UI primitives.

## Common Pitfalls

### Pitfall 1: SSE Connection Not Closing Properly
**What goes wrong:** EventSource connections leak, causing memory/connection pool exhaustion
**Why it happens:** Client doesn't close EventSource on unmount, server doesn't detect disconnect
**How to avoid:**
- Always close EventSource in React useEffect cleanup
- Listen for `req.signal` abort event on server to cleanup intervals
- Set reasonable timeouts (max 5 minutes)
**Warning signs:** Browser DevTools shows multiple pending SSE connections, worker memory grows

### Pitfall 2: Cloudflare API Rate Limits
**What goes wrong:** Admin dashboard exceeds Cloudflare API rate limits, metrics fail to load
**Why it happens:** Querying analytics API on every page load or too frequently
**How to avoid:**
- Cache metrics in MongoDB with 5-minute TTL
- Use Cloudflare Workers Analytics Engine for custom metrics
- Batch requests (query all workers in one GraphQL request)
**Warning signs:** 429 errors in browser console, slow dashboard loads

### Pitfall 3: Clerk Webhook Delays in User List
**What goes wrong:** Newly registered users don't appear in admin panel immediately
**Why it happens:** Clerk webhooks are async, MongoDB may not be updated yet
**How to avoid:**
- Fetch directly from Clerk API for user list (source of truth)
- Use MongoDB for enrichment data (company profiles, credits) only
- Show "syncing" state for users without MongoDB records
**Warning signs:** Users report seeing different data in admin vs main app

### Pitfall 4: Large Job Error Logs Crashing UI
**What goes wrong:** Rendering 1000+ error log entries freezes browser
**Why it happens:** No pagination on error logs, entire array rendered at once
**How to avoid:**
- Limit error logs to last 100 entries (already done in worker code via $slice)
- Use virtualization for long lists (react-window or @tanstack/react-virtual)
- Paginate or collapse error logs by default
**Warning signs:** Admin panel freezes on workers page, React DevTools shows thousands of DOM nodes

### Pitfall 5: Stale Data in Real-Time Views
**What goes wrong:** SSE shows "running" but worker is actually complete
**Why it happens:** SSE polling interval misses state transitions, no reconciliation
**How to avoid:**
- Combine SSE with manual refresh button
- Use optimistic updates + reconciliation on page focus
- Add last-updated timestamp to detect stale data
**Warning signs:** Users refresh page and see different state

### Pitfall 6: Mixing Server and Client Components Incorrectly
**What goes wrong:** "use client" added to every component, losing Server Component benefits
**Why it happens:** Unclear when SSE/state management requires client components
**How to avoid:**
- Keep layout, static cards as Server Components
- Only mark SSE consumers, interactive widgets as "use client"
- Pass data down from Server Components to client components
**Warning signs:** Slow initial page load, large client bundle size

## Code Examples

Verified patterns from official sources are included in Architecture Patterns section above.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom admin layouts | shadcn/ui Blocks | March 2024 | Pre-built, accessible dashboard layouts |
| Polling for real-time | Server-Sent Events | 2023-2024 | Simpler API, native browser support, less overhead |
| Custom user management | Clerk Admin Dashboard | 2023+ | Built-in user management, RBAC, webhooks |
| REST API for analytics | GraphQL Analytics API | 2022+ (Cloudflare) | More flexible querying, batch requests |
| Manual Next.js subdomain setup | Cloudflare Pages custom domains | 2023+ | One-click subdomain config |
| Long polling | SSE with automatic reconnect | 2024+ | Better browser support, cleaner code |

**Deprecated/outdated:**
- **Next.js 12 Pages Router admin templates:** Use App Router (Next.js 13+) with Server Components
- **WebSockets for simple server→client updates:** SSE is simpler, built into HTTP
- **Manual Clerk user syncing:** Use Clerk webhooks (already implemented in apps/web)
- **Cloudflare Workers Logpush to S3:** Use Workers Observability API directly

## Open Questions

1. **Should admin panel share Clerk instance or have separate auth?**
   - What we know: Main app uses Clerk with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - What's unclear: Whether to reuse same Clerk app or create separate admin-only instance
   - Recommendation: Reuse same Clerk instance, use organization roles or public metadata `{role: "admin"}` for RBAC. Simpler billing, user management.

2. **How to deploy apps/admin as separate subdomain on Cloudflare Pages?**
   - What we know: Main app is `app.tendhunt.com`, landing is `tendhunt.com`
   - What's unclear: Monorepo deployment strategy for third app on `admin.tendhunt.com`
   - Recommendation: Create separate Cloudflare Pages project for `apps/admin`, configure custom domain. Monorepo support via separate Git integration or manual deployment.

3. **Real-time updates: SSE or polling?**
   - What we know: Worker jobs update every 1-60 minutes (cron schedules)
   - What's unclear: Whether SSE overhead justified for slow-changing data
   - Recommendation: Start with 10-second polling via useEffect + setInterval. Migrate to SSE if real-time (<1s latency) becomes critical. Simpler to debug.

4. **Should admin panel have write capabilities (pause jobs, rerun)?**
   - What we know: Current workers auto-run on cron, no manual triggers
   - What's unclear: User requirement scope (read-only vs operational controls)
   - Recommendation: Start read-only. Add write operations (pause, trigger) in future phase if needed. Requires worker API endpoints.

5. **How to handle multi-stage worker progress visualization?**
   - What we know: Enrichment has 8 stages, spend-ingest has 4 stages
   - What's unclear: Whether to show per-stage progress or just overall job status
   - Recommendation: Show current stage + overall progress (e.g., "Stage 3/8: personnel - 450/2384 buyers"). Use linear progress bar + stage labels.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Sidebar Documentation](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/base/sidebar.mdx) - Official sidebar component guide
- [shadcn/ui Data Table](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/radix/data-table.mdx) - Official data table patterns
- [shadcn/ui Blocks Announcement](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/changelog/2024-03-blocks.mdx) - Dashboard layouts launch
- [Cloudflare Workers Observability](https://developers.cloudflare.com/workers/observability/) - Official observability docs
- [Cloudflare Workers Metrics and Analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/) - Metrics API guide
- [Querying Workers Metrics with GraphQL](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/) - GraphQL analytics tutorial
- [Clerk User Management](https://clerk.com/docs/guides/users/managing) - Official user management guide
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) - Next.js integration

### Secondary (MEDIUM confidence)
- [Next.js & shadcn/ui Admin Dashboard Template](https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard) - Verified Vercel template
- [Real-Time Updates with SSE in Next.js (Jan 2026)](https://javascript.plainenglish.io/real-time-updates-with-server-sent-events-sse-in-next-js-typescript-a-beginners-guide-d7bb3e932269) - Recent SSE guide
- [Next.js Admin Dashboard Templates (2026)](https://nextjstemplates.com/blog/admin-dashboard-templates) - Current ecosystem overview
- [Next.js · Cloudflare Pages docs](https://developers.cloudflare.com/pages/framework-guides/nextjs/) - Deployment guide
- [Cloudflare Workers Analytics Engine](https://blog.cloudflare.com/workers-analytics-engine/) - Custom metrics announcement

### Tertiary (LOW confidence)
- [Next.js SaaS Dashboard Best Practices](https://www.ksolves.com/blog/next-js/best-practices-for-saas-dashboards) - General best practices
- [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/) - Aggregation reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project or official shadcn/ui docs
- Architecture: MEDIUM-HIGH - Patterns verified from official sources, some adapted for TendHunt specifics
- Cloudflare APIs: MEDIUM - Official docs exist, but haven't tested GraphQL queries in practice
- SSE implementation: MEDIUM - Pattern verified, but TendHunt-specific integration untested
- Deployment: MEDIUM - Cloudflare Pages subdomain setup unclear for monorepo

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - admin dashboard patterns are stable)

**Key risks:**
1. Cloudflare GraphQL API rate limits unclear - may need caching layer
2. SSE browser compatibility in production environment unknown
3. Monorepo deployment to multiple Cloudflare Pages projects not verified
4. Clerk RBAC pattern (publicMetadata vs organizations) needs testing

**Next steps for planner:**
1. Decide on Clerk RBAC approach (metadata vs organizations)
2. Confirm Cloudflare GraphQL API access (need API token with Analytics:Read permission)
3. Determine initial scope: read-only or operational controls
4. Plan deployment strategy for apps/admin subdomain
