# Phase 6: Buyer Intelligence & Credits - Research

**Researched:** 2026-02-11
**Domain:** Buyer profile pages, contact reveal with credit system, MongoDB atomic operations, CSS blur animations
**Confidence:** HIGH

## Summary

Phase 6 builds buyer organization profile pages with tabbed content, a contact reveal system gated by credits, and credit balance management UI. The technical challenges are: (1) per-user reveal state tracking in a multi-user system, (2) atomic credit deduction that prevents double-spend and negative balances, (3) CSS blur-to-reveal animation for locked contacts, and (4) a sidebar credit balance display with animated counter.

The codebase already has all required models (Buyer with contacts, CreditAccount, CreditTransaction, Signal, Contract), seed data (75 buyers with 192 contacts), and UI infrastructure (shadcn/ui, Tailwind CSS 4, Zustand, breadcrumb context). The primary new UI components needed are shadcn Tabs and Popover. The critical architectural decision is how to track which users have unlocked which buyers -- the current `isRevealed` field on the Buyer contact subdocument is a global flag that does not support multi-user state.

**Primary recommendation:** Use a new `ContactReveal` model (userId + buyerId compound index) to track per-user unlock state, and use MongoDB's `findOneAndUpdate` with `{ balance: { $gte: 1 } }` filter + `{ $inc: { balance: -1 } }` update for atomic credit deduction that prevents negative balances and double-spend in a single operation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Buyer profile layout**: Header + tabbed content pattern (like Starbridge reference). Header card: org logo, org name, then metadata row: Sector, Region, Contract count, Website link. 4 tabs: Contracts, Key Contacts, Buying Signals, Buyer Attributes. Buyer Attributes tab: 3-column grid of scored cards -- mix of factual stats (contract count, avg value) AND AI-generated scores (SME Friendliness, Procurement Complexity, etc.). Attributes cards show label + info icon + numeric value. Breadcrumb navigation: Buyers > [Org Name].
- **Contact card layout**: Match Starbridge reference exactly: Name as header, then horizontal row with job title (building icon), phone (phone icon), email (mail icon). Copy-to-clipboard button on email and phone fields. Contact count shown at top of contacts tab ("X Key Contacts").
- **Contact locked state**: Name + job title VISIBLE in locked state. Phone and email fields use CSS blur effect on actual text (frosted glass look). Single "Unlock Contacts (1 Credit)" CTA button at top of contacts tab.
- **Contact reveal interaction**: Per-buyer pricing: 1 credit reveals ALL contacts for that organization. Instant reveal with no confirmation dialog. Fast snappy animation (~300ms blur dissolve). Already-revealed buyers show green "Unlocked" badge on buyer header and in buyers table.
- **Credit system UX**: Balance display: sidebar bottom (always visible, not prominent). Animated counter when credits deducted. Zero balance: reveal button changes to "Get More Credits". Transaction history: clicking credit balance in sidebar opens popover/dropdown with recent transactions.
- **Navigation & discovery**: Two paths to buyer profiles: clickable buyer name on contract cards/detail pages, and dedicated Buyers page in sidebar. Buyers list page: data table with sortable columns. Standalone page at /buyers. Unlocked column/badge in buyers table.

### Claude's Discretion
- Buyer Attributes card grid exact contents and AI score categories
- Table sorting defaults and filter options on buyers list page
- Exact blur intensity and dissolve animation easing curve
- Transaction history popover layout and content density
- Empty states for tabs with no data (no signals, no contracts)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, API routes | Framework already in use |
| Mongoose | 9.2.0 | MongoDB ODM, atomic operations | Already in use, findOneAndUpdate is atomic |
| shadcn/ui | latest | Tabs, Popover, Table, Card, Badge, Avatar | Project design system |
| Tailwind CSS | 4.x | Blur utilities, transitions, animations | Already in use |
| Zustand | 5.0.11 | Credit balance client-side state | Already used for scanner store |
| Clerk | 6.37.3 | Auth, userId for per-user state | Already in use |
| lucide-react | 0.563.0 | Icons (Building2, Phone, Mail, Copy, Sparkles, Lock, Unlock) | Already in use |

