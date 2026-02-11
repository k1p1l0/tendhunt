---
phase: 05-seo-polish
plan: 01
subsystem: seo
tags: [seo, open-graph, twitter-card, json-ld, structured-data, font-preload, astro-seo, sharp]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: BaseLayout, global.css, Fontsource fonts, astro-seo
  - phase: 02-content
    provides: FAQSection, WaitlistSection, page structure
provides:
  - Full SEO meta on all pages (OG, Twitter, canonical, description)
  - WebSite + Organization JSON-LD on home page
  - FAQPage JSON-LD with 7 Q&A pairs
  - 1200x630 OG image for social sharing
  - Font preloading for Space Grotesk and Inter
  - robots.txt with /api/ disallow
affects: [05-seo-polish]

# Tech tracking
tech-stack:
  added: [sharp (OG image generation)]
  patterns: [JSON-LD via set:html in Astro, font preload via Vite ?url import]

key-files:
  created:
    - landing/public/og-image.png
    - landing/scripts/generate-og-image.mjs
  modified:
    - landing/src/layouts/BaseLayout.astro
    - landing/src/pages/index.astro
    - landing/src/components/sections/FAQSection.astro
    - landing/src/pages/privacy.astro
    - landing/src/pages/terms.astro
    - landing/public/robots.txt

key-decisions:
  - "Font preload via Vite ?url import (resolves hashed _astro/ paths at build time)"
  - "JSON-LD via set:html on script tags (prevents Astro HTML escaping)"
  - "FAQPage JSON-LD dynamically generated from faqs array (always in sync with displayed content)"
  - "OG image generated programmatically with sharp from SVG (no design tool dependency)"
  - "Fontsource already sets font-display: swap -- no manual override needed"

patterns-established:
  - "SEO prop pattern: BaseLayout accepts title, description, canonicalUrl, ogImage, noindex"
  - "JSON-LD in body: valid anywhere in HTML, Google parses regardless of placement"
  - "Font preload via ?url import: Vite resolves hashed paths, works with Astro static output"

# Metrics
duration: 14min
completed: 2026-02-11
---

# Phase 5 Plan 1: SEO Polish Summary

**Full SEO meta (OG/Twitter/canonical), JSON-LD structured data (WebSite, Organization, FAQPage), font preloads, and OG image for all landing pages**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-11T15:08:01Z
- **Completed:** 2026-02-11T15:23:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Every page now has complete OG (url, description, site_name, locale, image with dimensions) and Twitter summary_large_image card meta
- Home page contains WebSite + Organization JSON-LD structured data
- FAQ section contains FAQPage JSON-LD with all 7 Q&A pairs, dynamically generated from faqs array
- 1200x630 OG image with TendHunt branding (dark bg, lime accent, tagline)
- Font preloading eliminates render-blocking for Space Grotesk and Inter variable fonts
- robots.txt blocks /api/ and references sitemap
- Privacy and Terms pages have unique meta descriptions

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance BaseLayout with full SEO meta, OG/Twitter cards, font preloads, and OG image** - `bc89ca0` (feat)
2. **Task 2: Add JSON-LD structured data (WebSite, Organization, FAQPage) and page-specific meta** - `8a4a637` (feat)

## Files Created/Modified
- `landing/src/layouts/BaseLayout.astro` - Full SEO props, OG/Twitter meta, font preloads, theme-color, favicon.ico
- `landing/src/pages/index.astro` - WebSite + Organization JSON-LD, specific description
- `landing/src/components/sections/FAQSection.astro` - FAQPage JSON-LD with dynamic generation from faqs array
- `landing/src/pages/privacy.astro` - Unique meta description
- `landing/src/pages/terms.astro` - Unique meta description
- `landing/public/og-image.png` - 1200x630 OG image (47KB PNG)
- `landing/public/robots.txt` - Added Disallow: /api/
- `landing/scripts/generate-og-image.mjs` - Sharp-based OG image generator script

## Decisions Made
- **Font preload via ?url import**: Used Vite's `?url` query to import font woff2 files in frontmatter, letting Vite resolve the hashed `/_astro/` paths at build time. This ensures preload hrefs always match the actual font file URLs.
- **JSON-LD via set:html**: Used `set:html` directive on `<script type="application/ld+json">` tags to prevent Astro from HTML-escaping the JSON content.
- **FAQPage schema from faqs array**: Generated JSON-LD dynamically from the same data array used for rendering, guaranteeing structured data stays in sync with visible content.
- **OG image via sharp SVG-to-PNG**: Generated programmatically with SVG overlay (dark background, TendHunt text, lime accent, grid pattern) converted to PNG via sharp. No external design tool needed.
- **Fontsource font-display: swap**: Confirmed Fontsource already sets `font-display: swap` in its CSS, so no manual override was needed in global.css.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All SEO foundations in place for search engine indexing
- OG image ready for social sharing previews
- JSON-LD structured data ready for Google rich results
- Ready for Phase 5 Plan 2 (remaining SEO/polish tasks)

## Self-Check: PASSED

All 9 files verified present. Both commit hashes (bc89ca0, 8a4a637) found in git log.

---
*Phase: 05-seo-polish*
*Completed: 2026-02-11*
