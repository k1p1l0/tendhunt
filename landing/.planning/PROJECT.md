# TendHunt — Landing Page & Blog

## What This Is

A marketing site and blog for TendHunt, a UK procurement intelligence platform for suppliers. The landing page converts visitors (suppliers and investors) into waitlist signups, while the blog drives organic search traffic through procurement-focused content. Lives at `tendhunt.com` with the authenticated app at `app.tendhunt.com`.

## Core Value

The landing page must clearly communicate TendHunt's value proposition — "find UK government contracts, reveal buyer contacts" — and capture leads through a waitlist signup, while the blog starts building SEO authority in UK procurement keywords.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Landing page adapted from Getmany Figma SaaS template with TendHunt content
- [ ] Hero section with clear value proposition and CTA
- [ ] Features section showcasing contract alerts, buyer intelligence, vibe scanner
- [ ] Social proof / trust signals section
- [ ] Pricing section with 3 tiers (Starter, Growth, Scale)
- [ ] Waitlist/email capture form
- [ ] Ghost Pro blog setup at tendhunt.com/blog
- [ ] Cloudflare reverse proxy routing /blog/* to Ghost
- [ ] 5-10 SEO-optimized blog articles on procurement topics
- [ ] Article generation pipeline (AI draft → human review → Ghost publish)
- [ ] Blog thumbnails generation
- [ ] Responsive design (mobile + desktop)

### Out of Scope

- Stripe payments — waitlist only for now
- User authentication on landing page — that's app.tendhunt.com
- Custom Ghost theme — use default or minimal theme for launch
- Video content or animations beyond basic CSS
- A/B testing infrastructure — defer to post-launch
- Analytics deep-dive (beyond basic Cloudflare analytics)

## Context

- **Architecture:** `tendhunt.com` = Cloudflare Pages (landing + marketing), `app.tendhunt.com` = Next.js app. Ghost Pro at tendhunt.com/blog via Cloudflare reverse proxy
- **Design source:** Figma file from Getmany website template (https://www.figma.com/design/C8ixUnepSX2a8yOrBgjZFL/GM-Website?node-id=5797-128240) — adapt layout/sections with TendHunt content
- **SEO targets:** UK procurement keywords — "how to win government contracts", "UK public procurement guide", "Procurement Act 2023", "find government tenders UK"
- **Blog tool:** Ghost 5.x with Lexical format (not HTML or mobiledoc) for new posts
- **Existing work:** Phase 1 of main app complete (auth, MongoDB, app shell). Landing page is independent workstream
- **Market context:** £434B annual UK public sector procurement. Procurement Act 2023 creating new transparency and data opportunities

## Constraints

- **Hosting**: Cloudflare Pages for landing, Ghost Pro for blog
- **Blog format**: Ghost 5.x Lexical format only
- **Design**: Must follow Getmany Figma template structure adapted for TendHunt
- **Content**: AI-generated articles need human review before publishing
- **Budget**: Ghost Pro Starter tier ($9/mo) for blog hosting
- **Domain**: tendhunt.com for landing, /blog subfolder for Ghost via reverse proxy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate landing from app | SEO-optimized static site at root domain, complex app on subdomain | — Pending |
| Ghost Pro (managed) | Zero ops, focus on content not infrastructure | — Pending |
| /blog subfolder via reverse proxy | Best SEO — subfolder passes domain authority better than subdomain | — Pending |
| Figma template reuse | Proven SaaS layout, faster than designing from scratch | — Pending |
| AI + human review for articles | Speed of AI generation with quality of human editing | — Pending |

---
*Last updated: 2026-02-10 after initialization*
