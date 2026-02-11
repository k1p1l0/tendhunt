# Phase 4: Contract Dashboard - Research

**Researched:** 2026-02-11
**Domain:** Next.js App Router server-side data fetching, MongoDB text search, URL-based filter state, shadcn/ui card-based dashboard UI
**Confidence:** HIGH

## Summary

Phase 4 builds the core product experience: a searchable, filterable feed of UK procurement contracts. The database already contains 809 real contracts (509 Find a Tender, 300 Contracts Finder) across 41 sectors and 112 regions, with a text index on `title` + `description` already in place. The existing Next.js 16 App Router codebase has placeholder pages at `/contracts` and `/dashboard` plus 14 shadcn/ui components pre-installed.

The architecture follows Next.js's official search/filter/pagination pattern: URL search params as the single source of truth, server components read `searchParams` (which is a `Promise` in Next.js 16) to query MongoDB directly, and client components use `useSearchParams` + `useRouter().replace()` with debounced input to update the URL. No additional state management library is needed -- the URL IS the state. This avoids nuqs dependency while following the exact pattern from Next.js official documentation.

For the contract feed, a card-based layout (not a data table) is the right UX since contract cards need rich visual hierarchy: title, buyer, value badge, date, source tag, and AI score badge. TanStack Table is overkill for card feeds. The contract detail page uses a dynamic route `[id]` with `params` as a `Promise`. MongoDB's `$text` search operator uses the existing text index for keyword search, while filters (sector, region, value range) use standard query operators combined with `$and`.

**Primary recommendation:** Use URL-based state with the native Next.js searchParams pattern (no extra libraries), MongoDB `$text` + filter queries with `countDocuments`, server-side pagination with `skip/limit`, and shadcn/ui card components with custom score badges.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 16.1.6 | Server components, `searchParams`, dynamic routes | Already installed. `searchParams` is a Promise in v16 |
| Mongoose | 9.2.0 | MongoDB queries, `$text` search, `countDocuments` | Already installed. Text index exists on contracts |
| shadcn/ui | 3.8.4 CLI | Card, Badge, Input, Select, Button, Skeleton | Already installed (14 components). Add Select if missing for filters |
| Tailwind CSS | 4.x | Styling, responsive grid | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | ^10.0.0 | Debounce search input (300ms) | Client search component to avoid spamming DB |
| lucide-react | 0.563.0 | Icons for cards, filters, search | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native searchParams | nuqs | nuqs adds 6kB, type-safe parsers, but native pattern is simpler for this scope and avoids a dependency. Revisit if filter complexity grows |
| Card feed layout | TanStack Table | TanStack Table is for tabular data with sorting/resizing. Contract cards need rich visual hierarchy -- cards are better UX |
| MongoDB $text | MongoDB Atlas Search ($search) | Atlas Search is more powerful (fuzzy, facets, autocomplete) but requires Atlas M10+ tier ($57/mo). $text on free tier is sufficient for 809 contracts |
| Server-side pagination | Infinite scroll | Infinite scroll needs client-side state management and IntersectionObserver. Server pagination with URL page param is simpler, bookmarkable, and SEO-friendly |

**Installation:**
```bash
npm install use-debounce
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/
│   ├── contracts/
│   │   ├── page.tsx              # Contract feed (server component, reads searchParams)
│   │   └── [id]/
│   │       └── page.tsx          # Contract detail (server component, reads params)
│   └── dashboard/
│       └── page.tsx              # Dashboard overview (update with real stats + recent contracts)
├── components/
│   ├── contracts/
│   │   ├── contract-card.tsx     # Single contract card (server component)
│   │   ├── contract-filters.tsx  # Filter sidebar/bar (client component -- uses URL state)
│   │   ├── contract-search.tsx   # Search input with debounce (client component)
│   │   ├── contract-feed.tsx     # Feed wrapper with loading states
│   │   ├── contract-count.tsx    # Total/filtered count display
│   │   └── pagination.tsx        # Page navigation (client component)
│   └── ui/                       # Existing shadcn/ui components
├── lib/
│   ├── contracts.ts              # Data access layer: fetchContracts(), fetchContractById(), getContractStats()
│   └── mongodb.ts                # Existing DB connection
└── types/
    └── index.ts                  # Add ContractFilters type
```