### New shadcn Components Needed
| Component | Purpose | Installation |
|-----------|---------|-------------|
| Tabs | Buyer profile tabbed content (Contracts, Contacts, Signals, Attributes) | `npx shadcn@latest add tabs` |
| Popover | Credit balance transaction history dropdown | `npx shadcn@latest add popover` |

### No New Dependencies Required
The animated credit counter can be implemented with pure CSS/Tailwind transitions (no need for framer-motion or number-flow library). A simple approach using CSS `transition` on a `tabular-nums` span with `requestAnimationFrame` or `setInterval` for the 10->9 tick-down effect is sufficient for the demo.

**Installation:**
```bash
npx shadcn@latest add tabs popover
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(dashboard)/
    buyers/
      page.tsx                    # Buyers list table page
      [id]/
        page.tsx                  # Buyer profile detail page (tabbed)
  app/api/
    buyers/
      route.ts                   # GET: list buyers (existing, enhance with sort/filter)
      [id]/
        route.ts                 # GET: single buyer profile with contracts & signals
        reveal/
          route.ts               # POST: reveal contacts (atomic credit deduction)
    credits/
      route.ts                   # GET: credit balance
      history/
        route.ts                 # GET: transaction history
  models/
    buyer.ts                     # Existing (no schema changes needed)
    credit.ts                    # Existing (no schema changes needed)
    contact-reveal.ts            # NEW: per-user buyer unlock tracking
  lib/
    buyers.ts                    # Server-side buyer data fetching
    credits.ts                   # Server-side credit operations
  components/
    buyers/
      buyer-header.tsx           # Header card with logo, name, metadata
      buyer-tabs.tsx             # Tabbed content wrapper
      contracts-tab.tsx          # Contracts tab content
      contacts-tab.tsx           # Contacts tab with lock/unlock
      contact-card.tsx           # Individual contact card (locked/unlocked)
      signals-tab.tsx            # Buying signals tab
      attributes-tab.tsx         # Buyer attributes scored card grid
      buyer-table.tsx            # Data table for buyers list page
      unlock-button.tsx          # "Unlock Contacts" CTA with credit check
    credits/
      credit-balance.tsx         # Sidebar credit balance display
      credit-counter.tsx         # Animated counter component
      transaction-history.tsx    # Popover with recent transactions
  stores/
    credit-store.ts              # Zustand store for credit balance state
```

### Pattern 1: Per-User Buyer Unlock Tracking (ContactReveal Model)
**What:** A new model to track which users have unlocked which buyers
**When to use:** Always -- the current Buyer.contacts[].isRevealed is global and cannot support multi-user state
**Example:**
```typescript
// Source: Derived from codebase analysis
// models/contact-reveal.ts
const contactRevealSchema = new Schema({
  userId: { type: String, required: true, index: true },   // Clerk user ID
  buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
  revealedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound unique index: one reveal per user per buyer
contactRevealSchema.index({ userId: 1, buyerId: 1 }, { unique: true });
```

**Rationale:** The decision says "1 credit reveals ALL contacts for that organization." This means the unlock granularity is buyer-level, not contact-level. A separate ContactReveal document per userId+buyerId pair is the cleanest approach because:
- It doesn't pollute the Buyer model with per-user state
- It supports the CreditTransaction.contactId reference (store the buyerId or the revealId)
- Querying "which buyers has this user unlocked?" is a simple `ContactReveal.find({ userId })`
- Querying "is this buyer unlocked for this user?" is `ContactReveal.findOne({ userId, buyerId })`

### Pattern 2: Atomic Credit Deduction (findOneAndUpdate with filter)
**What:** Single atomic MongoDB operation that deducts 1 credit only if balance >= 1
**When to use:** Every credit spend operation (contact reveal)
**Example:**
```typescript
// Source: MongoDB docs on atomic operations + Mongoose 9 findOneAndUpdate
// POST /api/buyers/[id]/reveal
const account = await CreditAccount.findOneAndUpdate(
  { userId, balance: { $gte: 1 } },           // Only match if sufficient balance
  { $inc: { balance: -1, totalSpent: 1 } },    // Atomic decrement
  { new: true }                                 // Return updated document
);

if (!account) {
  // Either user not found or insufficient balance
  return Response.json({ error: "Insufficient credits" }, { status: 402 });
}

// Credit deducted -- now create reveal record and transaction
await Promise.all([
  ContactReveal.create({ userId, buyerId }),
  CreditTransaction.create({
    userId,
    type: "CONTACT_REVEAL",
    amount: -1,
    description: `Unlocked contacts for ${buyerName}`,
    contactId: buyerId.toString(),
    balanceAfter: account.balance,
  }),
]);
```

