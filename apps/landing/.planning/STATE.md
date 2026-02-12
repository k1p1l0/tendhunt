# Landing Project State

## Project Reference

See: landing/.planning/PROJECT.md (updated 2026-02-10)
See: landing/.planning/ROADMAP.md (created 2026-02-11)

**Core value:** Marketing site at tendhunt.com converting visitors into waitlist signups + Ghost blog driving organic SEO traffic for UK procurement keywords.
**Current focus:** Phase 1: Foundation

## Current Position

Phase: 1 of 5 (Foundation)
Plan: 1 of 2 in current phase (01-01 complete)
Status: Plan 01-01 executed -- Astro scaffold, Tailwind v4, base layout complete
Last activity: 2026-02-11 -- Plan 01-01 executed (2 tasks, 14 files)

Progress: [##░░░░░░░░] 10%

## Linear Sync

**Project:** [Landing](https://linear.app/testproc/project/landing-93c693865980) — In Progress
**Issues:** 19 created (HAC-51 through HAC-69), all in Backlog

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 5 min
- Total execution time: 5 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01 | 5min | 2 | 14 |

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

### Pending Todos

None yet.

### Blockers/Concerns

- Ghost Pro subdirectory requires Business plan ($199/mo + $50/mo add-on) — self-host recommended
- Cloudflare CNAME lockout possible with Ghost Pro — self-host avoids this
- Lexical format is complex/underdocumented for programmatic generation

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 01-01-PLAN.md (Astro scaffold + base layout)
Next action: Execute 01-02-PLAN.md (Cloudflare Pages deployment)
