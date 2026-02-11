---
created: 2026-02-11T01:52:37.585Z
title: Add company info fields to onboarding step 1
area: ui
files:
  - src/components/onboarding/onboarding-wizard.tsx
  - src/components/onboarding/document-dropzone.tsx
  - src/app/api/profile/generate/route.ts
  - src/models/company-profile.ts
  - src/app/onboarding/_actions.ts
---

## Problem

Onboarding step 1 currently only has the document dropzone. For better AI profile generation, the user should also provide basic company information alongside documents:

- **Company name** (text input)
- **Website URL** (text input)
- **Address** (text input)
- **Social links**: LinkedIn, X/Twitter, and other platforms (text inputs)

This data serves two purposes:
1. Feeds into the AI profile generation prompt alongside extracted document text, producing a richer and more accurate company profile
2. Can be used to scrape/parse public info from the website and social profiles for additional context

Currently the AI generation endpoint (`/api/profile/generate`) only receives `documentKeys`. It needs to also receive these company info fields to include in the Claude prompt.

## Solution

1. Add form fields (company name, website, address, social links) above or below the document dropzone in step 1
2. Pass these fields through wizard state to the AI generation endpoint
3. Update `/api/profile/generate` to accept and include company info in the Claude prompt
4. Update CompanyProfile model if needed (website, address, socialLinks fields)
5. Consider optional website scraping to enrich the AI prompt (could be a stretch goal)