**Why this pattern is critical:** The `{ balance: { $gte: 1 } }` filter combined with `{ $inc: { balance: -1 } }` is atomic at the document level in MongoDB. If two requests hit simultaneously, only one will succeed because findOneAndUpdate is atomic -- the second request will find `balance: 0` which fails the `$gte: 1` filter and returns `null`. This prevents double-spend without needing transactions or application-level locks.

### Pattern 3: CSS Blur-to-Reveal Animation
**What:** Tailwind CSS blur filter with transition for contact reveal
**When to use:** Contact email/phone fields in locked state
**Example:**
```tsx
// Source: Tailwind CSS v4 docs - filter blur utilities
// Locked state: blur-sm (8px blur), revealed: blur-none (0px)
// Transition: 300ms ease-out

interface ContactFieldProps {
  value: string;
  isRevealed: boolean;
}

function BlurredField({ value, isRevealed }: ContactFieldProps) {
  return (
    <span
      className={cn(
        "transition-[filter] duration-300 ease-out select-none",
        isRevealed ? "blur-none" : "blur-sm"
      )}
      aria-hidden={!isRevealed}
    >
      {value}
    </span>
  );
}
```

**Key details:**
- Use `blur-sm` (8px) for the locked state -- enough to obscure text but let users see that real data exists behind it
- `transition-[filter]` in Tailwind CSS 4 targets the CSS `filter` property specifically
- `duration-300` gives the ~300ms dissolve timing per the locked decision
- `ease-out` for snappy feel (starts fast, decelerates)
- `select-none` prevents users from selecting blurred text to read it
- `aria-hidden={!isRevealed}` for accessibility

### Pattern 4: Breadcrumb Navigation for Detail Pages
**What:** Use existing BreadcrumbProvider context for "Buyers > [Org Name]" navigation
**When to use:** Buyer profile detail page
**Example:**
```tsx
// Source: Existing pattern from src/app/(dashboard)/scanners/[id]/page.tsx
const { setBreadcrumb } = useBreadcrumb();
useEffect(() => {
  setBreadcrumb(
    <nav className="flex items-center gap-1.5 text-sm">
      <Link href="/buyers" className="text-muted-foreground hover:text-foreground">
        Buyers
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium">{buyerName}</span>
    </nav>
  );
  return () => setBreadcrumb(null);
}, [buyerName, setBreadcrumb]);
```

### Pattern 5: Sidebar Credit Balance with Animated Counter
**What:** Always-visible credit balance in SidebarFooter with animated counter on deduction
**When to use:** Global layout -- displayed on every authenticated page
**Example:**
```tsx
// Source: Existing SidebarFooter placeholder in app-sidebar.tsx
// The SidebarFooter already has a comment: "Credit balance will be added here in Phase 6"

function CreditBalance() {
  const { balance, isAnimating } = useCreditStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent w-full text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Credits</span>
          <span className={cn(
            "ml-auto font-mono tabular-nums font-medium",
            isAnimating && "text-red-500 transition-colors duration-300"
          )}>
            {balance}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72">
        {/* Transaction history */}
      </PopoverContent>
    </Popover>
  );
}
```

### Anti-Patterns to Avoid
- **Global isRevealed on Buyer contacts:** The existing `isRevealed` field on the contact subdocument is a global flag. Do NOT use it for per-user unlock state. Use the ContactReveal model instead. The `isRevealed` field could be repurposed or ignored -- it should NOT be set when a specific user unlocks contacts.
- **Two-step credit check (read then write):** Never `findOne()` to check balance, then separately `findOneAndUpdate()` to deduct. This creates a race condition. Always use a single `findOneAndUpdate({ balance: { $gte: 1 } }, { $inc: { balance: -1 } })`.
- **Client-side credit validation only:** Always validate server-side. The client can optimistically update UI but the server MUST be the source of truth.
- **Framer-motion for simple animations:** The project decision from Phase 9 explicitly says "No framer-motion -- tw-animate-css utility classes and Tailwind animate-pulse only." Stick with CSS transitions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab navigation | Custom tab state management | shadcn Tabs (Radix Tabs) | Accessible, keyboard nav, ARIA roles built-in |
| Popover positioning | Manual absolute/fixed positioning | shadcn Popover (Radix Popover) | Handles edge detection, portals, focus management |
| Copy to clipboard | Custom clipboard API wrapper | `navigator.clipboard.writeText()` | Native API, well-supported, no library needed |
| Data table sorting | Custom sort implementation | URL search params + server-side sort | Existing pattern from contracts page |
| Blur animation | CSS animation library | Tailwind `blur-sm` + `transition-[filter]` | Native CSS, no JS runtime cost |
| Animated counter | react-animated-counter library | CSS transitions + tabular-nums + requestAnimationFrame | Tiny scope -- single digit change 10->9, not worth a dependency |

