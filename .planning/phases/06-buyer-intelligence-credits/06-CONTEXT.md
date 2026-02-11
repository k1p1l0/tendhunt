# Phase 6: Buyer Intelligence & Credits - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can explore buyer organization profiles with AI relevance scores and reveal locked contacts by spending credits. This demonstrates the monetization model to investors. Creating new contacts, editing buyer data, or payment processing are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Buyer profile layout
- Header + tabbed content pattern (like Starbridge reference)
- Header card: org logo, org name, then metadata row: Sector, Region, Contract count, Website link
- 4 tabs: Contracts, Key Contacts, Buying Signals, Buyer Attributes
- Buyer Attributes tab: 3-column grid of scored cards — mix of factual stats (contract count, avg value) AND AI-generated scores (SME Friendliness, Procurement Complexity, etc.)
- Attributes cards show label + info icon + numeric value (matching Starbridge "AI Adoption Score: 74" pattern)
- Breadcrumb navigation: Buyers > [Org Name]

### Contact card layout
- Match Starbridge reference exactly: Name as header, then horizontal row with job title (building icon), phone (phone icon), email (mail icon)
- Copy-to-clipboard button on email and phone fields (clipboard icon like reference)
- Contact count shown at top of contacts tab ("X Key Contacts")

### Contact locked state
- Name + job title VISIBLE in locked state (creates desire — users see WHO but can't reach them)
- Phone and email fields use CSS blur effect on actual text (frosted glass look — users can tell real data exists behind it)
- Single "Unlock Contacts (1 Credit)" CTA button at top of contacts tab (above the contact list)

### Contact reveal interaction
- Per-buyer pricing: 1 credit reveals ALL contacts for that organization
- Instant reveal with no confirmation dialog — click button, blur dissolves
- Fast snappy animation (~300ms blur dissolve)
- After reveal: contacts show unblurred with copy-to-clipboard buttons on email/phone
- Already-revealed buyers show green "Unlocked" badge on buyer header and in buyers table

### Credit system UX
- Balance display: sidebar bottom (always visible, not prominent)
- Animated counter when credits deducted (number ticks down, e.g., 10 → 9)
- Zero balance: reveal button changes to "Get More Credits" — clicking opens pricing/upgrade page (inline prompt, no modal)
- Transaction history: clicking credit balance in sidebar opens popover/dropdown with recent transactions and link to full history

### Navigation & discovery
- Two paths to buyer profiles: (1) clickable buyer name on contract cards/detail pages, (2) dedicated Buyers page in sidebar
- Buyers list page: data table with sortable columns (name, sector, region, contract count, unlocked badge)
- Standalone page at /buyers — independent from Vibe Scanner, simpler for demo
- Unlocked column/badge in buyers table showing which orgs' contacts have already been revealed

### Claude's Discretion
- Buyer Attributes card grid exact contents and AI score categories
- Table sorting defaults and filter options on buyers list page
- Exact blur intensity and dissolve animation easing curve
- Transaction history popover layout and content density
- Empty states for tabs with no data (no signals, no contracts)

</decisions>

<specifics>
## Specific Ideas

- Starbridge/University of Utah buyer profile used as primary design reference — logo + name header, metadata row, horizontal tab bar, contact cards with icons
- Buyer Attributes tab inspired by Starbridge's scored card grid (AI Adoption Score: 74, Startup Friendliness: 82, etc.) — adapted to UK procurement context
- Contact cards match reference layout: Name header, then row of icon + detail pairs (building icon + job title, phone icon + number, mail icon + email, clipboard icon for copy)
- Credit balance in sidebar feels like game currency — small but always accessible
- Animation timing: ~300ms for contact reveal, animated counter tick-down for credit deduction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-buyer-intelligence-credits*
*Context gathered: 2026-02-11*
