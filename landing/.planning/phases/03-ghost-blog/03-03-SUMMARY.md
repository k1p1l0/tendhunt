---
phase: 03-ghost-blog
plan: 03
subsystem: infra, seo
tags: [cloudflare-worker, reverse-proxy, htmlrewriter, url-rewriting, ghost, seo]

# Dependency graph
requires:
  - phase: 03-ghost-blog-01
    provides: Ghost 6.18.0 instance on VPS at ghost-admin.tendhunt.com
  - phase: 03-ghost-blog-02
    provides: Custom Ghost theme with TendHunt design tokens
provides:
  - Cloudflare Worker proxying tendhunt.com/blog/* to Ghost origin
  - Full URL rewriting (HTML, JSON-LD, sitemap, RSS, redirects)
  - Admin route blocking (/blog/ghost returns 403)
  - Root-relative URL prefixing for Ghost assets and post slugs
  - Blog accessible at tendhunt.com/blog with correct SEO meta
affects: [seo, content-pipeline, blog-posts]

# Tech tracking
tech-stack:
  added: [wrangler@3.114.17, "@cloudflare/workers-types@4"]
  patterns: [text-replacement-url-rewriting, htmlrewriter-root-relative, cloudflare-worker-route-pattern]

key-files:
  created:
    - landing/workers/blog-proxy/src/index.ts
    - landing/workers/blog-proxy/wrangler.toml
    - landing/workers/blog-proxy/package.json
    - landing/workers/blog-proxy/tsconfig.json
    - landing/workers/blog-proxy/.gitignore
    - landing/.planning/phases/03-ghost-blog/03-03-VERIFICATION.md
  modified: []

key-decisions:
  - "Hybrid text replacement + HTMLRewriter -- text replacement for absolute/protocol-relative URLs (catches JSON-LD, data-ghost attrs, inline scripts), HTMLRewriter only for root-relative path prefixing"
  - "Protocol-relative URL rewriting (//ghost-admin.tendhunt.com) -- Ghost sitemap XSL uses protocol-relative URLs that initial regex missed"
  - "Explicit --config wrangler.toml flag for deploy -- wrangler 3.x mistakenly detected Pages project without it"
  - "Binary and static asset passthrough with 24h/7d cache -- images, fonts, CSS, JS served without rewriting"
  - "Admin route blocking returns 403 with helpful message pointing to ghost-admin.tendhunt.com/ghost"

patterns-established:
  - "Worker project at landing/workers/blog-proxy/ -- separate from Astro landing and Ghost theme"
  - "Text replacement for all absolute URL rewriting (more reliable than HTMLRewriter for inline content)"
  - "HTMLRewriter limited to root-relative URL prefixing (/assets/ -> /blog/assets/)"
  - "wrangler deploy --config wrangler.toml to avoid Pages project detection"

# Metrics
duration: 8min
completed: 2026-02-11
---

# Phase 3 Plan 3: Cloudflare Worker Blog Reverse Proxy Summary

**Cloudflare Worker at tendhunt.com/blog/* proxying Ghost origin with hybrid text replacement + HTMLRewriter for zero-leak URL rewriting across HTML, JSON-LD, sitemap, RSS, and data attributes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-11T13:26:34Z
- **Completed:** 2026-02-11T13:35:00Z
- **Tasks:** 3
- **Files created:** 6

## Accomplishments

- Cloudflare Worker deployed proxying `tendhunt.com/blog/*` to `ghost-admin.tendhunt.com`
- Full URL rewriting achieving **0 ghost-admin references** in all output (HTML, XML, JSON-LD)
- Hybrid approach: text replacement for absolute URLs + HTMLRewriter for root-relative path prefixing
- Sitemap XML and RSS feed URLs correctly rewritten to `tendhunt.com/blog/*`
- Admin route `/blog/ghost` blocked with 403 on public domain
- Blog assets (CSS, fonts, images) served with proper caching headers
- All 15 verification checks pass (documented in 03-03-VERIFICATION.md)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Cloudflare Worker project** - `afb170f` (feat)
2. **Task 2: Deploy Worker and configure routes** - `a02e6e3` (chore)
3. **Task 3: Bug fixes + verification report** - `535f8b6` (fix)

## Worker Architecture

### Request Flow

```
tendhunt.com/blog/* request
  -> Cloudflare Worker (route: tendhunt.com/blog*)
    -> Admin check (/blog/ghost -> 403)
    -> Strip /blog prefix
    -> Fetch from ghost-admin.tendhunt.com
    -> Content-Type routing:
       - Binary (image/font/css/js) -> passthrough with cache headers
       - XML (sitemap/rss) -> text replacement
       - HTML -> text replacement + HTMLRewriter
       - Redirect -> Location header rewriting
       - Other -> passthrough
```

### URL Rewriting Strategy

| Content Type | Method | What It Catches |
|---|---|---|
| HTML absolute URLs | Text replacement | `href`, `src`, `content`, JSON-LD, `data-ghost`, `data-api`, inline scripts |
| HTML protocol-relative | Text replacement | `//ghost-admin.tendhunt.com` in XSL refs |
| HTML root-relative paths | HTMLRewriter | `/assets/` -> `/blog/assets/`, `/post-slug/` -> `/blog/post-slug/` |
| Sitemap XML | Text replacement | `<loc>` URLs, XSL stylesheet references |
| RSS XML | Text replacement | `<link>` URLs, `<guid>` URLs |
| Redirect headers | String replacement | `Location` header URLs |

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `GHOST_SUBDOMAIN` | `ghost-admin.tendhunt.com` | Ghost origin server |
| `PUBLIC_DOMAIN` | `tendhunt.com` | Public-facing domain |
| `BLOG_PATH` | `/blog` | Subdirectory prefix |

### Cloudflare Config

- **Zone ID:** `9501d7508cd63083330e194178f04649`
- **Route:** `tendhunt.com/blog*`
- **Worker size:** 5.58 KiB / 1.69 KiB gzip
- **Version ID:** `1fa92a5a-e7c2-44c8-82c5-3b085dd1a1ff`

## Verification Results

All 15 checks passed -- see `landing/.planning/phases/03-ghost-blog/03-03-VERIFICATION.md` for full table.

Key results:
- Blog homepage: HTTP 200
- Canonical URL: `https://tendhunt.com/blog/`
- OG/Twitter URLs: `https://tendhunt.com/blog/`
- Sitemap: 0 ghost-admin refs
- RSS: 0 ghost-admin refs
- CSS: HTTP 200 (text/css)
- Fonts: HTTP 200 (font/woff2)
- Admin route: HTTP 403
- Total HTML ghost-admin refs: **0**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSON-LD and data attribute URLs not rewritten by HTMLRewriter**
- **Found during:** Task 3 (verification)
- **Issue:** HTMLRewriter element handlers only catch HTML attributes; JSON-LD structured data inside `<script type="application/ld+json">`, Ghost Portal `data-ghost` attribute, and search `data-sodo-search` attribute were not being rewritten
- **Fix:** Switched from HTMLRewriter-only to hybrid approach: full text replacement for absolute URLs first, then HTMLRewriter only for root-relative path prefixing
- **Files modified:** `landing/workers/blog-proxy/src/index.ts`
- **Commit:** `535f8b6`

**2. [Rule 1 - Bug] Protocol-relative URLs not caught by regex**
- **Found during:** Task 3 (verification)
- **Issue:** Ghost sitemap XSL stylesheet reference uses `//ghost-admin.tendhunt.com/sitemap.xsl` (no `https:` prefix). The `https?://` regex pattern missed these.
- **Fix:** Added separate `//` protocol-relative URL replacement in `rewriteAllUrls()` function
- **Files modified:** `landing/workers/blog-proxy/src/index.ts`
- **Commit:** `535f8b6`

**3. [Rule 3 - Blocking] Wrangler deploy detected Pages project**
- **Found during:** Task 2 (deployment)
- **Issue:** `npx wrangler deploy` failed with "It looks like you've run a Workers-specific command in a Pages project"
- **Fix:** Added explicit `--config wrangler.toml` flag to deploy command
- **Files modified:** None (deploy command change only)
- **Commit:** `a02e6e3`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes improved URL rewriting completeness. Zero ghost-admin leaks in final output.

## Known Limitations

1. **No streaming for HTML** -- HTML responses are buffered fully for text replacement before HTMLRewriter processes them. Acceptable for blog pages (~20KB typical).
2. **Root-relative post slug detection** -- Regex `^/[a-z0-9][a-z0-9-]*/?$` may match landing page paths if they collide. Currently no conflicts since landing runs on separate Pages deployment.
3. **Ghost Portal/Search JS** -- The `data-ghost` and `data-api` URLs are rewritten to `tendhunt.com/blog/` but the Portal/Search scripts make API calls to Ghost. These scripts load from CDN (jsdelivr) so they work, but API calls may need CORS headers on Ghost if issues arise.

## Phase 3 Completion Status

All 3 plans complete:
- [x] Plan 01: Ghost installation on VPS (ghost-admin.tendhunt.com)
- [x] Plan 02: Custom Ghost theme matching TendHunt design
- [x] Plan 03: Cloudflare Worker reverse proxy at tendhunt.com/blog

**Phase 3 success criteria from ROADMAP.md -- ALL MET:**
1. Ghost 6.x instance running, admin panel accessible
2. Cloudflare Worker proxies /blog/* with HTMLRewriter URL rewriting
3. Canonical URLs, OG tags, sitemap reference tendhunt.com/blog/
4. Blog navigation links back to landing page
5. Admin route blocked on main domain

## Self-Check: PASSED

All 6 created files verified present:
- FOUND: landing/workers/blog-proxy/src/index.ts
- FOUND: landing/workers/blog-proxy/wrangler.toml
- FOUND: landing/workers/blog-proxy/package.json
- FOUND: landing/workers/blog-proxy/tsconfig.json
- FOUND: landing/workers/blog-proxy/.gitignore
- FOUND: landing/.planning/phases/03-ghost-blog/03-03-VERIFICATION.md

All 3 task commits verified in git log:
- FOUND: afb170f
- FOUND: a02e6e3
- FOUND: 535f8b6

---
*Phase: 03-ghost-blog*
*Completed: 2026-02-11*
