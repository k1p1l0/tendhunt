# Phase 2: Content - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all landing page sections below the hero — Features, How It Works, Social Proof, Pricing, FAQ, and Waitlist — with TendHunt-specific content adapted from the Getmany Figma template. The hero section is already built (UK map, signal cards, animated background, CTAs). This phase delivers the complete conversion funnel from "what is this?" to "sign me up."

Requirements: LAND-04 (Hero — already built, verify), LAND-05 (Features), LAND-06 (Social Proof), LAND-07 (Pricing), LAND-08 (How It Works), LAND-09 (Waitlist form), LAND-10 (FAQ)

</domain>

<decisions>
## Implementation Decisions

### Section Flow & Storytelling
- **Section order:** Hero (existing) → Features → How It Works → Social Proof → Pricing → FAQ → Waitlist
- **Visual flow:** Alternating dark (#0A0A0A) / slightly-lighter (#111 or #141414) panels for visual rhythm between sections
- **Figma fidelity:** Style guide only — use Figma for typography, spacing, and component patterns but redesign layouts for TendHunt's content
- **CTA placement:** 3 CTAs total — hero (existing), mid-page banner (after Features or Social Proof), final dedicated waitlist section
- **Transitions:** Consistent with hero's lime accent language; sections separated by spacing and alternating background tones

### Features Showcase
- **Features to highlight (3):**
  1. **Contract Discovery** — Find UK government contracts from multiple sources (Find a Tender, Contracts Finder) before competitors
  2. **Buying Signals / Vibe Scanner** — AI-powered detection of procurement signals from board minutes, budgets, news
  3. **Buyer Intelligence** — Reveal buyer contacts, org charts, decision-maker info for target organizations
- **Layout pattern:** Reuse Getmany's tabbed carousel component pattern (Figma node 6816:34018) — numbered tabs (01, 02, 03) with progress bar, each tab shows card with icon + title + description + media
- **Reference implementation:** `/Users/kirillkozak/Projects/marketing-website/components/organisms/main/product-features-section.tsx`
- **Copy tone:** Benefit-focused — lead with what the user gains, not mechanics
- **Media:** CSS-only illustrations in each feature card (consistent with hero's zero-JS approach) — abstract animated graphics suggesting each feature
- **Mobile:** Cards carousel/swipe on mobile, tabs on desktop

### Pricing & Tiers
- **Tier names:** Scout / Hunter / Enterprise (TendHunt-themed)
- **Pricing display:** No prices shown — "Join waitlist for launch pricing" CTA
- **Feature lists:** Show feature comparison per tier (what's included), but no price tags
- **Highlighting:** No "Most Popular" badge — present all three equally
- **Free tier:** Not shown on pricing cards (hero already mentions "Free to start" and "10 free credits")
- **Monthly/annual toggle:** Not needed since no prices are shown

### Waitlist Capture & CTA Strategy
- **Form fields:** Email + Company Name + Role (3 fields)
- **Backend:** Cloudflare Worker API endpoint — stores submissions in KV or D1
- **Confirmation:** Inline success message — form transforms to "You're on the list!" (stays on page)
- **Spam protection:** Cloudflare Turnstile (free, privacy-focused, usually invisible)
- **Mid-page CTA:** Banner between Features/Social Proof sections linking to the waitlist section at bottom

### Claude's Discretion
- How It Works section layout (likely 3-step horizontal flow)
- Social Proof section content (stats, testimonials, or logo cloud — depending on what's available pre-launch)
- FAQ questions and answers (5-8 procurement-specific)
- Exact CSS illustration designs for feature cards
- Section spacing and responsive breakpoints
- Loading/animation behavior for sections entering viewport

</decisions>

<specifics>
## Specific Ideas

- **Getmany Figma reference:** Use node 7899-45802 as overall design language source, node 6816:34018 specifically for the features tabbed carousel pattern
- **Reference code:** `/Users/kirillkozak/Projects/marketing-website/components/organisms/main/product-features-section.tsx` — tabbed carousel with numbered tabs, progress bar underline, card with icon + media
- **Existing hero context:** The hero already has a dark theme (#0A0A0A), lime (#E5FF00) accents, UK map with floating signal cards, Space Grotesk headings, Inter body text, and a "Live Signal Feed" connector line. All new sections must feel like a natural continuation of this design language.
- **Zero-JS philosophy:** The landing page uses Astro's static output mode. All animations should be CSS-only (keyframes, transitions). The features tabbed carousel is the ONE exception where a small amount of client-side JS is acceptable (tab switching).
- **Alternating panels** should be subtle — not jarring contrast, just enough to visually separate sections

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-content*
*Context gathered: 2026-02-11*