**Key insight:** This phase is UI-heavy but technically straightforward. The only novel engineering challenge is the atomic credit deduction + per-user reveal tracking, which is solved by MongoDB's atomic findOneAndUpdate. Everything else uses existing patterns from the codebase.

## Common Pitfalls

### Pitfall 1: Per-Contact vs Per-Buyer Unlock Semantics
**What goes wrong:** The existing Buyer model has `isRevealed` per contact subdocument, but the decision says "1 credit reveals ALL contacts for that organization." Using per-contact isRevealed would require updating every contact subdocument when unlocking.
**Why it happens:** Schema was designed before the per-buyer pricing decision was made.
**How to avoid:** Use a separate ContactReveal model for per-user unlock state. When rendering contacts, check if a ContactReveal record exists for (userId, buyerId) rather than checking individual contact.isRevealed flags.
**Warning signs:** If the plan includes updating individual contact documents when unlocking, it's doing it wrong.

### Pitfall 2: Double-Spend on Rapid Clicks (CRED-04)
**What goes wrong:** User double-clicks "Unlock Contacts" and gets charged 2 credits.
**Why it happens:** Two concurrent API requests both read balance=10, both deduct, both succeed.
**How to avoid:** (1) Server-side: Use single atomic `findOneAndUpdate({ balance: { $gte: 1 } }, { $inc: { balance: -1 } })`. (2) Client-side: Disable button immediately on click, set loading state. (3) Server-side: Check if ContactReveal already exists before deducting (idempotency).
**Warning signs:** Separate find() and update() calls for credit balance.

### Pitfall 3: Credit Balance Stale State
**What goes wrong:** User unlocks contacts on buyer profile page, then navigates to another buyer -- sidebar still shows old balance.
**Why it happens:** Credit balance fetched once on page load, not updated after reveal.
**How to avoid:** Use Zustand credit store. The reveal API response should return the new balance. The store updates immediately (optimistic update) and the sidebar re-renders via store subscription.
**Warning signs:** Server-rendered credit balance without client-side reactivity.

### Pitfall 4: Buyer Logo Missing in Header
**What goes wrong:** Most seeded buyers won't have logo URLs. Buyer header shows broken image.
**Why it happens:** Seed data may not include `website` field or logo extraction.
**How to avoid:** Use initials-based avatar as fallback (first letter of org name in a colored circle). Same pattern as entity-name renderer in the scanner grid.
**Warning signs:** `<img src={buyer.logo}>` without onError fallback or conditional rendering.

### Pitfall 5: Contracts Tab Requires buyerName Join
**What goes wrong:** Buyer profile's "Contracts" tab needs to show contracts for this buyer, but the Contract model doesn't have a buyerId field -- it only has buyerName (string).
**Why it happens:** The data pipeline stores buyerName as a string on contracts, not a foreign key reference.
**How to avoid:** Query contracts by `buyerName` (case-insensitive regex or exact match). The Buyer model's `name` field should match the Contract model's `buyerName`.
**Warning signs:** Trying to join on a non-existent buyerId field in the Contract model.

### Pitfall 6: Signals Tab Requires organizationName Join
**What goes wrong:** Similar to contracts -- signals reference buyers by `organizationName` string, not by ObjectId.
**Why it happens:** Signal model has `organizationName` (string) and `buyerId` (ObjectId ref), but the buyerId may not be populated in seed data.
**How to avoid:** Query signals by `organizationName` matching the buyer's `name`, or by `buyerId` if populated. Use `$or` to cover both cases.
**Warning signs:** Empty signals tab when data should exist.

