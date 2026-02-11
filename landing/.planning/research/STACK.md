# Stack Research

**Domain:** SaaS landing page + Ghost CMS blog with Cloudflare deployment
**Researched:** 2026-02-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Astro | 5.17.x (latest stable) | Static site generator for landing page | Purpose-built for content/marketing sites. Zero JS by default = perfect Lighthouse scores. Islands architecture lets you add React components only where interactivity is needed. Native Cloudflare Pages deployment. Astro 5 is the current stable line (6 is beta). |
| Tailwind CSS | 4.1.x | Utility-first CSS framework | v4 released Jan 2025 with 5x faster builds. Setup is one line (`@import "tailwindcss"`). No config file needed. Pairs with `@tailwindcss/vite` plugin which Astro uses natively. Already used in the main app (Next.js), so team knows it. |
| Ghost Pro | 5.x (managed) | Blog CMS at /blog subdirectory | Managed hosting = zero ops. Business plan ($25/mo) required for subdirectory support. Lexical editor format for all new content. Content API for reading posts, Admin API for programmatic publishing. |
| Cloudflare Pages | N/A | Landing page hosting | Free tier covers static sites. Git-integrated CI/CD. Global CDN. Direct Astro adapter support via `@astrojs/cloudflare`. |
| Cloudflare Workers | N/A | Reverse proxy for /blog | Intercepts `/blog/*` requests and proxies them to Ghost Pro. Required to serve Ghost at a subdirectory (Ghost does not natively support this). SEO benefit of subdirectory over subdomain is well-established. |
| TypeScript | 5.x | Type safety | Astro has first-class TypeScript support. Consistent with the main Next.js app. |

### Ghost API Integration

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tryghost/admin-api` | 1.14.4 | Publish posts programmatically | Article generation pipeline: create/update posts in Lexical format via API. Used in build scripts, not shipped to browser. |
| `@tryghost/content-api` | 1.12.3 | Read published blog content | Only if you need to render blog posts within the Astro site (e.g., "Latest from blog" section on landing page). Ghost Pro handles the actual blog rendering. |

### Astro Integrations

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@astrojs/sitemap` | 3.7.x | Auto-generate sitemap.xml | Always. Essential for SEO. Configure to include all landing pages. Ghost generates its own sitemap for /blog. |
| `@astrojs/react` | latest | React island support | Only for interactive components (e.g., animated hero, waitlist form with validation). Most of the landing page should be pure Astro components. |
| `@tailwindcss/vite` | 4.x | Tailwind CSS build integration | Always. This is how Tailwind v4 integrates with Astro's Vite build pipeline. |
| `astro-seo` | 1.1.0 | SEO meta tags component | Centralizes title, description, Open Graph, Twitter Card, canonical URL in one component. Simpler than managing meta tags manually. |

### Animation and UI

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion` (formerly Framer Motion) | latest | Scroll animations, entrance effects | Only in React island components. Use for hero section animations, feature card entrances. Keep it minimal -- CSS animations handle most needs. |
| CSS View Transitions | Built into Astro | Page transition effects | Use Astro's built-in `<ClientRouter />` for smooth multi-page transitions. Zero JS overhead for basic transitions. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `wrangler` | Cloudflare CLI for deployment and Worker management | Deploy landing to Pages, manage Worker for /blog proxy. Install globally or as dev dep. |
| `sharp` | Image optimization at build time | Astro uses it automatically for `<Image>` component. Converts to WebP/AVIF. Install as dependency for optimal builds. |
| `prettier` + `prettier-plugin-astro` | Code formatting | Astro files need the plugin for proper formatting. |

## Installation

```bash
# Initialize Astro project
npm create astro@latest -- --template minimal

# Core dependencies
npm install astro@latest tailwindcss@latest @tailwindcss/vite@latest sharp

# Astro integrations
npx astro add react sitemap
npm install astro-seo

# Ghost API (for article publishing scripts)
npm install @tryghost/admin-api @tryghost/content-api

# Animation (only if using React islands with motion)
npm install motion

# Dev dependencies
npm install -D wrangler prettier prettier-plugin-astro typescript @types/node
```

## Project Configuration

### astro.config.mjs

```javascript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tendhunt.com",
  output: "static", // Pure SSG -- no server runtime needed for landing
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),    // For interactive islands only
    sitemap(),  // Auto sitemap generation
  ],
});
```

### Global CSS (src/styles/global.css)

```css
@import "tailwindcss";
```

### Ghost Admin API Usage (scripts/publish-article.ts)

```typescript
import GhostAdminAPI from "@tryghost/admin-api";

const api = new GhostAdminAPI({
  url: "https://tendhunt.ghost.io",
  key: process.env.GHOST_ADMIN_API_KEY!,
  version: "v6.0",
});

