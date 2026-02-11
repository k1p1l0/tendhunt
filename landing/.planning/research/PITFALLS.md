# Pitfalls Research

**Domain:** SaaS Landing Page + Ghost Blog SEO (UK Procurement Intelligence)
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH (verified via official Ghost docs, Cloudflare docs, community post-mortems, and Google guidelines)

## Critical Pitfalls

### Pitfall 1: Ghost Pro Subdirectory Requires Business Plan ($199/mo + $50/mo add-on)

**What goes wrong:**
Ghost Pro's official subdirectory support is a paid add-on exclusively for the Business plan ($199/mo), costing an additional $50/mo. The project plan references Ghost Pro Starter ($9/mo -- now $15-18/mo after July 2025 price increase), which does NOT support subdirectories. Attempting to use Cloudflare Workers as a workaround with Ghost Pro has a known failure mode: Cloudflare detects Ghost Pro CNAME records and locks you out of proxy controls for that subdomain because Ghost has an Enterprise agreement with Cloudflare.

**Why it happens:**
Ghost's Enterprise Cloudflare partnership means Ghost Pro domains get special treatment in Cloudflare's system. Standard Cloudflare Worker reverse proxy approaches that work for self-hosted Ghost silently fail or get blocked for Ghost Pro domains.

**How to avoid:**
Two viable paths:
1. **Self-host Ghost on a $6/mo VPS** (DigitalOcean/Hetzner) + Cloudflare Workers reverse proxy. This is what the Indie Hackers post-mortem recommends after failing with Ghost Pro. Full control over DNS, no Cloudflare lockout.
2. **Use Ghost Pro with a subdomain** (blog.tendhunt.com) instead of subfolder (/blog). Less SEO-optimal but zero proxy complexity. Still benefits from Ghost Pro's managed hosting.

Recommendation: Self-host Ghost. The $6/mo VPS is cheaper than Ghost Pro Starter ($15/mo), gives full API access, and eliminates the Cloudflare CNAME lockout problem entirely.

**Warning signs:**
- Cloudflare DNS settings for Ghost CNAME show locked/greyed-out proxy toggle
- Blog pages return 521/522 errors after enabling Cloudflare proxy
- SSL certificates fail to renew after ~90 days
- Ghost admin panel at yourdomain.com/blog/ghost returns 404

**Phase to address:**
Infrastructure setup phase (first phase). This decision gates everything else -- blog content, SEO strategy, and the entire /blog subfolder approach.

---

### Pitfall 2: Cloudflare Worker URL Rewriting Misses Canonical URLs, Sitemaps, and Internal Links

**What goes wrong:**
When using Cloudflare Workers to reverse-proxy Ghost into a /blog subfolder, Ghost still generates all URLs pointing to the original subdomain (e.g., blog.tendhunt.com). This includes canonical tags, Open Graph URLs, sitemap.xml entries, internal post links, and RSS feed URLs. If these are not rewritten at the edge, Google indexes duplicate content across both the subdomain and subfolder, splitting domain authority -- the exact opposite of what the subfolder approach intends.

**Why it happens:**
Ghost has no concept of running at a subpath. It generates absolute URLs based on its configured domain. The Worker must intercept and rewrite all HTML responses, XML sitemaps, and JSON-LD structured data. Simple string replacement (subdomain -> root/blog) misses edge cases: asset URLs that should NOT be rewritten, URLs inside JavaScript, and URLs in RSS/XML that need different path transformations.

**How to avoid:**
1. Use `HTMLRewriter` in Cloudflare Workers (not naive string replace) to selectively rewrite:
   - `<link rel="canonical">` href
   - `<meta property="og:url">` content
   - `<a>` hrefs for internal links (but NOT external links)
   - `<loc>` tags in sitemap.xml
   - JSON-LD `@id` and `url` fields in structured data
2. Create a separate Worker route for sitemap.xml that rewrites XML content
3. Validate with: `curl -IL -H 'x-ghost-proxy:true' https://tendhunt.com/blog` -- response should show `x-ghost-proxy: VALID`
4. After deployment, run Google's Rich Results Test and check canonical URL matches the subfolder path

