# Architecture Research

**Domain:** SaaS marketing site with integrated Ghost blog on Cloudflare
**Researched:** 2026-02-11
**Confidence:** HIGH

## System Overview

```
                         tendhunt.com (Cloudflare DNS)
                                    |
                    ┌───────────────┴───────────────┐
                    |                               |
              Cloudflare Worker               Cloudflare Pages
              Route: /blog/*                  Custom Domain: tendhunt.com
                    |                               |
                    |                         Static HTML/CSS/JS
                    |                         (Landing Page)
                    |                               |
              ┌─────┴─────┐                   ┌─────┴─────┐
              | Reverse   |                   | Hero      |
              | Proxy     |                   | Features  |
              | + HTML    |                   | Pricing   |
              | Rewriter  |                   | Waitlist  |
              └─────┬─────┘                   | Footer    |
                    |                         └───────────┘
              Ghost Pro
              (*.ghost.io)
              Managed Blog


    ┌─────────────────────────────────────────────────┐
    |            ARTICLE GENERATION PIPELINE            |
    |                                                   |
    |  AI Draft ──> Markdown ──> Human Review           |
    |      |                         |                  |
    |  Thumbnail ──> Ghost Upload    |                  |
    |  Generation    (via API)       |                  |
    |                                ▼                  |
    |              Python Script ──> Ghost Admin API    |
    |              (Lexical format, JWT auth)            |
    └─────────────────────────────────────────────────┘


    app.tendhunt.com (separate deployment)
    ┌─────────────────────┐
    | Next.js 16.1 App    |
    | (Vercel / CF Pages) |
    | Clerk Auth          |
    | Dashboard           |
    └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Cloudflare Pages** | Serves the landing page as static HTML/CSS/JS from Cloudflare's global edge network | Git-connected deployment; push to `main` triggers auto-build and deploy to 300+ edge locations |
| **Cloudflare Worker (blog proxy)** | Intercepts all `/blog/*` requests and reverse-proxies them to Ghost Pro, rewriting URLs in HTML responses | Standalone Worker with route `tendhunt.com/blog*`, using `HTMLRewriter` API for link/meta rewriting |
| **Ghost Pro** | Managed blog hosting — content creation, theme rendering, sitemap, RSS | Ghost Pro Business plan ($25/mo) with subdirectory add-on configured; content served at `*.ghost.io` |
| **Article Pipeline** | Generates AI-drafted articles, creates thumbnails, converts to Lexical format, publishes via Ghost Admin API | Python scripts: `generate_article.py`, `generate_thumbnail.py`, `push_article.py` with PyJWT auth |
| **Landing Page** | Converts visitors to waitlist signups; communicates TendHunt value proposition | Static HTML/CSS adapted from Getmany Figma template; Tailwind CSS for styling; vanilla JS for form handling |
| **Next.js App** | Authenticated dashboard at `app.tendhunt.com` — completely separate deployment, not in scope for this project | Next.js 16.1 on Vercel with Clerk auth, MongoDB |

## Recommended Project Structure

```
landing/
├── src/                          # Landing page source
│   ├── index.html                # Main landing page
│   ├── css/
│   │   ├── styles.css            # Tailwind-compiled CSS
│   │   └── custom.css            # Custom overrides
│   ├── js/
│   │   └── main.js               # Waitlist form, smooth scroll, mobile menu
│   ├── images/                   # Optimized images, logos, icons
│   └── pages/                    # Additional static pages if needed
│       ├── privacy.html
│       └── terms.html
├── workers/                      # Cloudflare Workers
│   ├── blog-proxy/
│   │   ├── src/
│   │   │   └── index.ts          # Ghost reverse proxy Worker
│   │   ├── wrangler.toml         # Worker config with route
│   │   └── package.json
│   └── README.md
├── pipeline/                     # Article generation pipeline
│   ├── generate_article.py       # AI article generation (markdown)
│   ├── generate_thumbnail.py     # Thumbnail image generation
│   ├── push_article.py           # Push to Ghost via Admin API (Lexical)
│   ├── convert_to_lexical.py     # Markdown-to-Lexical converter
│   ├── config.py                 # Ghost API credentials, prompts
│   ├── templates/                # Article prompt templates
│   │   └── procurement.md
│   ├── articles/                 # Generated articles (markdown + frontmatter)
│   │   └── .gitkeep
│   ├── thumbnails/               # Generated thumbnail images
│   │   └── .gitkeep
│   └── requirements.txt          # PyJWT, requests, openai, Pillow
├── tailwind.config.js            # Tailwind configuration
├── package.json                  # Build tooling (Tailwind CLI)
├── .planning/                    # Planning docs
│   └── research/
└── README.md
```

### Structure Rationale

- **`src/`:** Plain HTML/CSS/JS. No framework overhead for a marketing page that needs maximum Lighthouse scores and zero JavaScript runtime. Tailwind CSS compiled at build time to a single CSS file. Cloudflare Pages deploys the `src/` directory directly.
- **`workers/blog-proxy/`:** Isolated Cloudflare Worker project with its own `wrangler.toml`. Deployed separately from Pages via `wrangler deploy`. This separation is intentional because Pages and Workers are different Cloudflare products with different deployment pipelines.
- **`pipeline/`:** Python scripts for the article generation workflow. Completely decoupled from both the landing page and the Worker. Runs locally or in CI -- not deployed to any server. Talks to Ghost Pro via Admin API over HTTPS.

## Architectural Patterns

### Pattern 1: Cloudflare Worker as Ghost Reverse Proxy

**What:** A standalone Cloudflare Worker intercepts requests to `tendhunt.com/blog*` and proxies them to the Ghost Pro instance. The Worker rewrites all URLs in HTML responses so Ghost's internal links, canonical tags, and asset paths all reference `tendhunt.com/blog/...` instead of the Ghost subdomain.

**When to use:** Always. This is the only way to serve Ghost Pro at a subfolder path for SEO purposes. Subfolders pass domain authority from the main site to the blog, which subdomains do not.

**Trade-offs:**
- Pro: SEO benefit -- `/blog` shares domain authority with the landing page
- Pro: Users see a single domain, building trust
- Pro: Ghost Pro handles all CMS complexity -- zero blog infrastructure to maintain
- Con: Worker adds a few ms of latency per blog request (negligible on Cloudflare edge)
- Con: URL rewriting must be comprehensive -- missed rewrites cause broken links
- Con: Ghost Pro Business plan required for subdirectory configuration ($25/mo)
- Con: Advanced setup -- Ghost considers this "highly advanced" configuration

**Implementation:**

```typescript
// workers/blog-proxy/src/index.ts
const GHOST_ORIGIN = "your-site.ghost.io"; // Ghost Pro subdomain
const ROOT_DOMAIN = "tendhunt.com";
const BLOG_PATH = "/blog";

class AttributeRewriter {
  attributeName: string;
  constructor(attributeName: string) {
    this.attributeName = attributeName;
  }
  element(element: Element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      // Rewrite Ghost subdomain URLs to /blog path
      element.setAttribute(
        this.attributeName,
        attribute.replace(
          new RegExp(`https?://${GHOST_ORIGIN}`, "g"),
          `https://${ROOT_DOMAIN}${BLOG_PATH}`
        )
      );
    }
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Strip /blog prefix and forward to Ghost
    const ghostPath = url.pathname.replace(/^\/blog/, "") || "/";
    const ghostUrl = `https://${GHOST_ORIGIN}${ghostPath}${url.search}`;

    // Proxy the request with required Ghost headers
    const proxyRequest = new Request(ghostUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    proxyRequest.headers.set("X-Forwarded-Host", ROOT_DOMAIN);
    proxyRequest.headers.set("X-Forwarded-Proto", "https");
    proxyRequest.headers.set(
      "X-Forwarded-For",
      request.headers.get("CF-Connecting-IP") || ""
    );

    const response = await fetch(proxyRequest);
    const contentType = response.headers.get("Content-Type") || "";

    // Only rewrite HTML responses -- pass assets (JS, CSS, images) through
    if (contentType.includes("text/html")) {
      const rewriter = new HTMLRewriter()
        .on("a", new AttributeRewriter("href"))
        .on("img", new AttributeRewriter("src"))
        .on("img", new AttributeRewriter("srcset"))
        .on("link", new AttributeRewriter("href"))
        .on("script", new AttributeRewriter("src"))
        .on("meta", new AttributeRewriter("content"));

      return rewriter.transform(response);
    }

    return response;
  },
};
```

```toml
# workers/blog-proxy/wrangler.toml
name = "tendhunt-blog-proxy"
main = "src/index.ts"
compatibility_date = "2025-01-01"

routes = [
  { pattern = "tendhunt.com/blog*", zone_name = "tendhunt.com" }
]
```

**Confidence:** HIGH -- verified with Cloudflare Workers official docs (Context7) for HTMLRewriter API and routing. Ghost Pro subdirectory setup verified with official Ghost documentation. Multiple community implementations confirm this pattern works.

### Pattern 2: Static HTML Landing Page on Cloudflare Pages

**What:** The landing page is plain HTML/CSS/JS (no framework, no SSR) deployed to Cloudflare Pages. Tailwind CSS is compiled at build time. No JavaScript runtime on the client beyond a small form handler.

**When to use:** For the TendHunt landing page. A marketing page does not need React, Vue, or any framework. Static HTML achieves perfect Lighthouse scores, loads instantly from edge, and is trivially cacheable.

**Trade-offs:**
- Pro: Maximum performance -- zero JS framework overhead, instant TTI
- Pro: Maximum SEO -- search engines see complete HTML immediately
- Pro: Cloudflare Pages free tier supports unlimited requests, bandwidth, and builds
- Pro: Dead simple deployment -- push to Git, Pages auto-deploys
- Con: No component reuse (acceptable for a single-page marketing site)
- Con: Content changes require code changes (acceptable -- content is stable)

**Why not Astro/Next.js static export?**
Astro would work, but adds a build step and framework dependency for zero benefit on a single-page marketing site adapted from a Figma template. The Figma-to-HTML conversion produces HTML directly. Adding Astro would mean converting that HTML into Astro components, which is unnecessary work. If the site grows to 5+ pages, reconsider Astro.

**Confidence:** HIGH -- Cloudflare Pages static HTML deployment is well-documented and widely used.

### Pattern 3: Ghost Admin API Article Pipeline (Lexical Format)

**What:** Python scripts generate articles via AI, create thumbnails, convert markdown to Ghost's Lexical JSON format, and publish via the Ghost Admin API using JWT authentication.

**When to use:** For the 5-10 initial SEO articles and ongoing content publishing.

**Trade-offs:**
- Pro: Fully automated pipeline from AI draft to published post
- Pro: Lexical format gives full control over content structure
- Pro: JWT auth is stateless and scriptable
- Con: Lexical format is complex and largely undocumented -- must reverse-engineer from Ghost editor output
- Con: PyJWT requires the `pyjwt` package (not `jwt`) -- common source of confusion

**Implementation (Python JWT + Post Creation):**

```python
# pipeline/push_article.py
import jwt  # pip install pyjwt (NOT jwt!)
import requests
import json
from datetime import datetime

GHOST_URL = "https://your-site.ghost.io"
ADMIN_API_KEY = "KEY_ID:SECRET"  # From Ghost Admin > Integrations

def get_ghost_token():
    """Generate short-lived JWT for Ghost Admin API."""
    key_id, secret = ADMIN_API_KEY.split(":")
    iat = int(datetime.now().timestamp())
    header = {"alg": "HS256", "typ": "JWT", "kid": key_id}
    payload = {"iat": iat, "exp": iat + 5 * 60, "aud": "/admin/"}
    return jwt.encode(payload, bytes.fromhex(secret),
                      algorithm="HS256", headers=header)

def publish_article(title: str, lexical_content: str, tags: list[str],
                    feature_image: str = None):
    """Publish article to Ghost via Admin API in Lexical format."""
    token = get_ghost_token()
    url = f"{GHOST_URL}/ghost/api/admin/posts/"
    headers = {"Authorization": f"Ghost {token}"}
    body = {
        "posts": [{
            "title": title,
            "lexical": lexical_content,  # JSON string
            "status": "published",
            "tags": tags,
            "feature_image": feature_image,
        }]
    }
    response = requests.post(url, json=body, headers=headers)
    response.raise_for_status()
    return response.json()
```

**Confidence:** HIGH -- Ghost Admin API post creation with Lexical format verified via Context7 (official Ghost documentation). Python JWT authentication pattern verified via Context7 with complete code example.

## Data Flow

### Request Flow: Visitor Hits tendhunt.com

```
Visitor Browser
    |
    ├── GET tendhunt.com/
    |   └── Cloudflare DNS ──> Cloudflare Pages
    |       └── Serves static index.html from edge cache
    |           └── Response: Full HTML page (< 50ms globally)
    |
    ├── GET tendhunt.com/blog/
    |   └── Cloudflare DNS ──> Worker Route (tendhunt.com/blog*)
    |       └── Worker strips /blog prefix
    |           └── fetch("https://your-site.ghost.io/")
    |               └── Ghost Pro renders blog homepage
    |                   └── Worker rewrites URLs via HTMLRewriter
    |                       └── Response: Ghost HTML with /blog/ URLs
    |
    ├── GET tendhunt.com/blog/procurement-act-2023-guide/
    |   └── Same Worker flow as above
    |       └── Ghost renders individual post
    |
    └── GET app.tendhunt.com/dashboard
        └── Separate DNS record ──> Vercel / separate CF Pages project
            └── Next.js 16.1 app with Clerk auth
```

### Data Flow: Article Generation Pipeline

```
1. AI Generation (Local/CI)
   ├── OpenAI API generates article markdown
   ├── Frontmatter includes: title, slug, tags, meta description
   └── Output: articles/procurement-act-2023.md

2. Thumbnail Generation (Local/CI)
   ├── Python script (Pillow/PIL) creates branded thumbnail
   ├── Uses TendHunt brand colors and template
   └── Output: thumbnails/procurement-act-2023.png

3. Human Review (Manual)
   ├── Editor reviews markdown file
   ├── Edits for accuracy, tone, compliance
   └── Approves for publishing

4. Upload Thumbnail (Script)
   ├── Ghost Admin API: POST /ghost/api/admin/images/upload/
   ├── Returns hosted image URL on Ghost CDN
   └── URL stored for use in step 5

5. Publish to Ghost (Script)
   ├── convert_to_lexical.py: Markdown ──> Lexical JSON
   ├── push_article.py: POST /ghost/api/admin/posts/
   │   ├── JWT auth (HS256, 5-minute expiry)
   │   ├── Body: { posts: [{ title, lexical, status: "published", tags, feature_image }] }
   │   └── Ghost creates post + generates slug + adds to sitemap
   └── Post is live at tendhunt.com/blog/{slug}/ (via Worker proxy)
```

### Cloudflare Routing Architecture (Critical Detail)

```
                    tendhunt.com DNS Zone
                    ┌────────────────────────────┐
                    |  DNS Records:               |
                    |  tendhunt.com    A/CNAME    |──> Cloudflare Pages
                    |  (proxied through CF)       |    (custom domain)
                    |                              |
                    |  app.tendhunt.com CNAME     |──> Vercel / separate
                    |  (proxied through CF)       |    deployment
                    └──────────┬─────────────────┘
                               |
                    ┌──────────┴─────────────────┐
                    |  Request Processing Order:  |
                    |                              |
                    |  1. Worker Routes evaluated  |
                    |     FIRST (most specific     |
                    |     route wins)              |
                    |                              |
                    |  2. If no Worker Route       |
                    |     matches, request goes    |
                    |     to Pages                 |
                    |                              |
                    |  Route: tendhunt.com/blog*   |──> blog-proxy Worker
                    |  Everything else             |──> Cloudflare Pages
                    └─────────────────────────────┘
```

**IMPORTANT ROUTING NOTE:** Worker Routes and Cloudflare Pages CAN coexist on the same domain. Worker Routes are evaluated before Pages. A route pattern `tendhunt.com/blog*` will intercept all `/blog` requests and send them to the Worker, while all other paths fall through to Pages. This is confirmed by Cloudflare's route specificity rules: more specific routes take precedence, and Worker Routes are processed before the Pages origin.

**Confidence:** MEDIUM -- Multiple community implementations confirm this works. Official Cloudflare docs confirm Worker route specificity rules. However, the exact priority between Worker Routes and Pages custom domains is not explicitly documented in one place. This should be validated during implementation.

### Key Data Flows

1. **Landing Page Delivery:** Visitor hits tendhunt.com -> Cloudflare edge cache serves static HTML. Zero origin fetch needed after first request. Globally < 50ms TTFB.

2. **Blog Delivery:** Visitor hits tendhunt.com/blog/* -> Worker Route intercepts -> Worker proxies to Ghost Pro with required headers (X-Forwarded-Host, X-Forwarded-Proto, X-Forwarded-For) -> Ghost renders themed HTML -> Worker rewrites URLs via HTMLRewriter -> Response delivered from edge.

3. **Waitlist Signup:** Visitor submits email on landing page -> JavaScript POSTs to a form endpoint (Cloudflare Pages Function, or external service like Formspree/Buttondown) -> Stores email for waitlist.

4. **Article Publishing:** AI generates markdown -> Human reviews -> Python script converts to Lexical JSON -> Script authenticates via JWT -> POST to Ghost Admin API -> Ghost publishes post -> Post immediately available via Worker proxy at /blog/{slug}/.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K visitors/day (launch) | Current architecture is sufficient. Cloudflare Pages serves static landing page from cache. Ghost Pro handles blog. Worker proxies ~100-500 blog requests/day. All free or near-free tier. |
| 1K-10K visitors/day (growth) | No architectural changes needed. Cloudflare's edge cache handles static content at any scale. Ghost Pro Business tier can handle this traffic. Worker invocations stay well within free tier (100K requests/day). Consider adding Cloudflare Web Analytics. |
| 10K-100K visitors/day (viral) | Ghost Pro may need upgrade to higher tier for traffic. Consider adding Cloudflare cache rules for blog proxy responses to reduce Worker invocations. Landing page scales infinitely on Pages. May want to add a CDN-cached "latest posts" section to landing page via Ghost Content API at build time. |

### Scaling Priorities

1. **First bottleneck: Ghost Pro response time under Worker proxy.** Each blog page load makes a subrequest from Worker to Ghost Pro origin. Ghost Pro's response time (~200-500ms) becomes the floor for blog TTFB. **Mitigation:** Add `Cache-Control` headers to the Worker response. Cloudflare will cache the proxied response at the edge, making subsequent requests instant. Ghost's built-in cache headers may already handle this.

2. **Second bottleneck: Article pipeline throughput.** If publishing more than 5-10 articles/week, the manual review step becomes the bottleneck. **Mitigation:** Build a review dashboard or use Ghost's built-in draft review workflow. The technical pipeline (AI generation + publishing) can handle hundreds of articles/day.

## Anti-Patterns

### Anti-Pattern 1: Using a JavaScript Framework for the Landing Page

**What people do:** Reach for React, Next.js, or Astro to build a marketing page with 5-6 static sections.
**Why it's wrong:** A framework adds build complexity, JS bundle size, and deployment configuration for zero benefit on a static marketing page. The Figma template produces HTML directly. Converting it to JSX/Astro components is wasted effort that delays launch.
**Do this instead:** Plain HTML with Tailwind CSS. Build only Tailwind at build time (`npx tailwindcss -i input.css -o output.css`). Deploy the HTML directory to Cloudflare Pages. Perfect Lighthouse scores, zero framework overhead.

### Anti-Pattern 2: Using Ghost as a Headless CMS with Custom Frontend

**What people do:** Use Ghost's Content API to fetch posts, then render them in a custom React/Astro frontend. This means building and maintaining your own blog theme.
**Why it's wrong:** Ghost Pro already includes a polished, responsive theme (Casper or Source) that handles post rendering, pagination, tag pages, author pages, search, and RSS. Building a custom frontend duplicates all of this work. For a launch-stage product, the default Ghost theme is perfectly adequate.
**Do this instead:** Use Ghost's built-in theme rendering via the reverse proxy. Ghost handles all blog presentation. Customize the theme later if brand alignment becomes important.

### Anti-Pattern 3: Deploying the Blog Proxy as a Pages Function

**What people do:** Put the Ghost proxy logic inside a Cloudflare Pages Function (`functions/blog/[[path]].ts`) instead of a standalone Worker.
**Why it's wrong:** Pages Functions and the landing page share the same deployment. A bug in the proxy function can break landing page deployments. Pages Functions have different runtime characteristics and limitations vs standalone Workers. Also, Pages Functions are billed differently (not free for all invocations).
**Do this instead:** Deploy the blog proxy as a standalone Cloudflare Worker with its own `wrangler.toml` and route configuration. Independent deployment, independent error handling, independent monitoring.

### Anti-Pattern 4: Storing Waitlist Emails in a Database

**What people do:** Build a database-backed waitlist system with a custom API, email verification, admin panel, etc.
**Why it's wrong:** Over-engineering for launch. You need to collect emails, not build a CRM. A managed form service handles storage, export, and basic email notification.
**Do this instead:** Use a lightweight form backend -- Formspree (free tier: 50 submissions/month), Buttondown (free tier: 100 subscribers), or a simple Cloudflare Pages Function that appends to a D1 database or KV store. Export to CSV when needed.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Ghost Pro** | Reverse proxy via Cloudflare Worker (blog delivery) + Admin API (article publishing) | Business plan ($25/mo) required for subdirectory. Configure X-Forwarded-Host header. Admin API uses JWT auth (HS256). Content API key for any future headless usage. |
| **Cloudflare Pages** | Git-connected static deployment | Connect GitHub repo, set build command: `npx tailwindcss -i src/css/input.css -o src/css/styles.css`, output directory: `src/`. Auto-deploys on push to `main`. |
| **Cloudflare Workers** | Standalone Worker with route config | Deploy via `wrangler deploy` from `workers/blog-proxy/`. Route: `tendhunt.com/blog*`. Separate from Pages deployment. |
| **OpenAI API** | REST API for article generation | Used in pipeline scripts only. GPT-4o or Claude for article drafts. Not deployed anywhere -- runs locally/CI. |
| **Form Backend** | REST API from landing page JS | Formspree, Buttondown, or CF Pages Function + KV. Landing page JS posts email to form endpoint. |
| **Cloudflare DNS** | DNS zone management | A/CNAME for tendhunt.com -> Pages. CNAME for app.tendhunt.com -> Vercel. All records proxied through Cloudflare. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Landing Page <-> Blog** | None (separate systems) | Landing page links to `/blog`. Visitor navigates. No API calls between them. They share only the domain via Cloudflare routing. |
| **Pipeline <-> Ghost** | Ghost Admin API (HTTPS, JWT auth) | Pipeline pushes content TO Ghost. No pull from Ghost. One-way data flow. Pipeline runs locally or in CI, not on any server. |
| **Landing Page <-> App** | Link only | Landing page CTA links to `app.tendhunt.com/sign-up`. No shared state, no shared auth, no API calls. Completely separate deployments. |
| **Worker <-> Ghost Pro** | HTTP reverse proxy (fetch) | Worker makes subrequests to Ghost Pro origin on every blog page load. Ghost renders HTML. Worker rewrites URLs. No persistent connection. |

## Build Order (Dependency Graph)

```
Phase 1: DNS + Cloudflare Setup (no code dependencies)
  ├── Configure Cloudflare DNS zone for tendhunt.com
  ├── Set up SSL/TLS (Full mode)
  └── Verify domain is proxied through Cloudflare

Phase 2: Landing Page (depends on Phase 1)
  ├── Convert Figma template to HTML/Tailwind CSS
  ├── Add TendHunt content (hero, features, pricing, CTA)
  ├── Set up Cloudflare Pages project
  ├── Connect Git repo, configure build
  └── Deploy to tendhunt.com

Phase 3: Ghost Pro + Blog Proxy (depends on Phase 1)
  ├── Set up Ghost Pro account (Business plan)
  ├── Request subdirectory configuration from Ghost
  ├── Build and deploy blog-proxy Worker
  ├── Configure Worker route: tendhunt.com/blog*
  ├── Verify end-to-end: tendhunt.com/blog loads Ghost
  └── Customize Ghost theme if needed

Phase 4: Article Pipeline (depends on Phase 3)
  ├── Build Python scripts for article generation
  ├── Build markdown-to-Lexical converter
  ├── Build thumbnail generator
  ├── Test: generate article -> review -> publish to Ghost
  ├── Publish 5-10 initial SEO articles
  └── Verify articles accessible at tendhunt.com/blog/{slug}

Phase 5: Waitlist + Polish (depends on Phase 2)
  ├── Add form backend for waitlist signups
  ├── Wire landing page CTA to form
  ├── SEO meta tags, Open Graph, structured data
  ├── Cloudflare Web Analytics
  └── Performance audit (Lighthouse 95+)
```

**Phase ordering rationale:**
- Phase 1 must come first -- everything depends on DNS being configured
- Phase 2 and Phase 3 can run in parallel -- landing page and blog have no code dependencies on each other
- Phase 4 depends on Phase 3 -- articles are published to Ghost, which must be set up first
- Phase 5 depends on Phase 2 -- waitlist form lives on the landing page

## Sources

- [Cloudflare Workers HTMLRewriter API](https://developers.cloudflare.com/workers/examples/rewrite-links) -- HIGH confidence (Context7, official docs)
- [Cloudflare Workers Routes documentation](https://developers.cloudflare.com/workers/configuration/routing/routes/) -- HIGH confidence (official docs)
- [Ghost Pro subdirectory setup](https://ghost.org/help/run-ghost-from-a-subdirectory/) -- HIGH confidence (official Ghost documentation)
- [Ghost Admin API: Creating Posts (Lexical)](https://docs.ghost.org/admin-api/posts/creating-a-post) -- HIGH confidence (Context7, official Ghost docs)
- [Ghost Admin API Python JWT authentication](https://docs.ghost.org/admin-api) -- HIGH confidence (Context7, official Ghost docs)
- [Cloudflare Pages static HTML deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) -- HIGH confidence (official docs)
- [Cloudflare Pages Functions advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/) -- HIGH confidence (official docs)
- [Ghost subdirectory via Cloudflare Workers (community)](https://cloak.ist/blog/how-to-put-a-ghost-blog-at-a-subdirectory-using-cloudflare-workers) -- MEDIUM confidence (community implementation, confirmed pattern)
- [Ghost CMS + Cloudflare Workers subfolder guide](https://blog.hackerhouse.world/ghost-cms-bubble-blog-subfolder-cloudflare-workers/) -- MEDIUM confidence (community implementation with HTMLRewriter)
- [Cloudflare blog: Subdomains vs Subdirectories for SEO](https://blog.cloudflare.com/subdomains-vs-subdirectories-improved-seo-part-2/) -- MEDIUM confidence (Cloudflare official blog)
- [Astro on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) -- HIGH confidence (official docs, noted as alternative if site grows)

---
*Architecture research for: SaaS marketing site with Ghost blog integration on Cloudflare*
*Researched: 2026-02-11*
