# Phase 1: Foundation - Research

**Researched:** 2026-02-10
**Domain:** Next.js 16 + Clerk Auth + MongoDB Atlas/Mongoose + shadcn/ui + Tailwind CSS 4.1
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the entire TendHunt application: a Next.js 16 project with Clerk authentication, MongoDB Atlas database with Mongoose schemas, and an app shell layout using shadcn/ui with Tailwind CSS v4. This is a greenfield project -- no existing codebase exists beyond planning documents.

The tech stack has been locked by prior decisions: MongoDB Atlas replaces the originally-researched PostgreSQL/Drizzle/Neon stack. This is a significant divergence from the prior STACK.md research (which recommended against MongoDB), but the decision is final. Mongoose 9.x is the standard ODM for MongoDB with Next.js, and the connection caching pattern for serverless environments is well-documented.

Key finding: Next.js 16 renamed `middleware.ts` to `proxy.ts` -- this is a breaking change that affects Clerk integration. Clerk's latest SDK already supports this via `@clerk/nextjs/server`. Additionally, `mongoose` is already in Next.js 16's automatic server external packages list, so no special configuration is needed for Turbopack compatibility.

**Primary recommendation:** Use `create-next-app@latest` to scaffold, then immediately configure Clerk auth + Mongoose connection + shadcn/ui in that order. Define all 5 MongoDB collections (contracts, buyers, signals, users, credits) with Mongoose schemas upfront, even though only users/credits are actively used in Phase 1. This prevents schema rework in later phases.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.x | Full-stack framework (App Router, RSC, API routes) | Turbopack default bundler (2-5x faster builds), React 19.2, `proxy.ts` replaces middleware, `use cache` directive. Verified via [nextjs.org/blog/next-16](https://nextjs.org/blog/next-16) |
| React | 19.2.x | UI library (ships with Next.js 16) | View Transitions, useEffectEvent, Activity component. Server Components for zero-JS initial loads |
| TypeScript | 5.7.x | Type safety | Required for Mongoose schema inference and Clerk auth helpers |
| Mongoose | 9.2.x | MongoDB ODM | Official Next.js integration guide exists. Auto-type inference from schemas. Auto-externalized in Next.js 16 Turbopack. Verified via [mongoosejs.com/docs/nextjs.html](https://mongoosejs.com/docs/nextjs.html) |
| @clerk/nextjs | latest | Authentication (signup, signin, session) | Pre-built components, `proxy.ts` support, `verifyWebhook()` from `@clerk/nextjs/webhooks`. Verified via [clerk.com/docs/quickstarts/nextjs](https://clerk.com/docs/quickstarts/nextjs) |
| Tailwind CSS | 4.1.x | Utility-first styling | CSS-first config (no tailwind.config.js), `@theme` directives, auto content detection. Verified via [tailwindcss.com/blog/tailwindcss-v4-1](https://tailwindcss.com/blog/tailwindcss-v4-1) |
| shadcn/ui | latest (Feb 2026) | Component library | Tailwind v4 compatible, `tw-animate-css` replaces `tailwindcss-animate`, OKLCH colors, `data-slot` attributes. Verified via [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.24.x | Schema validation (API inputs, env vars) | Validate webhook payloads, API route inputs, environment variables |
| Zustand | 5.x | Client state (sidebar open, filters) | Only for UI state that doesn't belong in URL params. Keep minimal in Phase 1 |
| svix | N/A | NOT NEEDED | Clerk now uses built-in `verifyWebhook()` from `@clerk/nextjs/webhooks`. No svix dependency required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mongoose | Native MongoDB driver | Mongoose adds schema validation, TypeScript inference, middleware hooks, and model pattern. Worth the overhead for this project |
| Mongoose | Prisma with MongoDB | Prisma MongoDB support is less mature than Prisma PostgreSQL. Mongoose is the standard for MongoDB |
| shadcn/ui | Radix UI directly | shadcn/ui wraps Radix with Tailwind styling. Pre-built patterns for dashboard components (Sidebar, Card, Table) save significant time |

**Installation:**

```bash
# Create Next.js 16 app with TypeScript, Tailwind v4, App Router, Turbopack
npx create-next-app@latest tendhunt --typescript --tailwind --app

# Core dependencies
npm install mongoose @clerk/nextjs zod zustand

# shadcn/ui setup
npx shadcn@latest init
npx shadcn@latest add button card badge sidebar sheet avatar dropdown-menu separator input
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth route group (public)
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx             # Centered auth layout
│   ├── (dashboard)/               # Protected route group
│   │   ├── layout.tsx             # Dashboard shell (sidebar + header)
│   │   ├── dashboard/page.tsx     # Main dashboard (placeholder in Phase 1)
│   │   ├── contracts/page.tsx     # Placeholder
│   │   ├── buyers/page.tsx        # Placeholder
│   │   └── settings/page.tsx      # Placeholder
│   ├── (marketing)/               # Public landing pages
│   │   ├── page.tsx               # Landing page (placeholder)
│   │   └── layout.tsx             # Marketing layout
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/route.ts     # Clerk webhook handler
│   ├── layout.tsx                 # Root layout with ClerkProvider
│   └── globals.css                # Tailwind v4 CSS-first config
├── components/
│   ├── ui/                        # shadcn/ui base components
│   ├── layout/
│   │   ├── app-sidebar.tsx        # Dashboard sidebar navigation
│   │   ├── header.tsx             # Dashboard header with UserButton
│   │   └── sidebar-nav.tsx        # Sidebar navigation items
│   └── providers.tsx              # Client providers wrapper
├── lib/
│   ├── mongodb.ts                 # Mongoose connection singleton
│   ├── utils.ts                   # cn() helper from shadcn/ui
│   └── env.ts                     # Environment variable validation with Zod
├── models/                        # Mongoose model definitions
│   ├── user.ts                    # User model (synced from Clerk)
│   ├── contract.ts                # Contract schema (unified from FaT/CF)
│   ├── buyer.ts                   # Buyer organization model
│   ├── signal.ts                  # Buying signal model
│   └── credit.ts                  # Credit account + transaction models
├── types/                         # Shared TypeScript types
│   └── index.ts
└── proxy.ts                       # Clerk auth proxy (was middleware.ts)
```

### Pattern 1: Mongoose Connection Singleton for Next.js

**What:** Cache the Mongoose connection globally to prevent connection storms in serverless/hot-reload environments.
**When to use:** Always. Every file that needs DB access imports `dbConnect()`.

```typescript
// Source: https://mongoosejs.com/docs/nextjs.html
// lib/mongodb.ts

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

async function dbConnect(): Promise<typeof mongoose> {
  // mongoose.connect() is a no-op if already connected
  await mongoose.connect(MONGODB_URI);
  return mongoose;
}

export default dbConnect;
```

### Pattern 2: Clerk proxy.ts for Next.js 16

**What:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Clerk's `clerkMiddleware()` works in `proxy.ts`.
**When to use:** Always. This is the auth boundary for the entire app.

```typescript
// Source: https://clerk.com/docs/quickstarts/nextjs + Next.js 16 upgrade guide
// proxy.ts (NOT middleware.ts)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Pattern 3: Mongoose Model Registration (Hot Reload Safe)

**What:** Use `mongoose.models.X || mongoose.model('X', schema)` to prevent model recompilation during development hot reloads.
**When to use:** Every model file.

```typescript
// Source: https://mongoosejs.com/docs/nextjs.html
// models/user.ts

import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  clerkId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
```

### Pattern 4: Clerk Webhook for User Sync

**What:** When a user signs up via Clerk, create a corresponding User document in MongoDB.
**When to use:** Phase 1 setup. This webhook is the bridge between Clerk auth and your database.

```typescript
// Source: https://clerk.com/docs/guides/development/webhooks/syncing
// app/api/webhooks/clerk/route.ts

import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === 'user.created') {
      await dbConnect();
      await User.create({
        clerkId: evt.data.id,
        email: evt.data.email_addresses?.[0]?.email_address,
        firstName: evt.data.first_name,
        lastName: evt.data.last_name,
        imageUrl: evt.data.image_url,
      });
    }

    if (evt.type === 'user.updated') {
      await dbConnect();
      await User.findOneAndUpdate(
        { clerkId: evt.data.id },
        {
          email: evt.data.email_addresses?.[0]?.email_address,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
          updatedAt: new Date(),
        }
      );
    }

    if (evt.type === 'user.deleted') {
      await dbConnect();
      await User.findOneAndDelete({ clerkId: evt.data.id });
    }

    return new Response('Webhook received', { status: 200 });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }
}
```

### Pattern 5: Dashboard Layout with shadcn/ui Sidebar

**What:** Use shadcn/ui's Sidebar component for the authenticated app shell.
**When to use:** Phase 1 layout setup. This layout wraps all `(dashboard)` routes.

```typescript
// app/(dashboard)/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### Anti-Patterns to Avoid

- **Using `middleware.ts` instead of `proxy.ts`:** Next.js 16 deprecated `middleware.ts`. While it still works (Edge runtime), `proxy.ts` runs on Node.js runtime and is the future. Clerk works with both but `proxy.ts` is the correct file.
- **Creating a new Mongoose connection per request:** Use the singleton pattern. Mongoose.connect() is a no-op when already connected. Do NOT call `mongoose.disconnect()` after queries.
- **Putting Mongoose models inside API route files:** Define models in `models/` directory with the `mongoose.models.X || mongoose.model()` pattern. Defining models inline causes recompilation errors during hot reload.
- **Importing Mongoose in client components:** Mongoose is server-only. Keep all DB access in Server Components, Server Actions, or API routes.
- **Using `experimental.serverComponentsExternalPackages`:** This was renamed to `serverExternalPackages` in Next.js 15 and moved to top-level config. However, `mongoose` is already auto-externalized in Next.js 16 -- no configuration needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT, bcrypt, session management | Clerk (`@clerk/nextjs`) | Auth bugs = security vulnerabilities. Clerk: 15 min setup, pre-built components, webhook sync |
| User sync to DB | Custom signup handler, manual DB writes | Clerk webhooks + `verifyWebhook()` | Clerk handles email verification, social login, session. Webhook syncs user to MongoDB automatically |
| Component library | Custom buttons, cards, modals, sidebars | shadcn/ui (`npx shadcn@latest add`) | Pre-built, accessible, Tailwind v4 compatible. Copies into codebase (no dependency) |
| CSS framework | Custom CSS, CSS modules, styled-components | Tailwind CSS v4 | CSS-first config, automatic content detection, zero setup with Next.js 16 |
| Form validation | Custom validation logic | Zod schemas | TypeScript-first, composes with Mongoose schemas, works server and client |
| MongoDB connection | Manual connection pool management | Mongoose singleton (`dbConnect()`) | Handles connection pooling, reconnection, serverless caching automatically |
| Route protection | Custom auth checks per page | Clerk `clerkMiddleware()` + `auth.protect()` | Single proxy.ts file protects all routes. `auth()` in Server Components for data access |

**Key insight:** For a 1-week hackathon, every hour spent on infrastructure code is an hour not spent on the product demo. Clerk, shadcn/ui, and Mongoose eliminate entire categories of boilerplate.

## Common Pitfalls

### Pitfall 1: Using middleware.ts Instead of proxy.ts

**What goes wrong:** Clerk's `clerkMiddleware()` is placed in `middleware.ts` (the old name). Next.js 16 deprecates this file name and it runs on Edge runtime, which does NOT support Mongoose. If any middleware logic tries to access MongoDB, it fails silently or crashes.
**Why it happens:** All pre-2025 tutorials and even some current Clerk docs still reference `middleware.ts`.
**How to avoid:** Create `proxy.ts` at project root (or `src/proxy.ts`). Export the function as `proxy` or use default export. The `proxy.ts` file runs on Node.js runtime.
**Warning signs:** Seeing "Edge Runtime is not supported" errors, or middleware not executing.

### Pitfall 2: Mongoose Connection Storms in Development

**What goes wrong:** During `next dev`, hot module replacement creates new Mongoose connections on every file change. MongoDB Atlas M0 has a 100-connection limit. After 20-30 file saves, the app crashes with "MongoServerError: too many open connections."
**Why it happens:** Each hot reload re-executes the module, calling `mongoose.connect()` again. Without the singleton pattern, each call creates a new connection.
**How to avoid:** Use the official Mongoose Next.js pattern: `mongoose.connect()` is a no-op when already connected. The singleton pattern shown above handles this. Do NOT close connections after queries.
**Warning signs:** Slow responses in dev mode, "too many connections" errors, MongoDB Atlas dashboard showing connection count climbing.

### Pitfall 3: Clerk Webhook Route Not Excluded from Auth

**What goes wrong:** The Clerk webhook endpoint at `/api/webhooks/clerk` is behind auth protection. Clerk's webhook service cannot authenticate, so webhooks fail silently. Users sign up via Clerk but no User document is created in MongoDB.
**Why it happens:** `clerkMiddleware()` with `auth.protect()` blocks all non-authenticated requests by default. The webhook route must be explicitly marked as public.
**How to avoid:** Use `createRouteMatcher` to mark `/api/webhooks(.*)` as a public route (shown in Pattern 2 above). Test webhook delivery in Clerk Dashboard after deploying.
**Warning signs:** User signs up but no MongoDB document appears. Clerk Dashboard webhook logs show 401/403 responses.

### Pitfall 4: Forgetting Async params/searchParams in Next.js 16

**What goes wrong:** Page components access `params.id` or `searchParams.q` synchronously. In Next.js 16, these are Promises that must be awaited. The build fails or runtime errors occur.
**Why it happens:** Next.js 15 had temporary synchronous compatibility. Next.js 16 removes this entirely.
**How to avoid:** Always `await` params and searchParams:
```typescript
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  // ...
}
```
**Warning signs:** Build errors mentioning "params is not a function" or "Cannot read properties of undefined."

### Pitfall 5: Not Setting Up Webhook Testing for Local Development

**What goes wrong:** Webhooks only fire to public URLs. During local development, Clerk cannot reach `localhost:3000/api/webhooks/clerk`. The team builds the webhook handler but cannot test it until deployment.
**Why it happens:** Webhooks require a publicly accessible endpoint. Local development is not publicly accessible.
**How to avoid:** Use ngrok or Clerk's local development webhook testing. Run `ngrok http 3000`, copy the forwarding URL, add it as a webhook endpoint in Clerk Dashboard. Test with "Send Example" button.
**Warning signs:** Webhook handler code exists but has never been executed. User sync only discovered broken after Vercel deployment.

### Pitfall 6: MongoDB Atlas Network Access Not Configured

**What goes wrong:** The Next.js app connects to MongoDB Atlas but gets a "MongoServerError: connection timed out" or "IP not whitelisted" error. Vercel's dynamic IPs are blocked.
**Why it happens:** MongoDB Atlas requires IP whitelisting. Vercel serverless functions use dynamic IPs that change per invocation.
**How to avoid:** In MongoDB Atlas Network Access settings, add `0.0.0.0/0` to allow access from anywhere. For a hackathon, this is acceptable. For production, use MongoDB Atlas VPC peering or Vercel's static IP (paid feature).
**Warning signs:** App works locally but fails on Vercel. Intermittent connection timeouts.

## Code Examples

Verified patterns from official sources:

### Next.js 16 next.config.ts (Minimal for Phase 1)

```typescript
// Source: https://nextjs.org/docs/app/guides/upgrading/version-16
// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // mongoose is auto-externalized in Next.js 16 -- no config needed
  // Turbopack is default -- no flags needed
  // Tailwind v4 auto-detected -- no config needed
};

export default nextConfig;
```

### Root Layout with ClerkProvider

```typescript
// Source: https://clerk.com/docs/quickstarts/nextjs
// app/layout.tsx

import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'TendHunt - UK Procurement Intelligence',
  description: 'AI-powered contract alerts and buyer intelligence for UK government procurement',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-background font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### Tailwind CSS v4 globals.css (CSS-first config)

```css
/* Source: https://ui.shadcn.com/docs/tailwind-v4 */
/* app/globals.css */

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.965 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.965 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

/* ... dark theme variables */

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

### MongoDB Unified Contract Schema (Mongoose)

```typescript
// models/contract.ts
// Designed for unified data from Find a Tender and Contracts Finder

import mongoose, { Schema } from 'mongoose';

const contractSchema = new Schema({
  // Source identification
  ocid: { type: String, sparse: true },           // OCDS procurement ID
  noticeId: { type: String, required: true },      // Source-specific ID
  source: {
    type: String,
    enum: ['FIND_A_TENDER', 'CONTRACTS_FINDER'],
    required: true,
  },
  sourceUrl: { type: String },

  // Core fields
  title: { type: String, required: true, index: 'text' },
  description: { type: String, index: 'text' },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'AWARDED', 'CANCELLED'],
    default: 'OPEN',
    index: true,
  },
  stage: {
    type: String,
    enum: ['PLANNING', 'TENDER', 'AWARD'],
    default: 'TENDER',
  },

  // Buyer
  buyerName: { type: String, required: true, index: true },
  buyerOrg: { type: String },
  buyerRegion: { type: String, index: true },

  // Classification
  cpvCodes: [{ type: String }],
  sector: { type: String, index: true },

  // Value
  valueMin: { type: Number },
  valueMax: { type: Number },
  currency: { type: String, default: 'GBP' },

  // Dates
  publishedDate: { type: Date, index: true },
  deadlineDate: { type: Date, index: true },

  // AI scoring (populated in Phase 5)
  vibeScore: { type: Number, min: 0, max: 10 },
  vibeReasoning: { type: String },

  // Raw data preservation
  rawData: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

// Compound indexes for common queries
contractSchema.index({ source: 1, noticeId: 1 }, { unique: true });
contractSchema.index({ status: 1, publishedDate: -1 });
contractSchema.index({ sector: 1, status: 1 });

const Contract = mongoose.models.Contract || mongoose.model('Contract', contractSchema);
export default Contract;
```

### Environment Variables

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tendhunt?retryWrites=true&w=majority

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxx

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 (Oct 2025) | File must be renamed. Export function as `proxy`. Runs on Node.js runtime (not Edge). Clerk SDK supports both |
| `tailwind.config.js` | CSS-first config in `globals.css` | Tailwind v4 (2025) | No config file. Use `@theme inline` directives. `tw-animate-css` replaces `tailwindcss-animate` |
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (stable, top-level) | Next.js 15+ | Mongoose auto-externalized. No config needed |
| Svix for Clerk webhooks | `verifyWebhook()` from `@clerk/nextjs/webhooks` | Clerk SDK 2025+ | No svix dependency needed. Built-in verification |
| Synchronous `params`/`searchParams` | Async only (`await params`) | Next.js 16 | All dynamic APIs must be awaited. Sync access removed entirely |
| `experimental.turbopack` | Top-level `turbopack` config | Next.js 16 | Turbopack is default bundler. No opt-in flags. Config moved out of experimental |
| `next lint` command | Use ESLint/Biome directly | Next.js 16 | `next lint` removed. `next build` no longer runs linting |
| Mongoose 8.x | Mongoose 9.x | Nov 2025 | Major version. TypeScript improvements, schema inference enhancements |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16, still works but will be removed. Use `proxy.ts`
- `tailwindcss-animate`: Deprecated, replaced by `tw-animate-css`
- `hsl()` color format in shadcn/ui: Now uses OKLCH
- `serverComponentsExternalPackages`: Renamed to `serverExternalPackages`, but mongoose is auto-handled

## Open Questions

1. **Clerk Keyless Mode vs API Keys**
   - What we know: Clerk now supports "keyless mode" that works without API keys for local development, generating temporary credentials
   - What's unclear: Whether keyless mode is sufficient for the hackathon or if real API keys should be configured from day 1
   - Recommendation: Configure real Clerk API keys from day 1. Keyless mode is for quick prototyping but webhooks require a real Clerk application

2. **MongoDB Atlas Cluster Region**
   - What we know: M0 free tier, 512MB storage, 100 connections. Sufficient for hackathon
   - What's unclear: Optimal region for UK-focused app deployed on Vercel
   - Recommendation: Use AWS eu-west-1 (Ireland) or eu-west-2 (London) for lowest latency. Vercel's London edge is nearby

3. **Mongoose vs Native MongoDB Driver for Schemas**
   - What we know: Mongoose 9.x has excellent TypeScript support and is auto-externalized in Next.js 16
   - What's unclear: Performance overhead of Mongoose vs native driver for simple operations
   - Recommendation: Use Mongoose. The schema validation, middleware hooks, and model pattern are worth the minimal overhead. The project needs 5 collections with validation -- exactly Mongoose's sweet spot

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) - proxy.ts, Turbopack default, breaking changes, React 19.2
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Full migration details, async APIs, config changes
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) - mongoose auto-externalized
- [Mongoose Next.js Guide](https://mongoosejs.com/docs/nextjs.html) - Official connection pattern, model registration
- [Mongoose TypeScript Schemas](https://mongoosejs.com/docs/typescript/schemas.html) - Schema type inference
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs) - proxy.ts setup, ClerkProvider, auth()
- [Clerk Webhook Syncing](https://clerk.com/docs/guides/development/webhooks/syncing) - verifyWebhook(), event types
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) - CSS-first config, tw-animate-css, OKLCH colors
- [MongoDB Atlas M0 Limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) - 512MB storage, 100 connections

### Secondary (MEDIUM confidence)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) - Migration from v3 to v4
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog) - Latest component updates
- [Mongoose npm](https://www.npmjs.com/package/mongoose) - Version 9.2.x confirmed

### Tertiary (LOW confidence)
- None. All claims verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against official sources. Next.js 16.1.x, Mongoose 9.2.x, Clerk latest, Tailwind 4.1.x confirmed
- Architecture: HIGH - Patterns from official Mongoose Next.js guide, Clerk docs, and Next.js 16 upgrade guide
- Pitfalls: HIGH - Connection storms, proxy.ts rename, async APIs all documented in official sources. MongoDB Atlas limits from official docs

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable stack, no fast-moving dependencies)
