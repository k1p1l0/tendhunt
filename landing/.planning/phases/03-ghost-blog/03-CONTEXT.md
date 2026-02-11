# Phase 3: Ghost Blog Setup - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Ghost 5.x blog running at tendhunt.com/blog via Cloudflare Worker reverse proxy. Visitors see the blog as a seamless part of the main site. Ghost admin accessible via separate subdomain. Includes RSS feed proxied at /blog/rss/.

Content pipeline (AI article generation, Lexical conversion) and SEO polish are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Ghost Hosting
- Self-hosted on Hetzner VPS (CX22 ~€4/mo) with Cloudflare DNS + proxy in front
- Budget: $10-25/mo total for Ghost infrastructure
- Maintenance: minimal (set and forget) — configure auto-updates, monitoring alerts
- Ghost runs as Node.js on VPS, not on Cloudflare Workers (Workers can't run Ghost)

### Blog Design & Branding
- Seamless extension of the landing page — same header, footer, fonts, color palette
- Custom Ghost theme built to match the Notus/TendHunt landing page design system
- Full landing navigation in blog header (logo, Features, Pricing, etc. — links back to landing)
- Dark mode: auto-detect system preference (prefers-color-scheme), no manual toggle

### /blog Routing & Proxy
- Cloudflare Worker reverse proxy rewrites /blog/* requests to Ghost origin server
- Ghost admin panel on separate subdomain (e.g., ghost-admin.tendhunt.com) — blocked on public domain
- All blog assets (images, CSS, JS) served through Cloudflare proxy — rewritten to tendhunt.com/blog/... URLs, CF cached, no mixed origins
- RSS feed proxied at tendhunt.com/blog/rss/
- Canonical URLs, OG tags, sitemap all reference tendhunt.com/blog/...

### URL Structure
- Claude's Discretion — pick whatever Ghost supports best with the proxy (likely flat /blog/{slug})

### Initial Content Strategy
- Primary goal: SEO traffic + investor credibility equally
- 5-10 articles at launch — solid foundation covering key UK procurement topics
- Tone: data-driven & analytical — stats-heavy, research-backed, authoritative
- Categories: Claude's Discretion — pick based on what ranks for UK procurement keywords

### Claude's Discretion
- URL structure (flat vs category-based)
- Blog content categories and tag taxonomy
- Ghost theme base (start from scratch vs fork Casper)
- VPS setup details (Ubuntu version, Node version, SSL approach)
- Monitoring/alerting setup for uptime

</decisions>

<specifics>
## Specific Ideas

- Blog should look indistinguishable from the landing page — visitor shouldn't realize they've left the main site
- Ghost admin on a separate subdomain keeps the public-facing site clean and secure
- Cloudflare caching all assets means the VPS only serves origin traffic, keeping it fast and cheap
- Data-driven tone matches the "procurement intelligence" brand positioning — not a generic business blog

</specifics>

<deferred>
## Deferred Ideas

- AI article generation pipeline — Phase 4
- Thumbnail/featured image generation — Phase 4
- SEO audit and structured data — Phase 5
- Comment system on blog posts — not in scope, add to backlog if needed

</deferred>

---

*Phase: 03-ghost-blog*
*Context gathered: 2026-02-11*