### Pitfall 7: Next.js 16 Async Params
**What goes wrong:** `params` in dynamic route pages must be awaited in Next.js 16.
**Why it happens:** Next.js 16 changed params to be a Promise.
**How to avoid:** Use `const { id } = await params;` in server components or `const { id } = use(params);` in client components. Already established pattern in the codebase.
**Warning signs:** TypeScript error on `params.id` without awaiting.

## Code Examples

### Atomic Credit Deduction + Contact Reveal (Full API Route)
```typescript
// Source: MongoDB atomic operations docs + existing codebase patterns
// POST /api/buyers/[id]/reveal
import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";
import { CreditAccount, CreditTransaction } from "@/models/credit";
import ContactReveal from "@/models/contact-reveal";
import Buyer from "@/models/buyer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: buyerId } = await params;
  if (!mongoose.isValidObjectId(buyerId)) {
    return Response.json({ error: "Invalid buyer ID" }, { status: 400 });
  }

  await dbConnect();

  // Check if already revealed (idempotent)
  const existing = await ContactReveal.findOne({ userId, buyerId });
  if (existing) {
    const account = await CreditAccount.findOne({ userId });
    return Response.json({
      revealed: true,
      balance: account?.balance ?? 0,
      message: "Already unlocked",
    });
  }

  // Atomic credit deduction: only succeeds if balance >= 1
  const account = await CreditAccount.findOneAndUpdate(
    { userId, balance: { $gte: 1 } },
    { $inc: { balance: -1, totalSpent: 1 } },
    { new: true }
  );

  if (!account) {
    return Response.json({ error: "Insufficient credits" }, { status: 402 });
  }

  // Fetch buyer name for transaction description
  const buyer = await Buyer.findById(buyerId).select("name").lean();

  // Create reveal record + transaction in parallel
  await Promise.all([
    ContactReveal.create({ userId, buyerId }),
    CreditTransaction.create({
      userId,
      type: "CONTACT_REVEAL",
      amount: -1,
      description: `Unlocked contacts for ${buyer?.name ?? "Unknown"}`,
      contactId: buyerId,
      balanceAfter: account.balance,
    }),
  ]);

  return Response.json({
    revealed: true,
    balance: account.balance,
  });
}
```

### Buyer Profile Data Fetching
```typescript
// Source: Existing lib/contracts.ts pattern
// lib/buyers.ts
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";
import Buyer from "@/models/buyer";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import ContactReveal from "@/models/contact-reveal";

export async function fetchBuyerById(buyerId: string, userId: string) {
  await dbConnect();
  if (!mongoose.isValidObjectId(buyerId)) return null;

  const buyer = await Buyer.findById(buyerId).lean();
  if (!buyer) return null;

  // Parallel fetch: contracts, signals, reveal status
  const [contracts, signals, reveal] = await Promise.all([
    Contract.find({ buyerName: buyer.name })
      .sort({ publishedDate: -1 })
      .limit(20)
      .select("-rawData")
      .lean(),
    Signal.find({ organizationName: buyer.name })
      .sort({ sourceDate: -1 })
      .lean(),
    ContactReveal.findOne({ userId, buyerId }),
  ]);

  return {
    ...buyer,
    contracts,
    signals,
    isUnlocked: !!reveal,
  };
}
```

### Buyers List Table with Unlock Status
```typescript
// Source: Existing contracts page pattern
// lib/buyers.ts
export interface BuyerFilters {
  sort?: "name" | "contracts" | "sector" | "region";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchBuyers(userId: string, filters: BuyerFilters) {
  await dbConnect();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  const sortField = filters.sort ?? "name";
  const sortDir = filters.order === "desc" ? -1 : 1;
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    name: { name: sortDir as 1 | -1 },
    contracts: { contractCount: sortDir as 1 | -1 },
    sector: { sector: sortDir as 1 | -1 },
    region: { region: sortDir as 1 | -1 },
  };

  const [buyers, total, reveals] = await Promise.all([
    Buyer.find({})
      .sort(sortMap[sortField] ?? { name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("name sector region contractCount website contacts")
      .lean(),
    Buyer.estimatedDocumentCount(),
    ContactReveal.find({ userId }).select("buyerId").lean(),
  ]);

  const revealedBuyerIds = new Set(reveals.map(r => r.buyerId.toString()));

  const buyersWithStatus = buyers.map(b => ({
    _id: String(b._id),
    name: b.name,
    sector: b.sector,
    region: b.region,
    contractCount: b.contractCount,
    contactCount: Array.isArray(b.contacts) ? b.contacts.length : 0,
    isUnlocked: revealedBuyerIds.has(String(b._id)),
  }));

  return { buyers: buyersWithStatus, total };
}
```

