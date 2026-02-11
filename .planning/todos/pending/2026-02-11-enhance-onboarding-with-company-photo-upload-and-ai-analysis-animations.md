---
created: 2026-02-11T04:27:28.918Z
title: Enhance onboarding with company photo upload and AI analysis animations
area: ui
files:
  - src/app/(dashboard)/onboarding/page.tsx
  - src/app/api/onboarding/generate-profile/route.ts
  - src/components/onboarding/
---

## Problem

The onboarding flow (Phase 3) currently generates a company profile from uploaded documents without visual feedback during the AI analysis step. Users see a basic loading state while AI processes their company data, which misses the opportunity to convey intelligence and build trust in the AI-powered features.

Two enhancements needed:

1. **Company photo upload** — After the first onboarding step, allow users to upload a company logo/photo. Save it to Cloudflare R2 (presigned URL upload pattern already exists from Phase 3 document uploads). This photo would appear on their company profile and dashboard.

2. **AI analysis animations** — During the AI profile generation step, replace the basic loading state with rich AI-themed animations that show what the system is doing. Reference implementations from shadcn:
   - **Reasoning animation** (https://www.shadcn.io/ai/reasoning) — Show step-by-step reasoning as AI analyzes documents
   - **Task animation** (https://www.shadcn.io/ai/task) — Show AI completing discrete tasks (extracting sectors, identifying capabilities, finding keywords)
   - **Chain of thought** (https://www.shadcn.io/ai/chain-of-thought) — Progressive reveal of AI thinking process

   The goal is to give the feeling of AI intelligence when generating the company profile — detailed steps like "Analyzing uploaded documents...", "Extracting industry sectors...", "Identifying core capabilities...", "Generating ideal contract description..." with animated transitions.

## Solution

1. **Company photo**: Add a step after document upload in the onboarding wizard. Reuse the R2 presigned URL upload pattern from `src/app/api/onboarding/upload/route.ts`. Store the photo URL in the CompanyProfile model (add `logoUrl` field). Display in profile review step and dashboard header.

2. **AI animations**: Study the three shadcn/ui AI patterns and implement a composite animation component:
   - Fetch the actual implementation from the shadcn references
   - Create an `AIAnalysisProgress` component that sequences through named tasks
   - Wire it to the profile generation API call — either with real streaming progress or simulated steps timed to match average generation duration
   - Consider using Server-Sent Events or a polling approach for real-time progress updates from the AI generation endpoint
