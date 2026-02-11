# Phase 1: Foundation - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Astro 5.x project with Tailwind CSS v4, base layout (header + footer), design tokens (colors, typography, spacing), and deploy to Cloudflare Pages. This phase delivers the skeleton that Phase 2 fills with content sections.

The Figma template ([Getmany GM-Website, node 7899-45802](https://www.figma.com/design/C8ixUnepSX2a8yOrBgjZFL/GM-Website?node-id=7899-45802)) serves as the structural role model — section rhythm, layout patterns, and visual approach are adapted from it.

</domain>

<decisions>
## Implementation Decisions

### Color Scheme & Branding
- Dark background theme (not pure black — use dark gray/near-black like #0A0A0A or #111)
- Yellow/lime accent color for CTAs and highlight bars (#E5FF00 or similar high-contrast lime)
- Enterprise clean aesthetic — more whitespace and restraint than the bold Figma template
- Generate a simple text+icon logo for TendHunt during this phase (minimal, modern)
- Dark theme with yellow/lime creates contrast: professional yet energetic

### Header & Navigation Layout
- Standard nav with 5-6 items: How It Works, Features, Pricing, Blog, Log In, **Get Early Access** (CTA button)
- Sticky header with backdrop blur/fade effect on scroll (transparent at top, gains dark bg + blur on scroll)
- Mobile navigation: Claude's discretion (hamburger menu is the standard pattern)
- Header CTA button text: **"Get Early Access"**

### Page Structure & Section Rhythm
- Follow the Figma template's alternating pattern: dark hero -> light sections -> dark sections -> yellow/lime stats bar -> FAQ on light -> dark CTA banner -> dark footer
- Product mockups/screenshots for visuals (show TendHunt dashboard UI — mockups are fine since app isn't public yet)
- Max content width: **1280px** (standard SaaS landing page width)
- Full footer with "Let's grow together"-style oversized tagline: **"Find contracts. Win business."**
- Footer includes: logo, nav links, social icons (LinkedIn, X), legal links (Terms, Privacy), contact email

### Typography & Font Choices
- Heading font: **Space Grotesk** (techy, distinctive — fits procurement intelligence/data product positioning)
- Body font: Claude's discretion (Inter or system font stack for readability)
- Bold headings + regular weight body text — clear hierarchy
- Oversized display text for footer tagline ("Find contracts. Win business.")
- Font scale should feel enterprise — not too large, clean spacing

### Claude's Discretion
- Mobile navigation implementation (hamburger menu recommended)
- Body font pairing with Space Grotesk
- Exact dark background color value
- Section padding/spacing values
- Logo icon design (keep it simple and modern)
- Hover states and micro-interactions
- Footer layout columns and grouping

</decisions>

<specifics>
## Specific Ideas

- **Hero headline hook**: "TendHunt is the only platform built for UK public sector sales — from signal to close" (or similar phrasing — this captures the positioning)
- Footer tagline: "Find contracts. Win business." — large display text like the Figma's "Let's grow together"
- The Figma template structure to follow: dark header -> hero with product screenshot -> problem/pain section -> dashboard showcase -> features with alternating image/text -> stats bar (yellow/lime) -> FAQ accordion -> dark CTA banner -> full footer with big tagline
- Use the Figma file ([node 7899-45802](https://www.figma.com/design/C8ixUnepSX2a8yOrBgjZFL/GM-Website?node-id=7899-45802)) via Figma MCP to extract exact component layouts during implementation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-11*