### Zustand Credit Store
```typescript
// Source: Existing scanner-store.ts pattern
// stores/credit-store.ts
import { create } from "zustand";

interface CreditStore {
  balance: number;
  isLoaded: boolean;
  isAnimating: boolean;
  setBalance: (balance: number) => void;
  deductCredit: () => void;
  setIsAnimating: (animating: boolean) => void;
}

export const useCreditStore = create<CreditStore>((set) => ({
  balance: 0,
  isLoaded: false,
  isAnimating: false,
  setBalance: (balance) => set({ balance, isLoaded: true }),
  deductCredit: () =>
    set((state) => ({
      balance: Math.max(0, state.balance - 1),
      isAnimating: true,
    })),
  setIsAnimating: (isAnimating) => set({ isAnimating }),
}));
```

### Contact Card with Blur Effect
```tsx
// Source: Tailwind CSS blur utilities + codebase patterns
function ContactCard({
  contact,
  isUnlocked,
}: {
  contact: { name: string; title: string; email: string; linkedIn: string };
  isUnlocked: boolean;
}) {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // toast notification
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Name always visible */}
      <h4 className="font-semibold">{contact.name}</h4>

      <div className="flex items-center gap-4 text-sm">
        {/* Job title always visible */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>{contact.title}</span>
        </div>

        {/* Email - blurred when locked */}
        <div className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn(
            "transition-[filter] duration-300 ease-out",
            !isUnlocked && "blur-sm select-none pointer-events-none"
          )}>
            {contact.email}
          </span>
          {isUnlocked && (
            <button
              onClick={() => copyToClipboard(contact.email)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Buyer Attributes Tab - Discretion Recommendations

Since the exact contents of the Buyer Attributes tab are Claude's discretion, here are recommended categories adapted from the Starbridge reference to UK procurement context:

### Factual Stats (from data)
| Attribute | Source | Display |
|-----------|--------|---------|
| Contract Count | `buyer.contractCount` | Numeric |
| Average Contract Value | Computed from contracts | Currency (GBP) |
| Active Contracts | Count where status=OPEN | Numeric |
| Sectors | Distinct sectors from contracts | Count |

### AI-Generated Scores (from vibeScore context)
| Attribute | Description | Score Range |
|-----------|-------------|-------------|
| SME Friendliness | How often org awards to SMEs | 0-100 |
| Procurement Complexity | Difficulty of bid process | 0-100 |
| Innovation Appetite | Willingness to try new suppliers | 0-100 |
| Repeat Business | Tendency to renew with existing suppliers | 0-100 |
| Response Speed | How quickly procurement decisions are made | 0-100 |
| Digital Maturity | Adoption of digital procurement tools | 0-100 |

**Implementation note:** For the hackathon demo, these AI scores can be generated deterministically from the buyer's seed data (hash of orgId + attribute name mapped to a score range). Building actual AI scoring for buyer attributes is out of scope for this phase -- the Vibe Scanner already handles AI scoring for contracts and buyers.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate find+update for credits | Atomic findOneAndUpdate with $gte filter | N/A (MongoDB pattern) | Prevents double-spend race conditions |
| Global isRevealed per contact | Per-user ContactReveal model | This phase | Supports multi-user unlock state |
| framer-motion for animations | Tailwind CSS transitions only | Phase 9 decision | No animation library dependency |
| Server-rendered credit balance | Zustand store + client hydration | This phase | Real-time balance updates across pages |

**Deprecated/outdated:**
- Buyer.contacts[].isRevealed: This global flag should be ignored in favor of the ContactReveal model. It could be removed in a future cleanup, but changing the existing schema during this phase is unnecessary.

## Data Model Analysis

### Existing Models (No Changes Needed)
| Model | Fields Used | Notes |
|-------|-------------|-------|
| Buyer | name, orgId, sector, region, website, description, contractCount, contacts[], vibeScore, vibeReasoning | All fields used. contacts[] has name, title, email, linkedIn |
| CreditAccount | userId, balance, totalEarned, totalSpent | Perfect for atomic $inc operations |
| CreditTransaction | userId, type, amount, description, contactId, balanceAfter | contactId will store buyerId as string |
| Contract | buyerName, title, valueMin, valueMax, publishedDate, sector, status | Join to buyer via buyerName string match |
| Signal | organizationName, signalType, title, insight, source, sourceDate | Join to buyer via organizationName string match |

### New Model Required
| Model | Fields | Purpose |
|-------|--------|---------|
| ContactReveal | userId (String, indexed), buyerId (ObjectId, ref Buyer), revealedAt (Date) | Per-user buyer unlock tracking. Compound unique index on {userId, buyerId} |

### Seed Data Available
- 75 buyer organizations with 192 contacts (2-4 contacts each)
- 75 board minutes signals across 6 types
- Contracts ingested from FaT + Contracts Finder (join via buyerName)

## Route Structure

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/buyers` | GET (page) | Buyers list table | Yes |
| `/buyers/[id]` | GET (page) | Buyer profile detail | Yes |
| `/api/buyers` | GET | List buyers with sort/pagination + unlock status | Yes |
| `/api/buyers/[id]` | GET | Single buyer with contracts, signals, unlock status | Yes |
| `/api/buyers/[id]/reveal` | POST | Atomic credit deduction + unlock | Yes |
| `/api/credits` | GET | Current credit balance | Yes |
| `/api/credits/history` | GET | Transaction history (paginated) | Yes |

