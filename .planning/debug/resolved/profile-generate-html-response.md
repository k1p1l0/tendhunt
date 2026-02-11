---
status: resolved
trigger: "The /api/profile/generate endpoint returns HTML (Next.js error page) instead of JSON when called with company info"
created: 2026-02-11T00:00:00Z
updated: 2026-02-11T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: Build succeeds, middleware now allows onboarding API routes through
expecting: N/A
next_action: Archive session

## Symptoms

expected: Step 2 of onboarding wizard calls POST /api/profile/generate with companyInfo (website + social links, no documents) and receives a JSON profile response
actual: The API returns HTML (Next.js error page) instead of JSON. The frontend tries to JSON.parse the HTML response and throws "Unexpected token '<'"
errors: "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" — shown in the onboarding wizard step 2
reproduction: Go to /onboarding, enter company name + website URL + LinkedIn social link (no document uploads), click Continue. Step 2 shows "Generation Failed" with the JSON parse error.
started: Started immediately after 03-03 plan (company info + web content enrichment). The original 03-02 code worked with document-only flow.

## Eliminated

- hypothesis: output_config parameter on Anthropic SDK is invalid/unsupported
  evidence: SDK v0.74.0 types confirm OutputConfig with JSONOutputFormat { type: 'json_schema', schema: {...} } is a valid parameter on MessageCreateParamsBase (line 1059 of messages.d.ts). The code's usage matches the SDK types exactly.
  timestamp: 2026-02-11T00:00:30Z

- hypothesis: Module-level import/compilation error prevents route from loading
  evidence: "next build" compiles successfully with route /api/profile/generate listed. No source-level compilation errors.
  timestamp: 2026-02-11T00:00:40Z

- hypothesis: Missing ANTHROPIC_API_KEY causes module-level crash
  evidence: Key is present in .env.local
  timestamp: 2026-02-11T00:00:45Z

## Evidence

- timestamp: 2026-02-11T00:00:30Z
  checked: Anthropic SDK v0.74.0 type definitions (node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts)
  found: output_config is a valid parameter; OutputConfig = { effort?, format?: JSONOutputFormat | null }; JSONOutputFormat = { schema: { [key: string]: unknown }, type: 'json_schema' }. Code usage matches exactly.
  implication: The output_config parameter is NOT the cause.

- timestamp: 2026-02-11T00:00:40Z
  checked: "next build" output
  found: Build succeeds. Route /api/profile/generate is listed as dynamic (f). No errors.
  implication: Not a compilation/build issue.

- timestamp: 2026-02-11T00:00:50Z
  checked: src/proxy.ts (Clerk middleware)
  found: Middleware intercepts /(api|trpc)(.*) requests. Logic: (1) isPublicRoute checks /, /sign-in, /sign-up, /api/webhooks -- /api/profile/generate is NOT public. (2) isOnboardingRoute checks /onboarding(.*) -- /api/profile/generate does NOT match. (3) If onboardingComplete is falsy, redirect to /onboarding. During onboarding flow, onboardingComplete is false, so the API call gets 302-redirected to /onboarding HTML page.
  implication: THIS IS THE ROOT CAUSE.

- timestamp: 2026-02-11T00:00:55Z
  checked: src/components/onboarding/onboarding-wizard.tsx
  found: Step 2 useEffect calls fetch("/api/profile/generate", { method: "POST", ... }). fetch follows redirects by default, receives HTML from /onboarding, JSON.parse fails.
  implication: Confirms the full chain: middleware redirect -> HTML response -> JSON parse error.

## Resolution

root_cause: Clerk middleware in src/proxy.ts redirects /api/profile/generate to /onboarding because the route is not in the isOnboardingRoute matcher, and the user's onboardingComplete metadata is false during onboarding. The middleware returns a 302 redirect to /onboarding, fetch follows it, and the frontend receives HTML instead of JSON.
fix: Expanded isOnboardingRoute matcher in src/proxy.ts to include /api/profile(.*) and /api/upload(.*) alongside /onboarding(.*). These API routes are used during the onboarding flow and must be accessible before onboarding is complete.
verification: next build compiles successfully with no errors. The middleware now allows authenticated users to access onboarding-related API routes regardless of onboardingComplete status.
files_changed:
- src/proxy.ts
