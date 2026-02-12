# 11-04 Summary: Spend Frontend — Charts, Hero & API Route

## Status: Complete

## What Was Built

### Dependencies
- Installed **Recharts 2.x** (`recharts`)
- Added **shadcn/ui chart component** (`src/components/ui/chart.tsx`) providing ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent

### Spend Analytics Engine (`src/lib/spend-analytics.ts`)
- `computeSpendMetrics(summary)` — returns totalSpend, avgMonthlySpend, topCategory, topVendor, transactionCount, dateRange, uniqueVendors, uniqueCategories
- `computeSpendOpportunities(summary, userProfile)` — returns 4 opportunity types:
  1. **profileMatch** — matches user sectors/capabilities against buyer spend categories (case-insensitive substring match)
  2. **recurringPatterns** — detects vendors with recurring spend via transaction frequency heuristics
  3. **vendorConcentration** — flags top vendors accounting for >60% of total spend
  4. **spendGrowthSignals** — compares recent 12 vs prior 12 months for >20% YoY growth

### API Route (`src/app/api/buyers/[id]/spending/route.ts`)
- GET handler with Clerk auth
- Parallel fetch of SpendSummary + CompanyProfile
- Returns `{ hasSpendData, summary, metrics, opportunities }` with serialized dates/ObjectIds
- Returns `{ hasSpendData: false }` when no data exists

### Chart Components
- **SpendCategoriesChart** (`src/components/buyers/spend-categories-chart.tsx`) — Horizontal bar chart of top 10 categories, GBP formatting, click callback for future filtering
- **SpendTimelineChart** (`src/components/buyers/spend-timeline-chart.tsx`) — Line chart of monthly spend over time, monotone curve, "MMM YY" labels
- **SpendingHero** (`src/components/buyers/spending-hero.tsx`) — 4 key metric cards (total spend, avg monthly, vendors, date range) + profile match card with percentage and matched categories
- **SpendingTab** (`src/components/buyers/spending-tab.tsx`) — Orchestrator: fetches API on mount, loading skeleton, empty state, data layout with hero + 2-column chart grid

### Integration
- Added "Spending" tab to `BuyerTabs` (`src/components/buyers/buyer-tabs.tsx`)
- SpendingTab lazy-loads data only when the tab is selected (via TabsContent deferred rendering)

## Verification
- `npx tsc --noEmit` passes with 0 errors
- `recharts` in package.json dependencies
- `src/components/ui/chart.tsx` exists

## Files Created/Modified
- `package.json` (recharts added)
- `src/components/ui/chart.tsx` (new — shadcn add)
- `src/lib/spend-analytics.ts` (new)
- `src/app/api/buyers/[id]/spending/route.ts` (new)
- `src/components/buyers/spend-categories-chart.tsx` (new)
- `src/components/buyers/spend-timeline-chart.tsx` (new)
- `src/components/buyers/spending-hero.tsx` (new)
- `src/components/buyers/spending-tab.tsx` (new)
- `src/components/buyers/buyer-tabs.tsx` (modified — added Spending tab)
