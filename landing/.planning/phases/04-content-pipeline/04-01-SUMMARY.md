---
phase: 04-content-pipeline
plan: 01
subsystem: content-pipeline
tags: [anthropic, claude, pillow, ghost-api, python, seo, thumbnails]

# Dependency graph
requires:
  - phase: 03-ghost-blog
    provides: Ghost CMS deployed at ghost-admin.tendhunt.com with Admin API
provides:
  - Python content pipeline scripts (generate, thumbnail, publish, orchestrate)
  - Anthropic Claude article generation with frontmatter validation
  - Pillow-based branded 1200x630 thumbnail generator
  - Ghost Admin API publisher with JWT auth and ?source=html Lexical conversion
  - Ghost Admin API integration (Content Pipeline) with admin key
  - 10 SEO article topic configs for UK procurement
affects: [04-content-pipeline-plan-02, content-generation, ghost-publishing]

# Tech tracking
tech-stack:
  added: [anthropic, pillow, pyjwt, python-frontmatter, python-slugify, markdown, beautifulsoup4, requests, python-dotenv]
  patterns: [python-cli-pipeline, ghost-jwt-auth, kg-card-html-wrapping, branded-thumbnail-generation]

key-files:
  created:
    - landing/content-pipeline/config.py
    - landing/content-pipeline/generate_articles.py
    - landing/content-pipeline/generate_thumbnails.py
    - landing/content-pipeline/publish_to_ghost.py
    - landing/content-pipeline/pipeline.py
    - landing/content-pipeline/templates/article_prompt.txt
    - landing/content-pipeline/requirements.txt
    - landing/content-pipeline/.env.example
    - landing/content-pipeline/.gitignore
  modified: []

key-decisions:
  - "Anthropic Claude Sonnet 4.5 for article generation (user override from plan's OpenAI GPT-4o)"
  - "Python 3.11 venv (system 3.9.6 too old for anthropic SDK >=0.43)"
  - "Variable TTF fonts from google/fonts GitHub repo (Google Fonts download URL returns HTML, not zip)"
  - "Ghost Admin API integration created programmatically via session auth + REST API"
  - "Ghost Admin API key format: secret field already contains id:hexsecret"

patterns-established:
  - "Ghost session auth: POST /ghost/api/admin/session/ with email+password, then use session cookies for admin operations"
  - "Ghost integration creation: POST /ghost/api/admin/integrations/ with session, extract admin key from api_keys[type=admin].secret"
  - "kg-card HTML wrapping: <!--kg-card-begin: html--> wrapper for lossless Lexical conversion via ?source=html"
  - "Anthropic messages API: system prompt as system param, user prompt in messages array, response in content[0].text"

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 4 Plan 01: Content Pipeline Summary

**Python content pipeline with Anthropic Claude Sonnet 4.5 article generation, Pillow branded thumbnails, and Ghost Admin API publishing via JWT auth**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-11T14:03:46Z
- **Completed:** 2026-02-11T14:08:21Z
- **Tasks:** 1 (of 2 -- checkpoint at Task 2)
- **Files committed:** 9

## Accomplishments
- Complete Python content pipeline with 4 stage scripts (generate, thumbnail, publish, orchestrate)
- Article generator using Anthropic Claude Sonnet 4.5 with frontmatter validation and retry
- Branded thumbnail generator producing 1200x630 PNG with dark theme, grid, accent bar, tag pill, title, brand mark
- Ghost Admin API publisher with JWT authentication, image upload, and ?source=html for Lexical conversion
- Ghost Admin API integration created programmatically (no manual dashboard step needed)
- 10 SEO article topics configured for UK procurement content
- TTF fonts downloaded (Space Grotesk Bold, Inter Regular) from Google Fonts GitHub

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Python pipeline scripts** - `d843c48` (feat)

