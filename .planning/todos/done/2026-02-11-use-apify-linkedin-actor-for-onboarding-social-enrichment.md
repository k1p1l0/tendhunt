---
created: 2026-02-11T02:28:07.062Z
title: Use Apify LinkedIn actor for onboarding social enrichment
area: api
files:
  - src/app/api/profile/generate/route.ts
  - src/lib/extract-web-info.ts
  - src/components/onboarding/company-info-form.tsx
---

## Problem

LinkedIn blocks server-side fetches (login walls), so `fetchWebContent` returns null for LinkedIn URLs. We need a reliable way to extract company data from LinkedIn during onboarding to enrich the AI profile generation.

Additionally, the social links form currently supports 5 platforms (LinkedIn, X/Twitter, Facebook, Instagram, Other). For the MVP, we should simplify to **LinkedIn only** since it's the most valuable source for B2B/procurement company profiles.

## Solution

1. Use Apify actor `harvestapi/linkedin-company-posts` to scrape LinkedIn company page data
   - Call via Apify MCP tools or HTTP API when a LinkedIn URL is provided during onboarding
   - Extract company description, industry, employee count, specialties, etc.
   - Feed extracted data into the Claude profile generation prompt alongside website content

2. Simplify social links in onboarding to **LinkedIn only**:
   - Replace the dynamic multi-platform social links form with a single "LinkedIn Company URL" input field
   - Remove the platform Select dropdown (no longer needed)
   - Update CompanyProfile schema: replace `socialLinks` array with `linkedinUrl: String` (or keep socialLinks but only show LinkedIn in the UI)

3. Update `/api/profile/generate` to:
   - Detect LinkedIn URL → call Apify actor instead of `fetchWebContent`
   - Include Apify-extracted LinkedIn data in the Claude prompt context