### Pattern 1: URL Search Params as Single Source of Truth
**What:** All filter/search/pagination state lives in the URL. Server components read `searchParams` directly, client components update via `useRouter().replace()`.
**When to use:** Any page with search, filters, or pagination.
**Example:**
```typescript
// Source: Next.js 16 official docs (verified via Context7 /vercel/next.js/v16.1.5)
// Server component page -- searchParams is a Promise in Next.js 16
export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { query = '', sector = '', region = '', minValue = '', maxValue = '', page = '1' } = await searchParams;

  const currentPage = Number(page) || 1;
  const { contracts, totalCount, filteredCount } = await fetchContracts({
    query: query as string,
    sector: sector as string,
    region: region as string,
    minValue: minValue ? Number(minValue) : undefined,
    maxValue: maxValue ? Number(maxValue) : undefined,
    page: currentPage,
    pageSize: 20,
  });

  return (
    <div>
      <ContractSearch />
      <ContractFilters />
      <ContractCount total={totalCount} filtered={filteredCount} />
      <Suspense key={JSON.stringify({ query, sector, region, page })} fallback={<ContractFeedSkeleton />}>
        <ContractFeed contracts={contracts} />
      </Suspense>
      <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredCount / 20)} />
    </div>
  );
}
```

### Pattern 2: Client Component URL Update with Debounce
**What:** Client components update URL params using `useRouter().replace()` with debounced callbacks.
**When to use:** Search input, filter dropdowns, any user interaction that should update the feed.
**Example:**
```typescript
// Source: Next.js official tutorial (https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export function ContractSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on new search
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <Input
      placeholder="Search contracts..."
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get('query')?.toString()}
    />
  );
}
```

### Pattern 3: MongoDB Data Access Layer
**What:** Centralized data fetching functions in `lib/contracts.ts` that build MongoDB queries from filter params.
**When to use:** Any server component or API route that needs contract data.
**Example:**
```typescript
// Source: Mongoose docs (verified via Context7 /websites/mongoosejs)
import { dbConnect } from '@/lib/mongodb';
import Contract from '@/models/contract';

interface ContractFilters {
  query?: string;
  sector?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  page?: number;
  pageSize?: number;
}

export async function fetchContracts(filters: ContractFilters) {
  await dbConnect();

  const query: Record<string, unknown> = {};

  // Text search (uses existing text index on title + description)
  if (filters.query) {
    query.$text = { $search: filters.query };
  }

  // Sector filter
  if (filters.sector) {
    query.sector = filters.sector;
  }

  // Region filter (prefix match for NUTS codes: "UKM" matches "UKM75", "UKM82", etc.)
  if (filters.region) {
    query.buyerRegion = { $regex: `^${filters.region}`, $options: 'i' };
  }

  // Value range filter
  if (filters.minValue !== undefined) {
    query.valueMax = { ...((query.valueMax as object) || {}), $gte: filters.minValue };
  }
  if (filters.maxValue !== undefined) {
    query.valueMin = { ...((query.valueMin as object) || {}), $lte: filters.maxValue };
  }

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const [contracts, filteredCount, totalCount] = await Promise.all([
    Contract.find(query)
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('-rawData')
      .lean(),
    Contract.countDocuments(query),
    Contract.estimatedDocumentCount(),
  ]);

  return { contracts, filteredCount, totalCount };
}
```

### Pattern 4: Dynamic Route for Contract Detail
**What:** `[id]` dynamic route with `params` as a Promise (Next.js 16 requirement).
**When to use:** Contract detail page.
**Example:**
```typescript
// Source: Next.js 16 docs (verified via Context7 /vercel/next.js/v16.1.5)
// app/(dashboard)/contracts/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const contract = await fetchContractById(id);

  if (!contract) {
    notFound();
  }

  return <ContractDetail contract={contract} />;
}
```

### Anti-Patterns to Avoid
- **Client-side data fetching with useEffect:** Server components can query MongoDB directly. No need for API routes + fetch + loading states when the page is a server component.
- **Storing filter state in useState:** URL params are the source of truth. Using useState creates desync between URL and displayed filters, breaks back/forward navigation, and makes URLs non-shareable.
- **Using $regex for full-text search:** The `$text` operator with the existing text index is dramatically faster than regex for keyword search across title and description fields.
- **Loading all 809 contracts client-side:** Server-side pagination with skip/limit keeps page loads fast and memory usage low.
- **Combining $text with $sort on other fields:** MongoDB requires `$text` queries to sort by `{ score: { $meta: "textScore" } }` by default. If you want to sort by `publishedDate` instead, the text score is still computed but the explicit sort overrides it. This is valid and works.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search debouncing | Custom setTimeout/clearTimeout | `use-debounce` useDebouncedCallback | Race conditions, cleanup on unmount, proper TypeScript types |
| URL query string building | Manual string concatenation | `URLSearchParams` API (built-in) | Handles encoding, multiple values, deletion correctly |
| Pagination math | Custom page calculation | `Math.ceil(total / pageSize)` + `skip = (page - 1) * pageSize` | Standard pattern, no edge cases to miss |
| Loading skeletons | Custom shimmer CSS | shadcn/ui `Skeleton` component | Already installed, accessible, consistent with design system |
| Value formatting (currency) | Template literals | `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })` | Handles locale, thousands separators, symbol placement |
| Date formatting | Manual date string building | `Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })` | Locale-aware, handles timezone, consistent format |

