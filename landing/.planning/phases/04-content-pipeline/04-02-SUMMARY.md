---
phase: 04-content-pipeline
plan: 02
subsystem: content-pipeline
tags: [anthropic, claude, ghost-api, seo, internal-links, publishing, pillow, thumbnails]

# Dependency graph
requires:
  - phase: 04-content-pipeline-plan-01
    provides: Python content pipeline scripts, Ghost Admin API integration, Anthropic Claude config
  - phase: 03-ghost-blog
    provides: Ghost CMS deployed at ghost-admin.tendhunt.com, Cloudflare Worker proxy at tendhunt.com/blog
provides:
  - 10 published SEO articles at tendhunt.com/blog/{slug}
  - Branded 1200x630 thumbnails for each article
  - Internal link network between all articles
  - add_internal_links.py script for post-processing and bulk publishing
  - published.json manifest tracking all Ghost post IDs and URLs
affects: [seo, landing-page, ghost-blog, content-marketing]

# Tech tracking
tech-stack:
  added: []
  patterns: [ghost-post-update-with-collision-detection, tag-based-related-article-matching, contextual-inline-linking, bulk-publish-via-admin-api]

key-files:
  created:
    - landing/content-pipeline/add_internal_links.py
    - landing/content-pipeline/output/published.json
    - landing/content-pipeline/articles/*.md (10 articles, gitignored)
    - landing/content-pipeline/thumbnails/*.png (10 thumbnails, gitignored)
  modified:
    - landing/content-pipeline/.gitignore

key-decisions:
  - "Published directly as published (not draft) per user request for hackathon demo speed"
  - "Ghost collision detection via GET updated_at then PUT with same value for safe concurrent updates"
  - "Tag-based related article matching (shared tag count) for internal link suggestions"
  - "Max 2 contextual inline links + 3 related article footer links per article"

patterns-established:
  - "Ghost PUT update pattern: GET post for updated_at, then PUT with updated_at for collision detection"
  - "Internal linking: tag overlap scoring to find related articles, regex keyword matching for inline links"
  - "Idempotent link injection: strip existing Related Articles and CTA sections before re-adding"

# Metrics
duration: 15min
completed: 2026-02-11
---

# Phase 4 Plan 02: Content Pipeline Execution Summary

**10 SEO articles on UK procurement generated via Claude Sonnet 4.5, with branded thumbnails, internal cross-links, and published live at tendhunt.com/blog/**

## Performance

- **Duration:** ~15 min (article generation dominated by API latency)
- **Started:** 2026-02-11T14:12:50Z
- **Completed:** 2026-02-11T14:28:00Z
- **Tasks:** 3/3
- **Files committed:** 3 (add_internal_links.py, published.json, .gitignore)

## Accomplishments
- Generated 10 SEO-optimised articles (2500-2800 words each) targeting UK procurement keywords
- Created 10 branded 1200x630 PNG thumbnails with dark theme, accent bar, tag pill, and title
- Published all 10 articles to Ghost with feature images, meta descriptions, and 3 tags each
- Added internal link network: 2 contextual inline links + 3 Related Articles footer links per article
- Added TendHunt CTA with waitlist link at the end of every article
- All articles live and accessible at tendhunt.com/blog/{slug}

## Published Articles

| # | Slug | URL |
|---|------|-----|
| 1 | complete-guide-procurement-act-2023-suppliers | tendhunt.com/blog/complete-guide-procurement-act-2023-suppliers/ |
| 2 | how-to-find-uk-government-tenders-2026 | tendhunt.com/blog/how-to-find-uk-government-tenders-2026/ |
| 3 | public-sector-tender-portals-uk-suppliers-must-track | tendhunt.com/blog/public-sector-tender-portals-uk-suppliers-must-track/ |
| 4 | understanding-uk-government-procurement-frameworks | tendhunt.com/blog/understanding-uk-government-procurement-frameworks/ |
| 5 | how-small-businesses-win-government-contracts-uk | tendhunt.com/blog/how-small-businesses-win-government-contracts-uk/ |
| 6 | what-is-buyer-intelligence-public-procurement | tendhunt.com/blog/what-is-buyer-intelligence-public-procurement/ |
| 7 | uk-public-procurement-statistics-market-size-trends | tendhunt.com/blog/uk-public-procurement-statistics-market-size-trends/ |
| 8 | how-to-write-winning-tender-response | tendhunt.com/blog/how-to-write-winning-tender-response/ |
| 9 | cpv-codes-explained-procurement-categories | tendhunt.com/blog/cpv-codes-explained-procurement-categories/ |
| 10 | procurement-act-2023-timeline-what-changed-when | tendhunt.com/blog/procurement-act-2023-timeline-what-changed-when/ |

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate articles, thumbnails, publish as drafts** - `9f17166` + `2eec48a` (feat, cleanup)
2. **Task 2: Add internal links and update Ghost posts** - `7c35c9c` (feat)
3. **Task 3: Publish all drafts to live** - `adbc69d` (feat)

## Files Created/Modified
- `landing/content-pipeline/add_internal_links.py` - Post-processing script for internal links, CTA injection, and bulk publishing
- `landing/content-pipeline/output/published.json` - Manifest of all 10 published Ghost posts with IDs, slugs, and URLs
- `landing/content-pipeline/.gitignore` - Updated to track published.json while keeping articles/thumbnails gitignored
- `landing/content-pipeline/articles/*.md` - 10 markdown articles with frontmatter (gitignored, runtime output)
- `landing/content-pipeline/thumbnails/*.png` - 10 branded PNG thumbnails (gitignored, runtime output)

## Decisions Made
- **Published directly (not draft):** User requested immediate publishing for hackathon demo, skipping the planned manual review checkpoint
- **Ghost collision detection:** Used GET-then-PUT pattern with updated_at field to safely update posts without data loss
- **Tag-based related articles:** Matched articles by shared tag count (all have 3 tags), selecting top 3 by overlap
- **Inline link strategy:** Used multi-word phrase matching from target titles, falling back to single keywords, limiting to 2 inline links to avoid over-linking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate Ghost posts from parallel pipeline runs**
- **Found during:** Task 1 (post-pipeline verification)
- **Issue:** The pipeline ran twice (once in background, once in foreground) creating duplicate posts with slightly different slugs
- **Fix:** Reconciled published.json with Ghost's actual state, deleted 2 duplicate posts, cleaned up duplicate article/thumbnail files on disk
- **Files modified:** output/published.json
- **Verification:** All 10 Ghost posts accessible by ID, no duplicates remain
- **Committed in:** 9f17166

**2. [Rule 3 - Blocking] Checkpoint override for direct publishing**
- **Found during:** Task 3 (plan specifies checkpoint:human-verify)
- **Issue:** Plan required manual review before publishing, but user explicitly requested direct publishing for hackathon speed
- **Fix:** Executed publish_all_drafts() directly without pausing at checkpoint
- **Files modified:** output/published.json (status updated to "published")
- **Verification:** All 10 articles return HTTP 200 at tendhunt.com/blog/{slug}/
- **Committed in:** adbc69d

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking)
**Impact on plan:** Duplicate cleanup was necessary from parallel execution. Checkpoint skip was explicitly requested by user. No scope creep.

## Issues Encountered
- Background pipeline execution produced no visible output for 2+ minutes (Python stdout buffering). Resolved by running with `-u` flag for unbuffered output.
- First pipeline run from test + second from full run created duplicate posts with different slugs. Resolved by reconciling against Ghost API and deleting duplicates.

## User Setup Required
None - all articles published and live. No additional configuration needed.

## Next Phase Readiness
- 10 SEO articles live at tendhunt.com/blog/ with full internal link network
- Blog homepage at tendhunt.com/blog/ shows all published articles
- Content pipeline fully operational for future article generation
- add_internal_links.py can be re-run to update links or publish new batches
- Phase 4 (Content Pipeline) complete -- ready for Phase 5

## Self-Check: PASSED

All key files verified present:
- add_internal_links.py: FOUND
- output/published.json: FOUND (10 entries, all status=published)
- .gitignore: FOUND (updated)
- 04-02-SUMMARY.md: FOUND
- Articles on disk: 10
- Thumbnails on disk: 10

Commits verified in git log:
- 9f17166: FOUND (Task 1 initial)
- 2eec48a: FOUND (Task 1 cleanup)
- 7c35c9c: FOUND (Task 2)
- adbc69d: FOUND (Task 3)

All 10 articles return HTTP 200 at tendhunt.com/blog/{slug}/.
