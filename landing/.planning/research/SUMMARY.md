# Research Summary: TendHunt Landing Page + Ghost Blog

**Domain:** SaaS marketing landing page with CMS-driven blog
**Researched:** 2026-02-11
**Overall confidence:** HIGH

## Executive Summary

TendHunt needs a high-converting static landing page at tendhunt.com and an SEO-focused blog at tendhunt.com/blog. The landing page adapts a Figma SaaS template (Getmany) into a static site deployed on Cloudflare Pages. The blog runs on Ghost Pro (managed) and is served at a subdirectory via a Cloudflare Worker reverse proxy -- this is the standard pattern for combining static marketing sites with Ghost CMS while preserving SEO domain authority.

The recommended stack is Astro 5.x for the landing page (static output, zero JS by default, React islands for interactivity) with Tailwind CSS v4 for styling. Ghost Pro handles blog content with its Lexical editor format. A Cloudflare Worker acts as a transparent reverse proxy, routing /blog/* requests to Ghost Pro while rewriting URLs to maintain the root domain. Articles are generated with AI, converted to Lexical format, and published via Ghost's Admin API (v6.0) with human review in between.

This is a well-trodden path. Astro + Cloudflare Pages is a first-class deployment target with official adapter support. Ghost's Admin API has a stable JavaScript SDK for programmatic publishing. Cloudflare Workers for subdirectory proxying is documented by both Ghost and Cloudflare, with multiple working implementations in the community. The main risk is Ghost Pro's subdirectory configuration, which requires contacting Ghost support and may depend on plan tier.

The stack is deliberately decoupled from the main Next.js app at app.tendhunt.com. They share only the domain and Tailwind design tokens. This separation means the landing page can be deployed, updated, and optimized independently without touching the authenticated app.

## Key Findings

**Stack:** Astro 5.17.x (static) + Tailwind CSS v4 + Ghost Pro + Cloudflare Pages/Workers. All current, stable, and well-documented.
**Architecture:** Static landing on Cloudflare Pages, Ghost blog proxied via Cloudflare Worker at /blog, article pipeline via Ghost Admin API with Lexical format.
**Critical pitfall:** Ghost Pro subdirectory support requires specific plan tier and Ghost support configuration. Must verify pricing and setup before committing to /blog architecture.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Landing Page Foundation** - Set up Astro project, Tailwind v4, base layout, deploy to Cloudflare Pages
   - Addresses: Project scaffold, design system, deployment pipeline
   - Avoids: Premature optimization, animation complexity

2. **Landing Page Content** - Adapt Getmany Figma template sections into Astro components with TendHunt content
   - Addresses: Hero, features, pricing, social proof, waitlist form
   - Avoids: Over-engineering interactivity (keep most sections static HTML)

3. **Ghost Blog Setup** - Configure Ghost Pro, Cloudflare Worker proxy, validate /blog routing
   - Addresses: Blog infrastructure, /blog subdirectory, Ghost Pro configuration
   - Avoids: Starting content before infrastructure is validated

4. **Blog Content Pipeline** - Build article generation scripts, publish initial SEO articles
   - Addresses: AI article generation, Lexical format conversion, Ghost Admin API publishing
   - Avoids: Manual article creation (automate the pipeline early)

5. **SEO and Polish** - Meta tags, structured data, sitemap, performance optimization, analytics
   - Addresses: Technical SEO, Open Graph, Core Web Vitals, final QA
   - Avoids: Premature analytics complexity

**Phase ordering rationale:**
- Landing page first because it has zero external dependencies (Astro + Cloudflare Pages is self-contained)
- Ghost blog setup before content because the Cloudflare Worker proxy needs validation before writing articles
- Content pipeline after blog infrastructure because you need a working Ghost instance to test against
- SEO last because it polishes what already exists

**Research flags for phases:**
- Phase 3 (Ghost Blog Setup): Needs deeper research -- Ghost Pro plan requirements for subdirectory support need direct verification with Ghost support. Cloudflare Worker proxy may need debugging for edge cases (assets, API routes, sitemap).
- Phase 1-2 (Landing): Standard patterns, unlikely to need additional research.
- Phase 4 (Content Pipeline): Lexical format generation is complex and underdocumented. May need reverse-engineering from Ghost editor output.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm + official docs + Context7. Astro 5.x, Tailwind v4, Ghost Admin API v6.0 are current stable. |
| Features | HIGH | Standard SaaS landing page patterns. Well-documented in industry. |
| Architecture | HIGH for landing, MEDIUM for Ghost proxy | Astro + Cloudflare Pages is first-class. Ghost subdirectory proxy has multiple community implementations but Ghost Pro plan requirements need verification. |
| Pitfalls | MEDIUM | Lexical format complexity and Ghost Pro plan tier are the main unknowns. |

## Gaps to Address

- **Ghost Pro plan tier for subdirectory:** Official docs say "Business plan" but pricing has been restructured. Contact Ghost support before Phase 3.
- **Lexical format generation at scale:** The Lexical JSON structure is not well-documented for programmatic generation. Phase 4 research should include reverse-engineering Ghost's editor output.
- **Cloudflare Worker + Ghost Pro interaction:** While the proxy pattern is well-documented for self-hosted Ghost, Ghost Pro's managed infrastructure may have specific header or SSL requirements. Test early in Phase 3.
- **Ghost sitemap at /blog/sitemap.xml:** Need to verify the Worker correctly proxies Ghost's sitemap and that Google can crawl it at the subdirectory path.
