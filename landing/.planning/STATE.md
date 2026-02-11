# Landing Project State

## Project Reference

See: landing/.planning/PROJECT.md (updated 2026-02-10)
See: landing/.planning/ROADMAP.md (created 2026-02-11)

**Core value:** Marketing site at tendhunt.com converting visitors into waitlist signups + Ghost blog driving organic SEO traffic for UK procurement keywords.
**Current focus:** Phase 3 in progress -- Ghost blog theme deployed, reverse proxy next

## Current Position

Phase: 3 of 5 (Ghost Blog) -- IN PROGRESS
Plan: 2 of 3 in current phase -- plans 01 + 02 executed
Status: Ghost installed on VPS (plan 01), custom theme deployed (plan 02), reverse proxy pending (plan 03)
Last activity: 2026-02-11 -- Phase 3 plan 02 executed (custom Ghost theme)

Progress: [######░░░░] 60%

## Linear Sync

**Project:** [Landing](https://linear.app/testproc/project/landing-93c693865980) — In Progress
**Issues:** 19 created (HAC-51 through HAC-69), all in Backlog

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 6 min
- Total execution time: 40 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01 | 5min | 2 | 14 |
| 01 | 02 | 5min | 2 | 1 |
| 02 | 01 | 5min | 3 | 7 |
| 02 | 02 | 5min | 4 | 11 |
| 03 | 01 | 10min | 3 | 8 |
| 03 | 02 | 10min | 3 | 12 |

## Accumulated Context

### Decisions

- [Research]: Astro 5.x (static) over Next.js for landing — zero JS runtime, perfect Lighthouse
- [Research]: Tailwind CSS v4 via @tailwindcss/vite (not v3 config file)
- [Research]: Self-hosted Ghost on VPS ($6/mo) recommended over Ghost Pro ($199/mo for subdirectory)
- [Research]: Cloudflare Worker reverse proxy for /blog (HTMLRewriter for URL rewriting)
- [Research]: Plain static HTML approach considered but Astro chosen for component reuse
- [Research]: Article pipeline uses HTML card wrapper for lossless Lexical conversion
- [Design]: Figma template from Getmany website (node 7899-45802) as design source
- [01-01]: Tailwind v4 @theme in CSS (no tailwind.config.js) for all design tokens
- [01-01]: bg-bg-primary on html element to prevent dark theme white flash
- [01-01]: astro-navbar for sticky header and mobile hamburger (2KB, headless)
- [01-01]: Fontsource variable font packages for self-hosted Space Grotesk + Inter
- [01-01]: Static output mode with @astrojs/sitemap (no SSR adapter needed)
- [01-02]: Cloudflare Pages direct upload via wrangler (not CF build)
- [01-02]: Production deploy requires --branch=main flag
- [01-02]: Custom domains: tendhunt.com and tendhunt.uk both active
- [Hero]: CSS-only animated background (grid, particles, scanline) — zero JS
- [Hero]: UK map uses real Natural Earth 50m GeoJSON data (19 SVG polygons)
- [Hero]: 5 floating signal cards on map (London, Manchester, Edinburgh, Birmingham, Leeds)
- [Hero]: Color-coded card types: Contract=#E5FF00, Expiry=#FF6B6B, Budget=#4ADE80, Intel=#54A0FF
- [02-01]: Web components pattern (customElements.define) for TabsCarousel — scoped selectors, keyboard nav
- [02-01]: CSS scroll-snap for mobile carousel — zero JS, native swipe gestures
- [02-01]: Astro slot names must be static strings — unrolled loop instead of dynamic slot names
- [02-01]: CSS-only illustrations (bar chart, pulse rings, network nodes) with @keyframes
- [02-01]: SVG arrow separators in How It Works section (desktop only, hidden mobile)
- [02-02]: @astrojs/cloudflare adapter for hybrid rendering (static pages + SSR API route)
- [02-02]: output: 'static' + prerender: false on API route — NOT full SSR
- [02-02]: Cloudflare D1 for waitlist database (relational data > KV)
- [02-02]: Cloudflare Turnstile for spam protection (invisible, free, privacy-focused)
- [02-02]: Native <details>/<summary> for FAQ accordion — zero JS, accessible by default
- [02-02]: Server-side Turnstile verification (client-side widget alone is bypassable)
- [02-02]: Hero and Header CTAs updated from #early-access to #waitlist anchor
- [03-01]: Ghost 6.18.0 on Hetzner CX23 (Helsinki), 4GB RAM, €3.49/mo
- [03-01]: ghost_user system user with sudo NOPASSWD for Ghost CLI operations
- [03-01]: Let's Encrypt R12 SSL via acme.sh with auto-renewal cron
- [03-01]: Admin at ghost-admin.tendhunt.com/ghost/ (DNS Only, no CF proxy)
- [03-02]: Tailwind v3 (not v4) for Ghost theme -- @tailwindcss/typography requires v3 config format
- [03-02]: Font files named space-grotesk-latin-wght-normal.woff2 (actual Fontsource naming)
- [03-02]: CommonJS module.exports in tailwind.config.js (Ghost theme context is not ESM)
- [03-02]: Mobile nav via vanilla JS toggle (Ghost themes can't use astronav)
- [03-02]: Ghost 6.x requires @page.show_title_and_feature_image in page.hbs
- [03-02]: card_assets: true enables Ghost's built-in card CSS/JS for Koenig editor content

### Pending Todos

- **Rebuild landing with Notus Agent template** — Create alternative landing page using the manuarora700 Next.js marketing template with full TendHunt content

### Blockers/Concerns

- Ghost Pro subdirectory requires Business plan ($199/mo + $50/mo add-on) — self-host recommended
- Cloudflare CNAME lockout possible with Ghost Pro — self-host avoids this
- Lexical format is complex/underdocumented for programmatic generation
- Turnstile site key is placeholder — needs Cloudflare Dashboard widget creation before deploy
- D1 database_id is placeholder — needs `wrangler d1 create tendhunt-waitlist` before deploy

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 03-02-PLAN.md (Custom Ghost theme deployed and activated)
Next action: Execute Plan 03-03 (Cloudflare Worker reverse proxy for /blog subdirectory)
