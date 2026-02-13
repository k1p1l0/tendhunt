# Quick Task: Buyer Page Redesign — Table + Toolbar + Detail Header

## Goal
Redesign buyer list page (`/buyers`) and detail page (`/buyers/[id]`) to match the data-dense Linear/Attio-style design from the reference prototype at `/Users/kirillkozak/Downloads/buyers_look/`. Same pattern as the contracts redesign.

## Tasks

### Task 1: Create `buyers-toolbar.tsx`
**File**: `apps/web/src/components/buyers/buyers-toolbar.tsx` (NEW)

"use client" — Combined toolbar with search + Notion-style filter chips + count + sort.
- Search input with debounced `q` URL param (use-debounce, 300ms)
- Three filter chips: `+ Sector`, `+ Org Type`, `+ Region` using Popover
  - OrgType shows human-readable labels via orgTypeLabel() mapping (full map from existing buyer-table.tsx)
  - Region shows names via resolveRegionName()
- Count: `"{filtered} buyers"` or `"Showing {filtered} of {total}"`
- Sort: ArrowUpDown + sort label, updates `sort`/`order` URL params
- Props: `{ total, filtered, sectors[], orgTypes[], regions[] }`
- Use `useCallback` for Popover onOpenChange (not useEffect with setState)
- NO title row — breadcrumb handles that

### Task 2: Create `buyers-table.tsx`
**File**: `apps/web/src/components/buyers/buyers-table.tsx` (NEW)

"use client" — 12-column CSS grid table matching reference.
Grid: Organization(4) | Sector(2) | Region(2) | Contracts(1) | Org Type(2) | Score(1)

Row rendering per reference:
- Organization: Logo 32x32 (logoUrl or Building2 fallback) + name (hover:blue-400) + website domain below
- Sector: badge pill
- Region: resolveRegionName()
- Contracts: tabular-nums number, right-aligned
- Org Type: badge with orgTypeLabel()
- Score: color-coded number (emerald ≥70, amber ≥40, red <40)
- Sortable column headers with ArrowUp/ArrowDown indicators
- Container fade-in animation, prefers-reduced-motion support
- Props: `{ buyers[], sort, order }`

### Task 3: Create `buyer-table-skeleton.tsx`
**File**: `apps/web/src/components/buyers/buyer-table-skeleton.tsx` (NEW)

Skeleton matching table layout with 12-column grid header + 10 rows.

### Task 4: Create buyers list breadcrumb
**File**: `apps/web/src/app/(dashboard)/buyers/breadcrumb.tsx` (NEW)

Sets "Buyers" in global header breadcrumb context. Same pattern as contracts breadcrumb.

### Task 5: Update buyers list page
**File**: `apps/web/src/app/(dashboard)/buyers/page.tsx` (MODIFY)

- Remove: `<h1>`, `<p>` header, BuyerFilters import/usage, BuyerTable import/usage, inline TableSkeleton
- Add: BuyersListBreadcrumb, BuyersToolbar, BuyersTable, BuyerTableSkeleton
- Add `logoUrl: b.logoUrl ?? undefined` to serialization
- Pass sort/order strings to BuyersTable
- Change `space-y-6` to `space-y-4`

### Task 6: Update buyer detail page
**File**: `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` (MODIFY)

- Change layout from `space-y-6` to `flex flex-col h-[calc(100vh-4rem)]`
- Add sticky header: back arrow Link + buyer name title + Share/Export buttons
- Keep BuyerBreadcrumb (already sets "Buyers > Name" in global header)
- Wrap BuyerDetailClient in `flex-1 overflow-y-auto`
- Keep all existing serialization, auth, spend data check

### Task 7: Delete old components
- Delete `apps/web/src/components/buyers/buyer-table.tsx`
- Delete `apps/web/src/components/buyers/buyer-filters.tsx`

### Task 8: Verify
- `pnpm typecheck` — no errors
- `bun run lint` — no new errors