## Files Created/Modified
- `landing/content-pipeline/config.py` - Shared configuration (Ghost URL, brand colors, font paths, ANTHROPIC_API_KEY)
- `landing/content-pipeline/generate_articles.py` - AI article generation using Anthropic Claude Sonnet 4.5
- `landing/content-pipeline/generate_thumbnails.py` - Pillow-based branded 1200x630 thumbnail generation with font auto-download
- `landing/content-pipeline/publish_to_ghost.py` - Ghost Admin API integration (JWT auth, image upload, post creation with ?source=html)
- `landing/content-pipeline/pipeline.py` - End-to-end pipeline orchestrator with 10 SEO article topics
- `landing/content-pipeline/templates/article_prompt.txt` - System prompt for UK procurement content writing
- `landing/content-pipeline/requirements.txt` - Python dependencies (anthropic, pillow, pyjwt, etc.)
- `landing/content-pipeline/.env.example` - Environment variable template
- `landing/content-pipeline/.gitignore` - Excludes .env, .venv, articles/, thumbnails/, fonts/*.ttf

## Decisions Made
- **Anthropic over OpenAI**: User explicitly requested Claude Sonnet 4.5 instead of GPT-4o for article generation
- **Python 3.11**: System Python 3.9.6 is incompatible with anthropic SDK >=0.43 (requires >=3.8 but newer versions need >=3.9); used /usr/local/bin/python3.11
- **Variable TTF fonts from GitHub**: Google Fonts download URL (fonts.google.com/download?family=) returns HTML redirect, not a zip file; used raw.githubusercontent.com from google/fonts repo instead
- **Programmatic Ghost integration creation**: Created Ghost Admin API integration via session-based REST API calls instead of requiring manual dashboard configuration
- **Ghost admin key format**: The API returns the secret field already in `id:hexsecret` format, not separate fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OpenAI to Anthropic Claude API migration**
- **Found during:** Task 1 (code review of existing files)
- **Issue:** All existing scripts used OpenAI GPT-4o (from original plan). User explicitly requested Anthropic Claude.
- **Fix:** Rewrote generate_articles.py to use anthropic.Anthropic().messages.create(), updated config.py (ANTHROPIC_API_KEY), requirements.txt (anthropic>=0.43), .env.example
- **Files modified:** generate_articles.py, config.py, requirements.txt, .env.example
- **Verification:** Module imports cleanly, anthropic SDK v0.79.0 installed
- **Committed in:** d843c48

**2. [Rule 3 - Blocking] Python 3.11 required for anthropic SDK**
- **Found during:** Task 1 (venv creation)
- **Issue:** System Python 3.9.6 could not install anthropic>=0.43 (newer versions require >=3.9, but available versions on PyPI for 3.9 only went up to 0.38.0)
- **Fix:** Used /usr/local/bin/python3.11 to create the venv instead of /usr/bin/python3
- **Files modified:** None (runtime change only)
- **Verification:** pip install succeeded, all modules import cleanly
- **Committed in:** d843c48

**3. [Rule 3 - Blocking] Google Fonts download URL returns HTML instead of zip**
- **Found during:** Task 1 (font download)
- **Issue:** fonts.google.com/download?family= returns an HTML page, not a zip file, when accessed programmatically
- **Fix:** Downloaded variable TTF fonts directly from raw.githubusercontent.com/google/fonts/main/ofl/
- **Files modified:** fonts/SpaceGrotesk-Bold.ttf, fonts/Inter-Regular.ttf (gitignored)
- **Verification:** Fonts load in Pillow, test thumbnail generates correctly at 1200x630
- **Committed in:** d843c48

**4. [Rule 2 - Missing Critical] Programmatic Ghost Admin API integration creation**
- **Found during:** Task 1 (plan specified manual dashboard step)
- **Issue:** Plan required user to manually create Ghost integration via browser. User provided Ghost credentials, enabling automation.
- **Fix:** Created integration via Ghost session auth API (POST /ghost/api/admin/session/ then POST /ghost/api/admin/integrations/)
- **Files modified:** .env (created with GHOST_ADMIN_KEY)
- **Verification:** JWT auth test returns status 200 with site title "TendHunt Blog"
- **Committed in:** d843c48

---

**Total deviations:** 4 auto-fixed (1 bug fix, 2 blocking issues, 1 missing critical)
**Impact on plan:** All auto-fixes were necessary for correctness and functionality. The OpenAI-to-Anthropic change was explicitly requested by the user. No scope creep.

## Issues Encountered
- Google Fonts programmatic download no longer works via direct URL -- resolved by using GitHub raw content URLs
- System Python 3.9.6 too old for modern anthropic SDK -- resolved by using Python 3.11

## User Setup Required

**ANTHROPIC_API_KEY must be added to .env before running the pipeline.**

The `.env` file at `landing/content-pipeline/.env` has been created with:
- GHOST_URL (configured)
- GHOST_ADMIN_KEY (configured and verified working)
- ANTHROPIC_API_KEY (placeholder -- user must provide)

## Next Phase Readiness
- Pipeline scripts ready to generate articles once ANTHROPIC_API_KEY is configured
- Thumbnail generation fully functional (no API key needed)
- Ghost API connectivity verified (status 200)
- Plan 04-02 can execute article generation and batch publishing

## Self-Check: PASSED

All 9 committed files verified present. Commit `d843c48` verified in git log. SUMMARY.md verified at expected path.

---
*Phase: 04-content-pipeline*
*Completed: 2026-02-11*