await api.posts.add({
  title: "How to Win UK Government Contracts in 2026",
  lexical: '{"root":{"children":[...],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
  status: "draft", // Always draft first, human review before publish
  tags: ["UK Procurement", "Government Contracts"],
});
```

### Cloudflare Worker for /blog Proxy (workers/ghost-proxy/index.js)

```javascript
const config = {
  ghostDomain: "tendhunt.ghost.io",
  rootDomain: "tendhunt.com",
  blogPath: "/blog",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Only handle /blog/* requests
    if (!path.startsWith(config.blogPath)) {
      return fetch(request);
    }

    // Proxy to Ghost
    const ghostUrl = `https://${config.ghostDomain}${path}`;
    const response = await fetch(ghostUrl, {
      headers: {
        Host: config.ghostDomain,
        "X-Forwarded-Host": config.rootDomain,
        "X-Forwarded-Proto": "https",
        "X-Forwarded-For": request.headers.get("CF-Connecting-IP"),
      },
    });

    // For HTML pages, rewrite subdomain references to root domain
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let body = await response.text();
      body = body.split(config.ghostDomain).join(config.rootDomain);
      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  },
};
```

### wrangler.toml (for Ghost proxy Worker)

```toml
name = "tendhunt-blog-proxy"
main = "index.js"
compatibility_date = "2025-01-01"

[triggers]
routes = ["tendhunt.com/blog*"]
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Astro (static) | Next.js (static export) | If you need shared components with the main app. But Astro produces better Lighthouse scores for pure marketing sites and is simpler for this use case. The main app already uses Next.js -- keep them separate. |
| Astro (static) | Hugo | If you want the absolute fastest builds (Go-based). But Hugo's templating is harder to work with and doesn't support React islands for interactivity. |
| Tailwind CSS v4 | plain CSS / CSS Modules | If the team doesn't know Tailwind. But the team already uses Tailwind in the main app, and v4's simplified setup makes it even easier. |
| Ghost Pro (managed) | Self-hosted Ghost | If you need full control or want to avoid the monthly cost. Self-hosting adds ops burden (server, backups, updates) that isn't worth it for a blog. |
| Ghost Pro (managed) | Hashnode / Substack / Medium | If you don't care about SEO or domain authority. These platforms keep traffic on their domain, not yours. Ghost at /blog keeps all SEO juice on tendhunt.com. |
| Cloudflare Workers proxy | Nginx reverse proxy | If you're running your own server. Cloudflare Workers are serverless, globally distributed, and free tier covers this use case. |
| Cloudflare Pages | Vercel | If you need Edge Functions or more complex serverless logic on the landing page. But for a pure static site, Cloudflare Pages is free and simpler. The main app already uses Vercel -- keeping landing on Cloudflare avoids coupling them. |
| `motion` library | GSAP | If you need complex timeline-based animations. For simple scroll-triggered entrances and hero animations, `motion` is lighter and React-native. |
| `motion` library | CSS-only animations | If you want zero JS for animations. CSS `@keyframes` + Astro View Transitions handle 80% of landing page animation needs. Only reach for `motion` if CSS can't achieve the effect. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js for landing page | Overkill for a static marketing site. Adds React runtime to every page. You already use it for the app -- don't create coupling between landing and app deployments. | Astro with static output |
| Ghost subdomain (blog.tendhunt.com) | Subdirectories pass more SEO authority to the root domain than subdomains. Google treats subdomains as separate entities. | Cloudflare Worker proxy to serve at /blog |
| `mobiledoc` format for Ghost posts | Deprecated in Ghost 5.x. Ghost uses Lexical format for all new content. Mobiledoc still works but is legacy. | Lexical format via `lexical` field in Admin API |
| `@astrojs/image` (deprecated) | Removed in Astro 3+. Image optimization is now built into Astro core via `astro:assets`. | Built-in `<Image>` component from `astro:assets` |
| Tailwind CSS v3 config file | v4 eliminated `tailwind.config.js`. Configuration happens in CSS with `@theme` directive. Don't create a config file -- it won't work with v4. | CSS-based configuration with `@import "tailwindcss"` |
| `@astrojs/tailwind` integration | Deprecated for Tailwind v4. The old integration was for v3. Tailwind v4 uses `@tailwindcss/vite` plugin directly. | `@tailwindcss/vite` in `astro.config.mjs` vite plugins |
| SPA/client-side routing for landing | Landing pages need perfect SEO. SPAs have hydration delay, JS dependency, and crawl issues. Static HTML is king for marketing. | Astro static output with optional View Transitions |
| Heavy animation libraries (Three.js, Lottie) | Out of scope per PROJECT.md. Adds complexity and load time. Landing pages should load in <1s. | CSS animations + optional `motion` for React islands |

## Stack Patterns by Variant

**If you need a "Latest from Blog" section on the landing page:**
- Use `@tryghost/content-api` at build time in an Astro component
- Fetch the 3 most recent posts and render as static HTML
- Rebuild landing when new posts are published (Cloudflare webhook or scheduled rebuild)

**If you want real-time blog post previews without rebuilds:**
- Use Astro Server Islands (Astro 5 feature) for the blog preview section
- This requires switching from pure static to hybrid output mode
- Recommendation: Start static, add Server Islands only if rebuild frequency becomes a problem

**If the Cloudflare Worker proxy causes issues with Ghost Pro:**
- Ghost Pro Business plan ($25/mo) officially supports subdirectory setups
- Contact Ghost support to configure your subdirectory path before deploying the Worker
- Test with `curl -IL -H 'x-ghost-proxy:true' https://tendhunt.com/blog` to validate
- Fallback: Use blog.tendhunt.com subdomain (worse for SEO but simpler)

**If you want shared design tokens between landing (Astro) and app (Next.js):**
- Extract Tailwind theme values into a shared CSS file or npm package
- Both projects import from the same source
- Do NOT share components -- the frameworks are different (Astro vs React/Next.js)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| astro@5.17.x | @astrojs/react@latest | React 19 supported in Astro 5 |
| astro@5.17.x | @astrojs/sitemap@3.7.x | Current stable pairing |
| tailwindcss@4.1.x | @tailwindcss/vite@4.x | Must use together. Do NOT mix v3 config with v4 runtime |
| @tryghost/admin-api@1.14.4 | Ghost 5.x API v6.0 | Set `version: "v6.0"` in client config. Lexical format supported. |
| @tryghost/content-api@1.12.3 | Ghost 5.x API | Use for reading published content only |
| wrangler@latest | Cloudflare Pages + Workers | Single CLI for both Pages deployment and Worker management |

## Ghost Pro Plan Requirements

| Feature | Starter ($9/mo) | Creator ($25/mo) | Team ($50/mo) |
|---------|-----------------|-------------------|---------------|
| Subdirectory support | No | No | No |
| Custom integrations | Yes | Yes | Yes |
| Admin API access | Yes | Yes | Yes |
| Custom domain | Yes | Yes | Yes |

**Critical note:** Ghost's official docs state subdirectory setup is a "paid add-on for the Business plan." However, Ghost has restructured their pricing since that documentation was written. You should contact Ghost support directly to confirm which current plan supports subdirectory configuration. The Cloudflare Worker handles the proxy routing, but Ghost needs to be configured server-side to accept the `X-Forwarded-Host` header correctly. **Confidence: MEDIUM -- plan/pricing details need direct verification with Ghost.**

## Cloudflare Free Tier Limits (Relevant)

| Resource | Free Tier Limit | Sufficient? |
|----------|----------------|-------------|
| Pages deployments | 500/month | Yes -- even daily deploys are fine |
| Pages bandwidth | Unlimited | Yes |
| Workers requests | 100,000/day | Yes -- blog traffic unlikely to exceed this at launch |
| Workers CPU time | 10ms/request | Yes -- proxy logic is simple |
| Pages build minutes | 500/month | Yes -- Astro builds in seconds |

## Sources

- Astro official docs (Context7 `/withastro/docs`) -- SSG, Cloudflare deployment, View Transitions, Content Collections -- HIGH confidence
- Ghost Admin API docs (Context7 `/llmstxt/ghost_llms-full_txt`) -- Lexical format, Admin API v6.0, JavaScript client -- HIGH confidence
- Tailwind CSS v4 docs (Context7 `/websites/tailwindcss`) -- Vite plugin, Astro integration, v4 setup -- HIGH confidence
- [Ghost subdirectory setup](https://ghost.org/help/run-ghost-from-a-subdirectory/) -- Official Ghost docs on reverse proxy requirements -- HIGH confidence
- [Cloudflare Worker Ghost proxy](https://cloak.ist/blog/how-to-put-a-ghost-blog-at-a-subdirectory-using-cloudflare-workers) -- Working implementation code -- MEDIUM confidence
- [Astro npm](https://www.npmjs.com/package/astro) -- Version 5.17.x confirmed -- HIGH confidence
- [Tailwind CSS v4 release](https://tailwindcss.com/blog/tailwindcss-v4) -- v4.0 released Jan 22, 2025. v4.1.18 current on npm -- HIGH confidence
- [@tryghost/admin-api npm](https://www.npmjs.com/package/@tryghost/admin-api) -- v1.14.4 latest -- HIGH confidence
- [@tryghost/content-api npm](https://www.npmjs.com/package/@tryghost/content-api) -- v1.12.3 latest -- HIGH confidence
- [Astro Cloudflare deployment docs](https://docs.astro.build/en/guides/deploy/cloudflare/) -- Official adapter and deployment guide -- HIGH confidence
- [astro-seo npm](https://www.npmjs.com/package/astro-seo) -- v1.1.0 latest -- MEDIUM confidence
- [Ghost Pro pricing/subdirectory plan requirements](https://ghost.org/help/run-ghost-from-a-subdirectory/) -- States Business plan needed, but pricing restructured -- MEDIUM confidence (verify directly with Ghost)

---
*Stack research for: TendHunt Landing Page + Ghost Blog*
*Researched: 2026-02-11*