## Open Questions

1. **Buyer Attributes AI Scores**
   - What we know: Decision says "3-column grid of scored cards -- mix of factual stats AND AI-generated scores"
   - What's unclear: Whether to compute AI scores on-the-fly or pre-generate them during seeding
   - Recommendation: Pre-generate deterministic scores from seed data for hackathon demo. Add a `buyerAttributes` field to the Buyer model as a subdocument array, or compute client-side from existing data. Keep it simple -- no API call to Claude for buyer attributes.

2. **Buyer Logo Source**
   - What we know: Header card should show org logo, but seed buyers may not have logo URLs
   - What's unclear: Whether to add a `logoUrl` field to the Buyer model
   - Recommendation: Use initials-based avatar (colored circle with first letter) as the default. If the buyer has a website, could attempt to fetch favicon, but this adds complexity. For hackathon, initials are sufficient and clean.

3. **Phone Numbers in Contacts**
   - What we know: Decision says "phone (phone icon)" but the contact schema has: name, title, email, linkedIn -- no phone field
   - What's unclear: Whether to add a phone field to the contact subdocument
   - Recommendation: The contact schema currently lacks a `phone` field. Either: (a) add it to the schema and seed data, or (b) display linkedIn URL as the third field instead of phone. Adding phone to the schema is simple and aligns with the Starbridge reference. Recommend option (a).

## Sources

### Primary (HIGH confidence)
- Mongoose 9.x docs on findOneAndUpdate atomicity: verified via Context7 `/automattic/mongoose/9.0.1`
- shadcn/ui Tabs and Popover component APIs: verified via Context7 `/websites/ui_shadcn`
- Tailwind CSS v4 blur filter utilities: verified via official docs at tailwindcss.com
- MongoDB atomic operations: verified via official MongoDB docs

### Secondary (MEDIUM confidence)
- MongoDB `{ balance: { $gte: 1 } }` + `{ $inc: { balance: -1 } }` pattern for atomic deduction: verified across multiple sources (MongoDB docs, Mongoose issues, community articles)
- CSS `transition-[filter]` for blur animation: verified via Tailwind CSS docs

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use, only Tabs/Popover to add via shadcn CLI
- Architecture: HIGH -- patterns derived from existing codebase analysis (scanner store, breadcrumb context, contract detail pages)
- Data model: HIGH -- analyzed all 5 existing models, identified need for ContactReveal model with clear rationale
- Pitfalls: HIGH -- derived from actual schema analysis (isRevealed global flag, missing buyerId foreign key, missing phone field)
- Credit atomicity: HIGH -- MongoDB findOneAndUpdate atomicity verified in official docs

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable -- no fast-moving dependencies)
