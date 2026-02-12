# Roadmap: TendHunt Landing Page & Blog

## Overview

TendHunt's marketing site at `tendhunt.com` — a high-converting landing page adapted from the Getmany Figma template, plus a Ghost-powered SEO blog at `/blog`. The build follows a foundation-first order: project scaffold and deployment pipeline first, then content sections from the Figma design, then Ghost blog infrastructure, then the article pipeline, and finally SEO polish. Each phase delivers a verifiable capability that builds toward a live marketing site collecting waitlist signups and driving organic traffic.

**Design source:** [Getmany Figma Template (node 7899-45802)](https://www.figma.com/design/C8ixUnepSX2a8yOrBgjZFL/GM-Website?node-id=7899-45802&t=aH3BLHOE7cCmgFQE-4)

**Linear project:** [Landing](https://linear.app/testproc/project/landing-93c693865980)

## Phases

- [x] **Phase 1: Foundation** - Astro project scaffold, Tailwind v4, base layout, Cloudflare Pages deploy
- [ ] **Phase 2: Content** - Figma template → landing page sections with TendHunt content
- [ ] **Phase 3: Ghost Blog Setup** - Ghost instance, Cloudflare Worker proxy, /blog routing
- [ ] **Phase 4: Content Pipeline** - AI article generation, Lexical conversion, thumbnail generation, publish
- [ ] **Phase 5: SEO & Polish** - Meta tags, structured data, performance audit, responsive QA

## Phase Details

### Phase 1: Foundation
**Goal**: A working Astro 5.x project with Tailwind CSS v4, base layout (header/footer), and deployed to Cloudflare Pages — so every subsequent phase has infrastructure to build on
**Depends on**: Nothing (first phase)
**Requirements**: LAND-01, LAND-02, LAND-03
**Success Criteria** (what must be TRUE):
  1. Astro 5.x project builds and runs locally with Tailwind v4
  2. Base layout with header (logo, nav, CTA) and footer renders correctly
  3. TendHunt design tokens (colors, fonts) defined in Tailwind theme
  4. Site deploys to Cloudflare Pages and is accessible at tendhunt.com
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Astro scaffold, Tailwind v4, design tokens, base layout (Header, Footer, Logo, pages)
- [x] 01-02-PLAN.md — Deploy to Cloudflare Pages + visual verification

### Phase 2: Content
**Goal**: All landing page sections are built from the Getmany Figma template with TendHunt-specific content, and the waitlist form captures emails
**Depends on**: Phase 1
**Requirements**: LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10
**Success Criteria** (what must be TRUE):
  1. Hero section with clear value prop and CTA visible above the fold on desktop and mobile
  2. Features section showcases 3-4 product capabilities with benefit-focused copy
  3. Pricing section displays 3 tiers (Starter, Growth, Scale) with transparent pricing
  4. Waitlist form captures emails with confirmation and spam protection
  5. FAQ section with 5-8 procurement-specific questions
  6. All sections are responsive (mobile, tablet, desktop)
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Features (tabbed carousel), How It Works (3 steps), Social Proof (market stats), CSS illustrations
- [ ] 02-02-PLAN.md -- Cloudflare adapter setup, D1 database, Pricing (3 tiers), FAQ (details/summary), Waitlist form (Turnstile + API route)

### Phase 3: Ghost Blog Setup
**Goal**: Ghost blog is live at tendhunt.com/blog via Cloudflare Worker reverse proxy, with correct SEO (canonical URLs, sitemap, OG tags)
**Depends on**: Phase 1
**Requirements**: LAND-11, LAND-12, LAND-13
**Success Criteria** (what must be TRUE):
  1. Ghost 5.x instance running and admin panel accessible
  2. Cloudflare Worker proxies /blog/* to Ghost with HTMLRewriter URL rewriting
  3. Canonical URLs, OG tags, and sitemap all reference tendhunt.com/blog/...
  4. Blog navigation links back to landing page
  5. Admin route (/blog/ghost) blocked on main domain
**Plans**: TBD

Plans:
- [ ] 03-01-PLAN.md -- Ghost instance setup, CF Worker proxy, end-to-end validation

### Phase 4: Content Pipeline
**Goal**: Automated pipeline generates AI-drafted articles with thumbnails, converts to Lexical format, and publishes via Ghost Admin API — with 5-10 SEO articles live
**Depends on**: Phase 3
**Requirements**: LAND-14, LAND-15, LAND-16
**Success Criteria** (what must be TRUE):
  1. Python pipeline generates articles from AI, converts to Lexical, publishes as drafts
  2. Thumbnail generation produces branded images at correct dimensions
  3. 5-10 SEO articles published targeting UK procurement keywords
  4. Each article has featured image, meta description, tags, and internal links
  5. Articles accessible at tendhunt.com/blog/{slug}
**Plans**: TBD

Plans:
- [ ] 04-01-PLAN.md -- Article generation pipeline, Lexical converter, thumbnail generator
- [ ] 04-02-PLAN.md -- Generate, review, and publish 5-10 SEO launch articles

### Phase 5: SEO & Polish
**Goal**: Landing page and blog pass SEO audits, Lighthouse 95+, and responsive QA across all breakpoints
**Depends on**: Phase 2, Phase 3
**Requirements**: LAND-17, LAND-18, LAND-19
**Success Criteria** (what must be TRUE):
  1. All pages have correct meta tags, OG tags, and structured data
  2. Lighthouse Performance score 95+ on desktop and mobile
  3. All sections responsive and functional on mobile (375px+), tablet, desktop
  4. FAQ structured data passes Google Rich Results Test
  5. Sitemap and robots.txt configured
**Plans**: TBD

Plans:
- [ ] 05-01-PLAN.md -- SEO meta, structured data, performance optimization, responsive QA

## Coverage Matrix

| Requirement | Phase | Description |
|-------------|-------|-------------|
| LAND-01 | Phase 1 | Astro project scaffold with Tailwind v4 |
| LAND-02 | Phase 1 | Base layout and design system setup |
| LAND-03 | Phase 1 | Deploy to Cloudflare Pages |
| LAND-04 | Phase 2 | Hero section with value proposition and CTA |
| LAND-05 | Phase 2 | Features section |
| LAND-06 | Phase 2 | Social proof / trust signals section |
| LAND-07 | Phase 2 | Pricing section with 3 tiers |
| LAND-08 | Phase 2 | How it works section |
| LAND-09 | Phase 2 | Waitlist/email capture form |
| LAND-10 | Phase 2 | FAQ section |
| LAND-11 | Phase 3 | Ghost blog instance setup |
| LAND-12 | Phase 3 | Cloudflare Worker reverse proxy for /blog |
| LAND-13 | Phase 3 | Validate /blog end-to-end routing |
| LAND-14 | Phase 4 | Article generation pipeline |
| LAND-15 | Phase 4 | Blog thumbnail generation |
| LAND-16 | Phase 4 | Publish 5-10 SEO launch articles |
| LAND-17 | Phase 5 | SEO meta tags, Open Graph, structured data |
| LAND-18 | Phase 5 | Performance audit (Lighthouse 95+) |
| LAND-19 | Phase 5 | Responsive design QA |

**Coverage: 19/19 requirements mapped. No orphans.**

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

Note: Phase 2 (Content) and Phase 3 (Ghost Blog) can run in parallel since they share only the Phase 1 dependency. Phase 4 (Content Pipeline) depends on Phase 3. Phase 5 (SEO) depends on Phase 2 and Phase 3.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-11 |
| 2. Content | 0/2 | Not started | - |
| 3. Ghost Blog Setup | 0/1 | Not started | - |
| 4. Content Pipeline | 0/2 | Not started | - |
| 5. SEO & Polish | 0/1 | Not started | - |
