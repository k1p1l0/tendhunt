---
phase: 03-ghost-blog
plan: 02
subsystem: infra, ui
tags: [ghost, tailwindcss, handlebars, typography, self-hosted-fonts, theme]

# Dependency graph
requires:
  - phase: 03-ghost-blog-01
    provides: Ghost 6.18.0 instance on VPS with MySQL, NGINX, SSL
provides:
  - Custom Ghost theme (tendhunt-theme) matching landing page design
  - Tailwind CSS 3.4 with typography plugin for blog content
  - Self-hosted Space Grotesk + Inter variable fonts on VPS
  - Ghost templates (default, index, post, page, header, footer, post-card)
  - Theme activated and rendering at ghost-admin.tendhunt.com
affects: [03-ghost-blog-03, content-pipeline, seo]

# Tech tracking
tech-stack:
  added: [tailwindcss@3.4.19, "@tailwindcss/typography@0.5", concurrently, bestzip]
  patterns: [ghost-handlebars-templates, tailwind-prose-invert, self-hosted-woff2-fonts, ghost-admin-api-activation]

key-files:
  created:
    - landing/ghost-theme/tendhunt-theme/package.json
    - landing/ghost-theme/tendhunt-theme/tailwind.config.js
    - landing/ghost-theme/tendhunt-theme/assets/css/index.css
    - landing/ghost-theme/tendhunt-theme/default.hbs
    - landing/ghost-theme/tendhunt-theme/index.hbs
    - landing/ghost-theme/tendhunt-theme/post.hbs
    - landing/ghost-theme/tendhunt-theme/page.hbs
    - landing/ghost-theme/tendhunt-theme/partials/header.hbs
    - landing/ghost-theme/tendhunt-theme/partials/footer.hbs
    - landing/ghost-theme/tendhunt-theme/partials/post-card.hbs
  modified: []

key-decisions:
  - "Tailwind v3 (not v4) for Ghost theme -- Ghost theme validator and @tailwindcss/typography require v3 config format"
  - "Font files named space-grotesk-latin-wght-normal.woff2 (not variable-wghtOnly) -- matching actual Fontsource package naming"
  - "module.exports syntax in tailwind.config.js (not export default) -- Ghost theme runs in CommonJS context"
  - "Mobile menu with vanilla JS toggle -- Ghost themes can't use Astro components/astronav"
  - "page.hbs uses @page.show_title_and_feature_image -- required by Ghost 6.x page builder validation"
  - "card_assets: true in package.json config -- lets Ghost inject its card CSS/JS for Koenig editor content"
  - "Footer matches landing exactly with oversized tagline, 4-column grid, social icons"

patterns-established:
  - "Ghost theme lives in landing/ghost-theme/tendhunt-theme/ locally (version control) and /var/www/ghost/content/themes/tendhunt-theme/ on VPS"
  - "npm run build compiles Tailwind CSS from assets/css/index.css to assets/built/index.css (minified)"
  - "Design tokens in tailwind.config.js mirror landing/src/styles/global.css @theme values"
  - "Ghost Admin API session auth for theme activation (POST /session, PUT /themes/{name}/activate)"

# Metrics
duration: 10min
completed: 2026-02-11
---

# Phase 3 Plan 2: Custom Ghost Theme Summary