**Warning signs:**
- Google Search Console shows "Duplicate without user-selected canonical" warnings
- Sitemap URLs point to blog.tendhunt.com instead of tendhunt.com/blog
- Social media share previews show wrong URL
- Two versions of pages appear in Google index (subdomain + subfolder)

**Phase to address:**
Infrastructure setup phase. Must be solved BEFORE publishing any content, or you accumulate bad canonical signals that take weeks to correct.

---

### Pitfall 3: Ghost Admin API Lexical Format Double-Encoding and Image Loss

**What goes wrong:**
The article pipeline (AI generation -> Ghost publish via API) hits two API landmines:
1. **Double JSON encoding:** The Lexical field is `JSON.stringify`-ed inside the already-JSON request body. Missing this nesting causes silent failures where posts appear to create but have empty content.
2. **Image stripping:** When using `?source=html` to let Ghost convert HTML to Lexical, images (`<img>` tags) get stripped out if the HTML structure is not well-formed. Ghost issue #18448 documents this explicitly.
3. **Lossy conversion:** Ghost's HTML-to-Lexical conversion is explicitly documented as "lossy" -- the rendered HTML may differ from source HTML.

**Why it happens:**
Ghost 5.x migrated from MobileDoc to Lexical, but the API's HTML conversion layer was built as a best-effort translator. Complex HTML (nested lists, tables, figures with captions, images inside paragraphs) does not convert cleanly.

**How to avoid:**
1. **Use the HTML card wrapper for lossless content:** Wrap article HTML in `<!--kg-card-begin: html-->YOUR_HTML<!--kg-card-end: html-->` to preserve it exactly without Lexical conversion. This is the recommended approach for programmatic publishing.
2. **For richer Lexical-native content**, construct Lexical JSON directly using the `lexical` field (not `html`). This is harder but gives full control.
3. **Always test the pipeline** with a draft post first (`"status": "draft"`) before publishing.
4. **Include `updated_at` timestamp** in PUT requests to avoid version conflict rejection.
5. **Validate images appear** by fetching the created post via Content API and checking rendered HTML.

**Warning signs:**
- Posts appear in Ghost admin but body is empty or shows raw JSON
- Published articles missing all images
- HTML formatting differences between source and published version (extra `<br>` tags, lost list nesting)
- API returns 200 but content doesn't update (missing `updated_at` or wrong content field)

**Phase to address:**
Content pipeline phase. Build and test the API integration before scaling to 5-10 articles.

---

### Pitfall 4: AI-Generated Content Triggers Google "Scaled Content Abuse" Penalty

**What goes wrong:**
Publishing 5-10 AI-generated articles at launch without sufficient human editing triggers Google's "scaled content abuse" manual action. This does not require hundreds of articles -- Google's SpamBrain specifically looks for clusters of thin, template-driven, AI-generated content that lacks E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness). UK procurement is a niche with YMYL (Your Money, Your Life) adjacent signals since it involves government contracts and business decisions.

**Why it happens:**
AI articles share telltale patterns: similar sentence structure, generic examples, lack of specific data/case studies, no author experience signals. When published in a batch on a brand-new domain with zero authority, these signals compound. Google does not penalize AI content per se, but it penalizes content that is "not helpful to users" -- and batch-published AI content on a new domain is the textbook case.

**How to avoid:**
1. **Human editing is mandatory, not optional.** Each article needs: specific UK procurement data (contract values, real tender examples), author byline with real expertise signals, unique analysis not just restated facts.
2. **Stagger publication.** Do not publish all 5-10 articles at once. Publish 1-2 per week over 4-6 weeks. This mimics natural editorial cadence.
3. **Add E-E-A-T signals to every article:**
   - Author bio with procurement experience/credentials
   - Links to primary sources (Contracts Finder, Find a Tender, legislation.gov.uk)
   - Specific examples with real contract references
   - Statistics from official sources (Cabinet Office data, NAO reports)