**Key insight:** This phase is primarily a data display + filtering exercise. The hard parts (data ingestion, schema, indexes) are already done in Phase 2. The risk is over-engineering the UI (adding TanStack Table, complex state management) when simple server components + URL state + cards is the right-sized solution.

## Common Pitfalls

### Pitfall 1: Forgetting searchParams is a Promise in Next.js 16
**What goes wrong:** Accessing `searchParams.query` directly without `await` returns a Promise object, not the value. The page renders with `[object Promise]` or silently fails.
**Why it happens:** Next.js 16 changed `searchParams` and `params` to be Promises (breaking change from v15).
**How to avoid:** Always `await searchParams` and `await params` before destructuring. The type signature is `Promise<{ [key: string]: string | string[] | undefined }>`.
**Warning signs:** Filters don't work, page always shows unfiltered data, TypeScript errors about Promise.

### Pitfall 2: MongoDB $text + $sort conflict
**What goes wrong:** Using `$text` search and sorting by `publishedDate` simultaneously may cause unexpected result ordering, or developers add unnecessary `{ score: { $meta: "textScore" } }` projections.
**Why it happens:** By default, `$text` queries sort by text relevance score. Adding an explicit `.sort({ publishedDate: -1 })` overrides this, which is the desired behavior for a chronological feed.
**How to avoid:** When `query` param is present, use `$text` for filtering but still sort by `publishedDate`. Only sort by text score if you want relevance-ranked search results (consider making this a toggle).
**Warning signs:** Search results appear in random order, or score field appears unexpectedly.

### Pitfall 3: Region codes are NUTS codes, not human-readable
**What goes wrong:** The region filter dropdown shows raw codes like "UKM75", "UKI", "UKG13" which are meaningless to users.
**Why it happens:** Data from Find a Tender and Contracts Finder uses NUTS (Nomenclature of Territorial Units for Statistics) region codes.
**How to avoid:** Create a static NUTS code to human-readable name mapping (e.g., "UKM" = "Scotland", "UKI" = "London", "UKG" = "West Midlands"). Filter at the top level (UKM, UKI, UKG, etc.) to keep the dropdown manageable. There are 112 distinct region codes in the DB but only ~12 top-level NUTS1 regions.
**Warning signs:** Users don't understand which region to select.

### Pitfall 4: Value range filter spans 7 orders of magnitude
**What goes wrong:** A simple min/max slider from 1 to 1,800,000,000 is unusable because most contracts cluster at lower values.
**Why it happens:** Contract values range from 1 GBP to 1.8B GBP (avg ~26M). The distribution is heavily skewed.
**How to avoid:** Use predefined value ranges as select options rather than a continuous slider: "Under 100K", "100K-500K", "500K-1M", "1M-10M", "10M-100M", "Over 100M". This is how procurement platforms (Tussell, Stotles) handle this.
**Warning signs:** Slider is impossible to use, all contracts appear at one end.

### Pitfall 5: No loading states between filter changes
**What goes wrong:** User changes a filter, the URL updates, but the old data remains visible for 200-500ms until the server re-renders. Feels broken.
**Why it happens:** Server components re-render on URL change, but there's no visual feedback during the transition.
**How to avoid:** Use `React.Suspense` with a `key` prop derived from the search params. When params change, the key changes, triggering the fallback skeleton. Also consider using `useTransition` in the filter components to show a pending state.
**Warning signs:** UI feels sluggish, users click filters multiple times thinking nothing happened.

### Pitfall 6: 303 contracts have null buyerRegion
**What goes wrong:** Region filter misses 303 contracts (37% of total) because they have null buyerRegion.
**Why it happens:** Many Contracts Finder entries don't include NUTS region codes.
**How to avoid:** Include a "Nationwide / Unspecified" option in the region filter that matches `{ buyerRegion: null }` or `{ buyerRegion: { $exists: false } }`. When no region filter is selected, show all contracts including those without regions.
**Warning signs:** Filtered count never adds up to total count.