**Tailwind CSS Ghost theme matching TendHunt landing design -- Space Grotesk + Inter fonts, dark theme (#0A0A0A), accent (#E5FF00), prose-invert typography, full landing navigation in header/footer**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-11T13:13:03Z
- **Completed:** 2026-02-11T13:23:43Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Custom Ghost theme scaffolded with Tailwind CSS 3.4 and @tailwindcss/typography plugin
- Self-hosted variable fonts (Space Grotesk 22KB, Inter 48KB) served from VPS /assets/fonts/
- 7 Handlebars templates created matching landing page header/footer/design system exactly
- Theme validated by Ghost gscan, activated via Admin API, rendering at ghost-admin.tendhunt.com
- Blog content styled with prose-invert + custom accent colors for headings, links, code blocks
- Ghost Koenig editor cards styled (bookmark, gallery, image, toggle, callout, button, width classes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Ghost theme scaffold and Tailwind dependencies** - `3ccc433` (chore)
2. **Task 2: Create Tailwind CSS theme file and copy fonts** - `891e8c7` (feat)
3. **Task 3: Create Ghost theme templates and activate** - `5b8c2fd` (feat)

## Files Created/Modified

### On VPS (/var/www/ghost/content/themes/tendhunt-theme/)
- `package.json` - Theme manifest with Tailwind build scripts, Ghost >=5.0.0 engine
- `tailwind.config.js` - Design tokens matching landing (fonts, colors, typography plugin)
- `assets/css/index.css` - Tailwind source with @font-face, .gh-content prose, Ghost card styles
- `assets/built/index.css` - Compiled CSS (31KB minified)
- `assets/fonts/space-grotesk-latin-wght-normal.woff2` - Space Grotesk variable font (22KB)
- `assets/fonts/inter-latin-wght-normal.woff2` - Inter variable font (48KB)
- `default.hbs` - Base layout with dark theme class, ghost_head/ghost_foot
- `index.hbs` - Blog homepage with 3-column responsive post grid
- `post.hbs` - Single post with author, reading time, tag pills, feature image
- `page.hbs` - Static page with @page.show_title_and_feature_image support
- `partials/header.hbs` - Sticky nav matching landing (Features, Pricing, Blog, Log In, CTA)
- `partials/footer.hbs` - 4-column footer with tagline, social icons, copyright
- `partials/post-card.hbs` - Post card with hover effects, tag badge, author avatar

### Local (landing/ghost-theme/tendhunt-theme/) - version control copies
- Same files as VPS (excluding node_modules, assets/built/, and binary font files)

## Design Token Mapping (Landing to Ghost Theme)

| Token | Landing (Tailwind v4 @theme) | Ghost Theme (Tailwind v3 config) |
|-------|------------------------------|----------------------------------|
| Font Heading | `--font-heading: "Space Grotesk Variable"` | `fontFamily.heading: ["Space Grotesk Variable", ...]` |
| Font Body | `--font-body: "Inter Variable"` | `fontFamily.body: ["Inter Variable", ...]` |
| Background | `--color-bg-primary: #0A0A0A` | `colors.bg-primary: "#0A0A0A"` |
| Accent | `--color-accent: #E5FF00` | `colors.accent: "#E5FF00"` |
| Text Primary | `--color-text-primary: #FFFFFF` | `colors.text-primary: "#FFFFFF"` |
| Text Body | `--color-text-body: #D4D4D4` | `colors.text-body: "#D4D4D4"` |
| Border | `--color-border: #2A2A2A` | `colors.border: "#2A2A2A"` |

## Decisions Made

1. **Tailwind v3 for Ghost theme** -- Landing uses Tailwind v4 with @theme syntax, but Ghost theme needs @tailwindcss/typography plugin which requires v3 config format. Design tokens manually mapped.
2. **CommonJS module.exports** -- tailwind.config.js uses `module.exports` not `export default` since Ghost theme context is CommonJS.
3. **Font file naming adapted** -- Plan referenced `space-grotesk-latin-variable-wghtOnly-normal.woff2` but actual Fontsource files are named `space-grotesk-latin-wght-normal.woff2`. Used correct names.
4. **Mobile hamburger via vanilla JS** -- Landing uses astronav component; Ghost theme uses simple JS toggle since Handlebars has no component system.
5. **card_assets: true** -- Enables Ghost to inject its own card CSS/JS for Koenig editor content (bookmark, gallery, etc.).
6. **Footer matches landing exactly** -- Includes oversized "Find contracts. Win business." tagline, 4-column grid layout, LinkedIn/X social icons.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed invalid {{gt}} Handlebars helper**
- **Found during:** Task 3 (template creation)
- **Issue:** Plan's index.hbs used `{{#if (gt pagination.pages 1)}}` but Ghost Handlebars does not support the `gt` helper
- **Fix:** Removed the nested `gt` check; pagination nav shows whenever `pagination.pages` exists (Ghost handles single-page case)
- **Files modified:** index.hbs
- **Verification:** Ghost theme validator passes, template renders without errors
- **Committed in:** 5b8c2fd

**2. [Rule 2 - Missing Critical] Added required Ghost theme validation fields**
- **Found during:** Task 3 (theme activation)
- **Issue:** Ghost gscan rejected theme for: missing `author.email` in package.json, missing `.kg-width-wide`/`.kg-width-full` CSS classes, missing `@page.show_title_and_feature_image` in page.hbs
- **Fix:** Added author.email, created kg-width-wide/full CSS with vw-based breakout, added @page conditional in page.hbs
- **Files modified:** package.json, assets/css/index.css, page.hbs
- **Verification:** Ghost Admin API activation returns 200 with `"active": true`
- **Committed in:** 5b8c2fd

**3. [Rule 3 - Blocking] Font file naming mismatch**
- **Found during:** Task 2 (font copy)
- **Issue:** Plan referenced `space-grotesk-latin-variable-wghtOnly-normal.woff2` but Fontsource package files are named `space-grotesk-latin-wght-normal.woff2`
- **Fix:** Used actual file names from node_modules and adapted CSS @font-face src paths
- **Files modified:** assets/css/index.css
- **Verification:** Font files served correctly, CSS references correct paths
- **Committed in:** 891e8c7

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for Ghost theme validation and correctness. No scope creep.

## Issues Encountered

- Ghost 6.x theme validator is stricter than 5.x -- requires `author.email`, `kg-width-wide`/`kg-width-full` CSS classes, and `@page.show_title_and_feature_image` usage. All resolved inline.
- File ownership needed `chown -R ghost:ghost` after creating files as root -- Ghost process runs as `ghost` user.

## User Setup Required

None - theme is fully deployed and activated on the VPS.

## Next Phase Readiness

- Ghost theme active and rendering blog at ghost-admin.tendhunt.com
- Ready for Plan 03-03: Cloudflare Worker reverse proxy for /blog subdirectory routing
- Blog content can be created via Ghost admin at ghost-admin.tendhunt.com/ghost/
- Theme will be visible at tendhunt.com/blog once reverse proxy is configured

## Self-Check: PASSED

All 11 local files verified present. All 3 task commits verified in git log. Theme active on VPS confirmed via HTTP 200 and HTML inspection.

---
*Phase: 03-ghost-blog*
*Completed: 2026-02-11*