4. **Create author schema markup** in Ghost using Code Injection for structured data.
5. **Interlink articles** to build topical authority cluster, not standalone orphan pages.

**Warning signs:**
- Google Search Console shows 0 impressions after 2-3 weeks for published articles
- "Discovered - currently not indexed" status in Search Console for multiple pages
- Manual action notification in Search Console (rare but devastating)
- All articles ranking below page 3 despite targeting low-competition keywords

**Phase to address:**
Content creation phase. The editorial review process and publication schedule must be defined BEFORE any articles are written.

---

### Pitfall 5: Ghost Pro Starter Plan Pricing Changed -- Budget Mismatch

**What goes wrong:**
The project plan references Ghost Pro at $9/mo. Ghost Pro Starter is now $15/mo (annual) or $18/mo (monthly) after the July 2025 price increase. Additionally, Starter now has reduced features: 1 staff user only, 5MB file upload limit, no paid subscriptions, only 1 newsletter, and only 1 theme. Most critically, Starter does NOT support subdirectory setup even as a paid add-on -- that requires Business at $199/mo.

**Why it happens:**
Ghost restructured pricing in July 2025, increasing Starter by 67% and removing features.

**How to avoid:**
Update the budget to reflect current pricing. If self-hosting (recommended per Pitfall 1), Ghost is free -- only the VPS cost ($6/mo) applies. If staying with Ghost Pro, use Starter ($15-18/mo) with a subdomain (blog.tendhunt.com) since the subfolder approach requires Business.