## Code Examples

Verified patterns from official sources:

### MongoDB $text Search with Filters
```typescript
// Source: Mongoose docs (Context7 /websites/mongoosejs)
// Combine text search with additional filters
const results = await Contract.find({
  $text: { $search: "waste management" },
  sector: "Environmental Services",
  buyerRegion: { $regex: /^UKM/i },
  valueMax: { $gte: 100000 },
})
  .sort({ publishedDate: -1 })
  .skip(0)
  .limit(20)
  .select('-rawData')
  .lean();
```

### Contract Card Component Pattern
```typescript
// Server component -- no 'use client' needed
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ContractCardProps {
  contract: {
    _id: string;
    title: string;
    buyerName: string;
    valueMax?: number;
    publishedDate?: Date;
    deadlineDate?: Date;
    sector?: string;
    source: string;
    vibeScore?: number;
  };
}

export function ContractCard({ contract }: ContractCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(date));

  // DASH-06: Score badge color coding
  const scoreColor = contract.vibeScore
    ? contract.vibeScore >= 7 ? 'bg-green-100 text-green-800'
    : contract.vibeScore >= 4 ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'
    : null;

  return (
    <Link href={`/contracts/${contract._id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{contract.title}</CardTitle>
            {scoreColor && contract.vibeScore && (
              <Badge className={scoreColor}>{contract.vibeScore.toFixed(1)}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{contract.buyerName}</span>
            {contract.valueMax && <span>{formatCurrency(contract.valueMax)}</span>}
            {contract.sector && <Badge variant="outline">{contract.sector}</Badge>}
            <Badge variant="secondary">{contract.source === 'FIND_A_TENDER' ? 'FaT' : 'CF'}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Filter Component with URL State
```typescript
// Source: Next.js official tutorial pattern
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SECTORS = [
  'Health & Social', 'Construction', 'Business Services', 'Transport',
  'IT Services', 'Software', 'Architecture & Engineering', /* ... */
];

export function ContractFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={searchParams.get('sector') || 'all'}
        onValueChange={(v) => updateFilter('sector', v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Sectors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sectors</SelectItem>
          {SECTORS.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Similar for region, value range */}
    </div>
  );
}
```

### Pagination Component Pattern
```typescript
// Source: Next.js official tutorial pattern
'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const createPageURL = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
        <Link href={createPageURL(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
        <Link href={createPageURL(currentPage + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as plain object | `searchParams` as `Promise` (must await) | Next.js 15/16 | Breaking change -- all pages reading searchParams must be async |
| `params` as plain object | `params` as `Promise` (must await) | Next.js 15/16 | Dynamic route pages must await params |
| Client-side data fetching (useEffect + fetch) | Server components with direct DB access | Next.js 13+ App Router | Simpler code, better performance, no loading waterfalls |
| `Model.count()` | `Model.countDocuments()` / `Model.estimatedDocumentCount()` | Mongoose 7+ | `count()` deprecated. Use `estimatedDocumentCount()` for unfiltered totals |
| CSS-in-JS (styled-components) | Tailwind CSS 4 + shadcn/ui | 2024+ | Zero-runtime, server component compatible |

**Deprecated/outdated:**
- `Model.count()`: Deprecated since Mongoose 7. Use `countDocuments(filter)` for filtered counts and `estimatedDocumentCount()` for total collection count.
- `getServerSideProps`: Replaced by server component `searchParams` prop in App Router. Do not use Pages Router patterns.
- `useRouter().push()` for filter updates: Use `replace()` instead to avoid polluting browser history with every filter change.

## Data Profile (Actual Database State)

Understanding the actual data is critical for building the right UI:

| Metric | Value | Impact on UI |
|--------|-------|-------------|
| Total contracts | 809 | Manageable for skip/limit pagination (no cursor pagination needed) |
| Find a Tender | 509 (63%) | Source badge should appear on cards |
| Contracts Finder | 300 (37%) | Source badge should appear on cards |
| Distinct sectors | 41 (top: Health 155, Construction 81, Business 80) | Select dropdown is fine (not too many) |
| Distinct regions | 112 NUTS codes (303 null, top: UKM 58, UK 43) | Group by NUTS1 level (~12 groups) for usable filter |
| Value range | 1 GBP to 1.8B GBP (avg 26M) | Predefined brackets, NOT a continuous slider |
| Null regions | 303 contracts (37%) | Must handle null in region filter |
| Null sectors | 2 contracts | Negligible, can show as "Other" |
| Text index | `title_text_description_text` exists | Ready for $text search, no index creation needed |
| Compound indexes | `status+publishedDate`, `sector+status` | Good for filtered queries |
| vibeScore field | Exists in schema but all null (Phase 5) | Show placeholder/empty badge, design for future score display |

### NUTS1 Region Mapping (for filter dropdown)
```
UKC = North East England
UKD = North West England
UKE = Yorkshire and The Humber
UKF = East Midlands
UKG = West Midlands
UKH = East of England
UKI = London
UKJ = South East England
UKK = South West England
UKL = Wales
UKM = Scotland
UKN = Northern Ireland
UK  = UK-wide
```

## Open Questions

1. **Should search use relevance ranking or chronological sort?**
   - What we know: MongoDB `$text` can sort by `{ score: { $meta: "textScore" } }` for relevance, or we can sort by `publishedDate` for recency.
   - What's unclear: Which is better UX for procurement users? Most procurement platforms sort by date.
   - Recommendation: Default sort by `publishedDate` descending. When a search query is active, show a "Sort by relevance" toggle option. Start with date sort for MVP simplicity.

2. **Dashboard page vs Contracts page overlap**
   - What we know: `/dashboard` currently shows stats cards + "Recent Contracts" placeholder. `/contracts` is the dedicated feed page.
   - What's unclear: Should the dashboard page show a preview of recent contracts, or just link to the contracts page?
   - Recommendation: Dashboard shows 5 most recent contracts (no search/filter) + stats with real counts. Contracts page is the full feed with search/filter/pagination. This avoids duplicating the feed logic.

3. **DASH-06 (AI score badges) when vibeScore is null**
   - What we know: `vibeScore` field exists in the schema but is null for all 809 contracts until Phase 5 (Vibe Scanner) runs.
   - What's unclear: Should cards show an empty score badge, a "Not scored" placeholder, or no badge at all?
   - Recommendation: Show no score badge when `vibeScore` is null. The card layout should be designed so that adding the badge in Phase 5 doesn't break the layout. Use a flex-wrap container where the score badge is conditionally rendered.

4. **DASH-01 says "sorted by AI score" but scores don't exist yet**
   - What we know: DASH-01 requirement says "feed of scored contracts on login (sorted by AI score)". Phase 5 creates the scores.
   - What's unclear: How to handle sorting before scores exist.
   - Recommendation: Sort by `publishedDate` descending as default. In Phase 5, add a "Sort by score" option. The architecture should support swappable sort orders via URL param (`sort=date` or `sort=score`).

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js/v16.1.5` - searchParams as Promise, dynamic routes with params as Promise, Suspense patterns
- Context7 `/websites/mongoosejs` - $text search, countDocuments, estimatedDocumentCount, skip/limit pagination
- Context7 `/websites/ui_shadcn` - Badge variants/colors, Card components, Select components, DataTable pagination patterns
- MongoDB `tendhunt.contracts` collection - Direct queries for data profile (809 contracts, 41 sectors, 112 regions, value range)
- Existing codebase files: `src/models/contract.ts`, `src/app/(dashboard)/contracts/page.tsx`, `src/components/ui/badge.tsx`

### Secondary (MEDIUM confidence)
- [Next.js Official Tutorial: Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - Verified pattern for useSearchParams + useRouter.replace + debounce
- [nuqs](https://nuqs.dev) - Evaluated but not recommended for this scope (adds dependency for minimal benefit)
- [MongoDB Text Search Blog Post](https://oneuptime.com/blog/post/2026-02-02-mongodb-text-search/view) - $text vs $regex performance comparison
- [shadcn/ui Badge Custom Colors](https://ui.shadcn.com/docs/components/base/badge) - Custom color classes for score badges

### Tertiary (LOW confidence)
- NUTS region code to name mapping - Standard EU/UK statistical geography, widely documented but needs verification against actual ONS nomenclature

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified via Context7. Only new dependency is `use-debounce` (6.4M weekly npm downloads).
- Architecture: HIGH - Follows Next.js official tutorial pattern exactly. Verified with Context7 for v16.1.5 specifics (searchParams as Promise).
- Pitfalls: HIGH - Derived from actual database inspection (303 null regions, 1-1.8B value range, NUTS codes) and verified Next.js 16 breaking changes.
- Data profile: HIGH - Queried actual MongoDB collection directly, not estimated.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable stack, data profile may change as more contracts are ingested)