**Warning signs:**
- Ghost Pro signup shows different pricing than expected
- Feature limitations hit during setup (e.g., can't upload images >5MB as thumbnails)

**Phase to address:**
Planning phase. Budget and hosting decision must be correct before starting.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip canonical URL rewriting in Worker | Faster initial deployment | Split domain authority, SEO damage accumulates daily, hard to undo once Google indexes both versions | Never -- this must be correct from day 1 |
| Publish AI articles without human review | Faster launch, more content | Thin content penalty risk, brand damage from inaccurate procurement info, potential legal issues if advice is wrong | Never -- UK procurement has legal implications |
| Use `?source=html` without testing each article | Faster pipeline, simpler code | Silent image loss, broken formatting, articles look unprofessional | Only for simple text-only articles with no images |
| Hardcode Ghost subdomain IP in Cloudflare Worker | Quick setup, no DNS resolution logic | Ghost infrastructure IPs change regularly, causing sudden 502/521 errors | Never -- use dynamic DNS resolution |
| Skip mobile testing of landing page | Faster launch | 60%+ of UK web traffic is mobile; broken mobile = lost conversions | Never |
| Use Ghost default theme without SEO audit | No theme customization needed | Missing structured data, poor Core Web Vitals from unoptimized theme, no procurement-specific schema | Acceptable for soft launch only, must fix within 2 weeks |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Ghost Admin API Authentication | Using the admin API key directly as a bearer token. The key is actually an `id:secret` pair that must be split and used to generate a short-lived JWT (5-minute expiry). | Split the key on `:`, use the `id` as JWT `kid` header, hex-decode the `secret` to create HMAC-SHA256 signature. Use `iat` = now, `exp` = now + 5 min, `aud` = `/admin/`. |
| Ghost Admin API Post Creation | Sending `{"title": "...", "html": "..."}` as top-level fields. | Nest inside a `posts` array: `{"posts": [{"title": "...", "html": "..."}]}`. Add `?source=html` query param if sending HTML. |
| Cloudflare Workers + Ghost Pro | Adding Ghost Pro CNAME to Cloudflare and expecting normal proxy controls. | Cloudflare locks proxy controls for Ghost Pro domains. Use self-hosted Ghost, or add a non-Ghost subdomain CNAME that you control. |
| Ghost Sitemap | Assuming Ghost generates a sitemap at `/blog/sitemap.xml` when running in subfolder. | Ghost generates sitemap at its root. Your Worker must route `/blog/sitemap.xml` to Ghost's `/sitemap.xml` and rewrite all `<loc>` URLs inside. |
| Cloudflare Pages + Workers routing | Assuming Pages and Workers can share the same domain routes without conflicts. | Cloudflare Pages has its own routing. Workers routes must be explicitly defined to catch `/blog/*` paths BEFORE Pages handles them. Use Workers Routes in the Cloudflare dashboard, not just `wrangler.toml`. |
| Ghost Code Injection for structured data | Adding JSON-LD in Ghost's Site-wide Code Injection and expecting it to apply correctly to all post types. | Use post-level Code Injection for article-specific schema. Site-wide injection is for Organization/WebSite schema only. Validate each with Google Rich Results Test. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unoptimized hero images on landing page | Largest Contentful Paint (LCP) >2.5s, Google PageSpeed score <70 | Use WebP/AVIF format, responsive srcset, lazy loading for below-fold images, preload hero image | Immediately on mobile with 3G/4G connections |
| Ghost theme loading unused JavaScript | Total Blocking Time >300ms, First Input Delay spikes | Audit default Ghost theme JS, defer non-critical scripts, consider headless approach for performance-critical pages | At any traffic level -- it is a constant tax on every page load |
| Cloudflare Worker string replacement on every response | Worker CPU time exceeds free tier limits (10ms CPU per request), responses become slow | Use HTMLRewriter (streaming, efficient) instead of full response body string replacement. Cache rewritten responses at the edge | At ~100K monthly page views, or immediately if articles are long (large HTML payloads) |
| AI-generated thumbnail images too large | Slow blog page loads, high bandwidth costs | Generate thumbnails at exactly the dimensions Ghost theme expects (typically 600x400 or 1200x630 for OG), compress to <100KB, use WebP | With 10+ articles and moderate traffic |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Ghost Admin API key in client-side code or public repo | Full write access to your blog -- attacker can publish, modify, or delete all content | Store API key in Cloudflare Worker environment variables (secrets), never in client-side code. Use Ghost Content API (read-only) for any frontend fetches. |
| Ghost Admin panel accessible via /blog/ghost on main domain | If the reverse proxy forwards admin routes, anyone can access the login page and attempt brute-force | Configure Cloudflare Worker to block/redirect requests to `/blog/ghost/*` on the main domain. Admin access only via the subdomain directly. |
| No rate limiting on waitlist signup endpoint | Spam submissions, email list pollution, potential abuse for phishing | Add Cloudflare Turnstile (free CAPTCHA alternative) to the waitlist form. Validate email format server-side. |
| Publishing articles with inaccurate UK procurement legal information | Reputational damage, potential legal liability if suppliers rely on wrong advice about Procurement Act 2023 | Every article referencing legislation must be fact-checked against legislation.gov.uk. Add disclaimer: "This article is for informational purposes only and does not constitute legal advice." |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Landing page focuses on features (contract alerts, buyer intelligence) instead of outcomes (win more contracts, save time) | Visitors understand what the tool does but not why they should care. Low emotional engagement, high bounce rate. | Lead with outcomes: "Find and win UK government contracts before your competitors." Features are evidence, not the headline. |
| Multiple CTAs competing on landing page (waitlist, blog, pricing, demo) | Decision paralysis. Visitors click nothing because too many options. | One primary CTA per viewport (waitlist signup). Blog link in navigation only. Pricing section has its own CTA that feeds into the same waitlist. |
| Blog articles lack clear next steps | Readers finish article and leave. Zero conversion from content to waitlist. | Every article ends with a contextual CTA: "TendHunt monitors [topic from article] automatically. Join the waitlist." Include in-article CTAs for longer posts. |
| Landing page hero has no social proof | Visitors do not trust a brand-new product with no evidence of traction. | Even pre-launch: "Tracking 434B in UK government contracts" (data point), "Built by [team credential]", or "Launching Q1 2026 -- join 200+ suppliers on the waitlist" (if true). |
| Blog navigation breaks the main site experience | Visitors who come via blog SEO see Ghost's theme instead of the landing page design. Feels like two different products. | Customize Ghost theme header to match landing page navigation. At minimum: same logo, same nav links, same color scheme. Link back to tendhunt.com prominently. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Cloudflare Worker reverse proxy:** Appears to serve /blog pages -- verify canonical URLs point to tendhunt.com/blog (not blog.tendhunt.com), sitemap.xml URLs are rewritten, Open Graph meta tags have correct URLs, robots.txt is accessible at /blog/robots.txt
- [ ] **Ghost blog SEO:** Articles appear published -- verify structured data passes Google Rich Results Test, each article has unique meta description (not auto-generated), featured images have alt text, internal links between articles work with /blog/ prefix
- [ ] **Landing page mobile:** Looks good on desktop -- verify hero CTA is above the fold on mobile, pricing table is horizontally scrollable or stacked, form inputs are large enough for touch (min 44px tap targets), no horizontal scroll on any section
- [ ] **Ghost API article pipeline:** Posts create successfully -- verify images appear in published version (not stripped by Lexical conversion), article slug matches planned URL structure, tags are created correctly (not duplicated), published date is correct (not creation timestamp)
- [ ] **Waitlist form:** Submits successfully -- verify confirmation message/email works, duplicate submissions are handled gracefully, form works without JavaScript (progressive enhancement), data is actually stored (not just 200 OK with nowhere to go)
- [ ] **Blog-to-landing navigation:** Blog header links to landing page -- verify clicking "Home" from /blog goes to tendhunt.com (not blog.tendhunt.com), blog URL in shared links shows tendhunt.com/blog, RSS feed URL is tendhunt.com/blog/rss (not subdomain)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Canonical URLs pointing to wrong domain | MEDIUM (2-4 weeks for Google to reindex) | Fix Worker rewriting, submit corrected sitemap to Google Search Console, use URL Inspection tool to request reindexing of each affected page, monitor "Duplicate without canonical" errors |
| AI content flagged as thin/unhelpful | HIGH (months to recover domain trust) | Remove or noindex flagged articles, rewrite with genuine expertise and data, submit reconsideration request if manual action, rebuild with 1-2 high-quality articles per week |
| Ghost API images stripped from articles | LOW (hours to fix) | Switch to HTML card wrapper method (`<!--kg-card-begin: html-->`), re-publish affected articles, verify via Content API |
| SSL certificate failure on Ghost Pro + Cloudflare | MEDIUM (24-48 hours of downtime possible) | Temporarily disable Cloudflare proxy (DNS only mode), remove and re-add custom domain in Ghost Pro, wait for certificate reissue, re-enable proxy with Full SSL mode |
| Landing page poor Core Web Vitals | LOW-MEDIUM (1-2 days of optimization) | Run Lighthouse audit, compress/resize hero image, defer non-critical JS, add explicit width/height to images to prevent CLS, enable Cloudflare Auto Minify |
| Waitlist form spam | LOW (hours) | Add Cloudflare Turnstile, add honeypot field, implement server-side email validation, deduplicate submissions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Ghost Pro subdirectory pricing/lockout | Phase 1: Infrastructure | Ghost blog accessible at tendhunt.com/blog with valid SSL, admin panel accessible separately |
| Canonical URL rewriting | Phase 1: Infrastructure | `curl` check returns correct canonical in HTML headers; Google Search Console shows correct URLs after indexing |
| Ghost API Lexical format issues | Phase 2: Content Pipeline | Test article publishes with images intact, formatting matches source, pipeline creates drafts before publishing |
| AI content quality / E-E-A-T | Phase 3: Content Creation | Each article passes manual review checklist: specific data, expert signals, primary sources, unique analysis |
| Ghost Pro pricing mismatch | Phase 0: Planning | Budget updated to reflect current pricing; hosting decision documented |
| Landing page conversion killers | Phase 1: Landing Page Build | Single primary CTA per viewport, outcome-focused hero, social proof present, mobile-tested |
| Blog/landing navigation mismatch | Phase 2: Theme Customization | Blog header matches landing page design, navigation links work bidirectionally |
| Structured data missing/invalid | Phase 2: Blog SEO Setup | All article pages pass Google Rich Results Test, Organization schema on landing page |
| Staggered publication schedule | Phase 3: Content Launch | Editorial calendar created before first article, max 2 articles/week publication rate |
| Security (API keys, admin access, spam) | Phase 1: Infrastructure | API keys in environment variables, /ghost admin blocked on main domain, Turnstile on forms |

## Sources

- [Ghost official docs: Running Ghost Pro from a subdirectory](https://ghost.org/help/run-ghost-from-a-subdirectory/) -- HIGH confidence (official docs confirm Business plan requirement and $50/mo add-on)
- [Ghost official docs: Creating a Post via Admin API](https://docs.ghost.org/admin-api/posts/creating-a-post) -- HIGH confidence (official API documentation on HTML/Lexical handling)
- [Ghost Forum: Cloudflare proxying breaks Ghost Pro](https://forum.ghost.org/t/heads-up-cloudflare-proxying-in-front-of-ghost-pro-will-break-it-eventually/48168) -- MEDIUM confidence (community report, multiple confirmations)
- [Ghost Forum: Admin API Lexical update issues](https://forum.ghost.org/t/updating-post-content-via-admin-api-html-lexical-mobiledoc-changes-not-pushed-through/44374) -- MEDIUM confidence (community report with workaround confirmed)
- [Ghost GitHub Issue #18448: Image loss in Lexical HTML import](https://github.com/TryGhost/Ghost/issues/18448) -- HIGH confidence (official bug tracker)
- [Ghost GitHub Issue #17167: MobileDoc/Lexical dual-field import bug](https://github.com/TryGhost/Ghost/issues/17167) -- HIGH confidence (official bug tracker)
- [Indie Hackers: Moving Ghost Pro to subfolder -- failure post-mortem](https://www.indiehackers.com/product/img-vision/moving-ghost-pro-to-subfolder-and-failing-to--LxS9iOd60_Te30Z6wpb) -- MEDIUM confidence (detailed real-world failure case)
- [Indie Hackers: Ghost blog now on main domain -- success follow-up](https://www.indiehackers.com/product/img-vision/ghost-blog-is-now-hosted-on-main-domain--M6Gt3CSAp3nIFeZKOC-) -- MEDIUM confidence (confirms self-hosted solution works)
- [CreateToday: Ghost subdirectory with Cloudflare Workers](https://createtoday.io/posts/ghost-subdirectory) -- MEDIUM confidence (detailed technical guide)
- [Cloak.ist: Ghost subdirectory with Cloudflare Workers](https://cloak.ist/blog/how-to-put-a-ghost-blog-at-a-subdirectory-using-cloudflare-workers) -- MEDIUM confidence (working code examples)
- [Ghost Forum: Updated Ghost Pro pricing July 2025](https://forum.ghost.org/t/updated-ghost-pro-pricing-july-2025-15-mo-starter-29-mo-publisher-199-mo-business/59090) -- HIGH confidence (official pricing change)
- [Ghost pricing page](https://ghost.org/pricing) -- HIGH confidence (subdirectory = Business plan + $50/mo confirmed)
- [Google Search Central: AI content and ranking](https://support.google.com/webmasters/thread/322708528) -- HIGH confidence (official Google guidance)
- [SEO Sherpa: Google AI content penalties](https://seosherpa.com/does-google-penalize-ai-content/) -- MEDIUM confidence (reputable SEO source, verified against Google guidelines)
- [Semrush: AI content research](https://www.semrush.com/blog/does-google-penalize-ai-content/) -- MEDIUM confidence (large-scale data study)
- [Cloudflare Blog: SEO subdirectories vs subdomains](https://blog.cloudflare.com/subdomains-vs-subdirectories-improved-seo-part-2/) -- HIGH confidence (official Cloudflare blog)

---
*Pitfalls research for: SaaS Landing Page + Ghost Blog SEO (UK Procurement Intelligence)*
*Researched: 2026-02-11*
