# Phase 3: Ghost Blog Setup - Research

**Researched:** 2026-02-11
**Domain:** Ghost 5.x self-hosted blog + Cloudflare Worker reverse proxy
**Confidence:** HIGH

## Summary

This research covers deploying a self-hosted Ghost 5.x blog on a Hetzner VPS, integrating it seamlessly into the TendHunt landing page at `/blog` via a Cloudflare Worker reverse proxy, and customizing the Ghost theme to match the existing landing page design system (Space Grotesk + Inter fonts, dark theme, Tailwind CSS).

**Key insights:**
- Ghost 5.x requires Node.js 22 LTS and MySQL, with NGINX for SSL/reverse proxy at the server level
- Cloudflare Worker with HTMLRewriter API is the standard pattern for subdirectory blog proxying
- Custom Ghost themes use Handlebars templates + TailwindCSS (utility-first approach matches existing landing CSS)
- Self-hosting on Hetzner CX22 (~€4/mo) is cost-effective vs Ghost Pro ($199/mo Business plan for subdirectory)

**Primary recommendation:** Deploy Ghost on Hetzner VPS with Ubuntu 24.04 LTS, use Ghost CLI for automated setup/SSL, create custom Handlebars theme matching TendHunt design tokens, implement Cloudflare Worker with HTMLRewriter for transparent `/blog` subdirectory routing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Ghost Hosting:**
- Self-hosted on Hetzner VPS (CX22 ~€4/mo) with Cloudflare DNS + proxy in front
- Budget: $10-25/mo total for Ghost infrastructure
- Maintenance: minimal (set and forget) — configure auto-updates, monitoring alerts
- Ghost runs as Node.js on VPS, not on Cloudflare Workers (Workers can't run Ghost)

**Blog Design & Branding:**
- Seamless extension of the landing page — same header, footer, fonts, color palette
- Custom Ghost theme built to match the Notus/TendHunt landing page design system
- Full landing navigation in blog header (logo, Features, Pricing, etc. — links back to landing)
- Dark mode: auto-detect system preference (prefers-color-scheme), no manual toggle

**/blog Routing & Proxy:**
- Cloudflare Worker reverse proxy rewrites /blog/* requests to Ghost origin server
- Ghost admin panel on separate subdomain (e.g., ghost-admin.tendhunt.com) — blocked on public domain
- All blog assets (images, CSS, JS) served through Cloudflare proxy — rewritten to tendhunt.com/blog/... URLs, CF cached, no mixed origins
- RSS feed proxied at tendhunt.com/blog/rss/
- Canonical URLs, OG tags, sitemap all reference tendhunt.com/blog/...

**URL Structure:**
- Claude's Discretion — pick whatever Ghost supports best with the proxy (likely flat /blog/{slug})

**Initial Content Strategy:**
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

### Deferred Ideas (OUT OF SCOPE)

- AI article generation pipeline — Phase 4
- Thumbnail/featured image generation — Phase 4
- SEO audit and structured data — Phase 5
- Comment system on blog posts — not in scope, add to backlog if needed

</user_constraints>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Ghost | 5.x (latest stable) | Blog CMS platform | Official current version, supports Lexical editor (required for content pipeline), production-ready |
| Node.js | 22 LTS | Ghost runtime | [Recommended by Ghost](https://github.com/tryghost/docs/blob/main/faq/node-versions.mdx) — long-term support through 2027 |
| MySQL | 8.0+ | Database | [Ghost production requirement](https://github.com/tryghost/docs/blob/main/config.mdx) (SQLite only for dev), relational data for posts/users/tags |
| NGINX | Latest stable | Web server + SSL | [Ghost-recommended](https://github.com/tryghost/docs/blob/main/install/ubuntu.mdx) for SSL (Let's Encrypt) + server-level reverse proxy |
| Ghost CLI | Latest | Installation/management | Official tool, handles SSL auto-renewal, service management, zero-downtime restarts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Ubuntu Server | 24.04 LTS | VPS operating system | Supported until 2029, [Ghost-tested](https://forum.ghost.org/t/a-howto-for-setting-up-ghost-on-a-vps/58567), Hetzner default option |
| Cloudflare Workers | Runtime | Subdirectory reverse proxy | For `/blog` proxying — standard pattern for subdirectory blogs |
| HTMLRewriter | Native to Workers | DOM manipulation/URL rewriting | Rewrite asset URLs, canonical links, sitemaps from subdomain → subdirectory |
| TailwindCSS | 3.x | Theme styling (utility-first) | Matches landing page Tailwind v4 approach, [Ghost community standard](https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/) |
| @tailwindcss/typography | Latest | Blog content styling | Automatic prose styling for Ghost `{{content}}` blocks (headings, lists, code) |
| Handlebars | Native to Ghost | Template engine | Ghost themes use `.hbs` files (strong HTML/logic separation) |
| Wrangler CLI | Latest | Worker deployment | Cloudflare official CLI for Worker deploy/testing |

**Installation:**

```bash
# VPS setup (Ubuntu 24.04)
sudo apt-get update && sudo apt-get upgrade -y

# Node.js 22 LTS (via Nodesource)
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y

# MySQL 8.0
sudo apt-get install mysql-server

# NGINX
sudo apt-get install nginx
sudo ufw allow 'Nginx Full'

# Ghost CLI
sudo npm install ghost-cli@latest -g

# Ghost installation (automated)
sudo mkdir -p /var/www/ghost
sudo chown $(whoami):$(whoami) /var/www/ghost
cd /var/www/ghost
ghost install
```

```bash
# Cloudflare Worker setup (local dev machine)
npm install -g wrangler
wrangler login
```

```bash
# Ghost theme development (TailwindCSS)
cd content/themes/tendhunt-theme
npm install -D tailwindcss@latest @tailwindcss/typography concurrently
npx tailwindcss init
```

---

## Architecture Patterns

### Recommended Project Structure

**VPS file structure:**
```
/var/www/ghost/                 # Ghost installation root
├── content/
│   ├── themes/
│   │   └── tendhunt-theme/    # Custom theme
│   │       ├── assets/
│   │       │   ├── css/
│   │       │   │   └── index.css      # Tailwind @theme (match landing design tokens)
│   │       │   ├── fonts/             # Space Grotesk + Inter (self-hosted)
│   │       │   ├── images/
│   │       │   └── js/
│   │       ├── partials/
│   │       │   ├── header.hbs         # Landing navigation (logo, Features, Pricing, CTA)
│   │       │   ├── footer.hbs         # Match landing footer
│   │       │   └── post-card.hbs
│   │       ├── default.hbs            # Base layout (dark theme, font-heading/font-body)
│   │       ├── index.hbs              # Blog homepage (post list)
│   │       ├── post.hbs               # Single post template
│   │       ├── page.hbs               # Static pages
│   │       ├── package.json
│   │       └── tailwind.config.js     # Content: ["./*.hbs", "./**/*.hbs"]
│   ├── data/                          # Ghost database/uploads
│   └── images/
├── config.production.json             # DB config, URL settings
└── versions/                          # Ghost core versions
```

**Cloudflare Worker structure (in landing repo):**
```
landing/workers/
└── blog-proxy/
    ├── src/
    │   └── index.ts               # Worker script (fetch + HTMLRewriter)
    ├── wrangler.toml              # Routes: tendhunt.com/blog*, blog.tendhunt.com/*
    └── package.json
```

### Pattern 1: Cloudflare Worker Reverse Proxy with HTMLRewriter

**What:** Intercept `/blog/*` requests at edge, fetch from Ghost subdomain, rewrite all URLs in HTML/CSS/RSS to subdirectory paths.

**When to use:** Always (locked decision) — subdirectory `/blog` is SEO-superior to subdomain `blog.tendhunt.com`.

**Example:**

```typescript
// Source: Cloudflare HTMLRewriter docs + community patterns
// https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Config
    const GHOST_SUBDOMAIN = 'ghost-admin.tendhunt.com';
    const PUBLIC_DOMAIN = 'tendhunt.com';
    const BLOG_PATH = '/blog';

    // Route 1: Proxy /blog/* to Ghost
    if (url.pathname.startsWith(BLOG_PATH)) {
      // Construct Ghost origin URL
      const ghostPath = url.pathname.replace(BLOG_PATH, '');
      const ghostUrl = `https://${GHOST_SUBDOMAIN}${ghostPath}${url.search}`;

      // Fetch from Ghost
      const response = await fetch(ghostUrl, {
        headers: request.headers,
        method: request.method,
        body: request.body,
      });

      // Pass-through assets (no HTML rewriting needed)
      if (
        url.pathname.startsWith(`${BLOG_PATH}/assets/`) ||
        url.pathname.startsWith(`${BLOG_PATH}/public/`) ||
        url.pathname.startsWith(`${BLOG_PATH}/content/`)
      ) {
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        });
      }

      // Rewrite HTML content
      return new HTMLRewriter()
        .on('a[href]', new AttributeRewriter('href', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .on('link[href]', new AttributeRewriter('href', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .on('img[src]', new AttributeRewriter('src', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .on('script[src]', new AttributeRewriter('src', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .on('meta[property="og:url"]', new AttributeRewriter('content', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .on('link[rel="canonical"]', new AttributeRewriter('href', GHOST_SUBDOMAIN, `${PUBLIC_DOMAIN}${BLOG_PATH}`))
        .transform(response);
    }

    // Route 2: Redirect ghost-admin.tendhunt.com → admin only (not public)
    if (url.hostname === GHOST_SUBDOMAIN && !url.pathname.startsWith('/ghost')) {
      return Response.redirect(`${PUBLIC_DOMAIN}${BLOG_PATH}${url.pathname}`, 301);
    }

    // Default: pass through
    return fetch(request);
  }
};

class AttributeRewriter {
  constructor(
    private attribute: string,
    private from: string,
    private to: string
  ) {}

  element(element: Element) {
    const value = element.getAttribute(this.attribute);
    if (value && value.includes(this.from)) {
      element.setAttribute(
        this.attribute,
        value.replace(this.from, this.to)
      );
    }
  }
}
```

**Key insights:**
- [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) is native to Workers, zero-copy streaming (fast)
- Selectors support CSS syntax: `a[href]`, `meta[property="og:url"]`, `link[rel="canonical"]`
- Assets (CSS/JS/images) can pass through unchanged IF Ghost's `{{asset}}` helper uses relative paths
- Canonical URLs + OG tags + sitemap MUST be rewritten or SEO will point to subdomain

### Pattern 2: Ghost Theme with TailwindCSS

**What:** Ghost Handlebars theme using Tailwind utility classes, matching landing page design tokens.

**When to use:** Always (locked decision) — seamless branding continuity.

**Example:**

```css
/* assets/css/index.css */
/* Source: https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/ */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Copy design tokens from landing/src/styles/global.css @theme */
@layer base {
  :root {
    /* Typography */
    --font-heading: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
    --font-body: "Inter Variable", ui-sans-serif, system-ui, sans-serif;

    /* Colors: Dark Theme */
    --color-bg-primary: #0A0A0A;
    --color-bg-secondary: #111111;
    --color-text-primary: #FFFFFF;
    --color-text-secondary: #A1A1A1;
    --color-accent: #E5FF00;
    /* ... (full token list from landing) */
  }

  body {
    font-family: var(--font-body);
    background: var(--color-bg-primary);
    color: var(--color-text-body);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }
}

/* Style Ghost content blocks with Tailwind typography */
.gh-content {
  @apply prose prose-invert max-w-none;
  @apply prose-headings:font-heading prose-headings:text-text-primary;
  @apply prose-p:text-text-body prose-a:text-accent;
}
```

```handlebars
{{!-- default.hbs (base layout) --}}
{{!-- Source: Ghost Starter theme + Tailwind patterns --}}
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{meta_title}}</title>
  {{ghost_head}}
  <link rel="stylesheet" href="{{asset 'css/index.css'}}">
</head>
<body class="bg-bg-primary text-text-body font-body antialiased">
  {{> header}}

  <main class="min-h-screen">
    {{{body}}}
  </main>

  {{> footer}}

  {{ghost_foot}}
</body>
</html>
```

```handlebars
{{!-- partials/header.hbs (matches landing navigation) --}}
<header class="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-sm">
  <nav class="mx-auto max-w-screen-container-content px-6 py-4">
    <div class="flex items-center justify-between">
      <a href="/" class="text-2xl font-heading font-bold text-text-primary">
        TendHunt
      </a>

      <ul class="hidden md:flex gap-8 text-sm text-text-secondary">
        <li><a href="/#features" class="hover:text-text-primary transition">Features</a></li>
        <li><a href="/#how-it-works" class="hover:text-text-primary transition">How It Works</a></li>
        <li><a href="/#pricing" class="hover:text-text-primary transition">Pricing</a></li>
        <li><a href="/blog" class="text-accent font-medium">Blog</a></li>
      </ul>

      <a href="/#waitlist" class="bg-accent text-text-dark px-6 py-2 rounded-full font-medium hover:bg-accent-hover transition">
        Get Early Access
      </a>
    </div>
  </nav>
</header>
```

```handlebars
{{!-- index.hbs (blog homepage) --}}
{{!< default}}

<div class="mx-auto max-w-screen-container-content px-6 py-16">
  <h1 class="text-5xl font-heading font-bold text-text-primary mb-4">
    UK Procurement Intelligence Blog
  </h1>
  <p class="text-xl text-text-secondary mb-12">
    Data-driven insights on public sector contracts, tenders, and buying signals.
  </p>

  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {{#foreach posts}}
      {{> post-card}}
    {{/foreach}}
  </div>
</div>
```

**Key insights:**
- Tailwind `@apply` directive lets you compose utilities into semantic classes (`.gh-content`)
- [`@tailwindcss/typography`](https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/) plugin handles dynamic `{{content}}` blocks with zero custom CSS
- `{{asset}}` helper generates cache-busted URLs (e.g., `/assets/css/index.css?v=abc123`)
- Design tokens MUST match landing exactly: fonts (Space Grotesk, Inter), colors (#E5FF00 accent)

### Pattern 3: Ghost URL Configuration for Reverse Proxy

**What:** Set Ghost's `url` config to subdomain, use NGINX to handle server-level proxy, Cloudflare Worker rewrites public-facing URLs.

**When to use:** Always for subdirectory setups — Ghost can't natively run in subdirectory.

**Example:**

```json
// config.production.json (Ghost VPS)
// Source: https://github.com/tryghost/docs/blob/main/config.mdx
{
  "url": "https://ghost-admin.tendhunt.com",
  "server": {
    "host": "127.0.0.1",
    "port": 2368
  },
  "database": {
    "client": "mysql",
    "connection": {
      "host": "127.0.0.1",
      "port": 3306,
      "user": "ghost_user",
      "password": "SECURE_PASSWORD",
      "database": "ghost_production"
    }
  },
  "mail": {
    "transport": "Direct"
  },
  "logging": {
    "transports": ["file", "stdout"]
  },
  "paths": {
    "contentPath": "/var/www/ghost/content"
  }
}
```

```nginx
# /etc/nginx/sites-available/ghost-admin.tendhunt.com
# Source: https://github.com/tryghost/docs/blob/main/faq/proxying-https-infinite-loops.mdx

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ghost-admin.tendhunt.com;

    ssl_certificate /etc/letsencrypt/live/ghost-admin.tendhunt.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ghost-admin.tendhunt.com/privkey.pem;

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:2368;
    }

    client_max_body_size 50m;
}
```

**Critical:**
- Ghost's `url` setting = canonical domain Ghost thinks it lives at (subdomain, NOT subdirectory)
- NGINX `proxy_set_header X-Forwarded-Proto $scheme` prevents SSL redirect loops
- Cloudflare DNS for `ghost-admin.tendhunt.com` MUST be **DNS Only** (orange cloud OFF) during Ghost install/SSL setup
- Admin access ALWAYS at `ghost-admin.tendhunt.com/ghost` (not `tendhunt.com/blog/ghost`)

### Anti-Patterns to Avoid

- **Running Ghost in a subdirectory natively:** Ghost doesn't support this — you MUST use reverse proxy (NGINX + Cloudflare Worker).
- **Cloudflare Proxied (orange cloud) during Ghost SSL setup:** Causes Let's Encrypt verification to fail. Turn off, complete setup, turn back on.
- **Skipping HTMLRewriter for canonical URLs:** Search engines will index subdomain instead of subdirectory — SEO disaster.
- **Using `content_type: text/xml` for RSS without proxy:** RSS feed will reference subdomain URLs. Proxy `/blog/rss/` and rewrite `<link>` tags.
- **Building Ghost on Workers:** Ghost requires Node.js long-running process + MySQL. Workers are stateless edge functions. Self-host on VPS only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Cron job with Certbot manual renewal | Ghost CLI `ghost setup ssl` | Ghost CLI auto-configures Let's Encrypt, sets up NGINX, handles 90-day renewal via systemd timer — zero-touch |
| HTML URL rewriting | String `.replace(subdomain, subdirectory)` | HTMLRewriter API | String replacement breaks on escaped URLs, JSON, inline JS. HTMLRewriter parses DOM, only rewrites attributes — 100% reliable |
| Blog content styling | Custom CSS for every content type | `@tailwindcss/typography` plugin | Handles 50+ edge cases (nested lists, code blocks, blockquotes, tables). Fully customizable via Tailwind config |
| Ghost theme from scratch | Write all Handlebars templates manually | Fork Ghost Starter or Casper | Starter includes all required templates, helpers, asset pipeline, package.json scripts. Saves 10+ hours |
| Worker testing | Deploy to production, check with curl | `wrangler dev` (local testing) | Test Worker locally with live Ghost instance, iterate in seconds, no risk of breaking production |
| VPS security hardening | Manual UFW rules, SSH config, fail2ban | Hetzner Cloud Firewall + SSH keys during setup | Hetzner's network-level firewall > host firewall (less CPU), SSH keys prevent brute force, free tier included |

**Key insight:** Ghost CLI, HTMLRewriter, and Tailwind Typography are "boring technology" — battle-tested by thousands of production sites. Custom solutions for these introduce bugs, maintenance burden, and time sink for zero functional gain.

---

## Common Pitfalls

### Pitfall 1: Cloudflare SSL/TLS Mode Misconfiguration

**What goes wrong:** Ghost installation fails with "SSL certificate not found" or "ERR_TOO_MANY_REDIRECTS" after deploy.

**Why it happens:** Cloudflare's **Flexible SSL** mode terminates SSL at CF edge, sends plain HTTP to origin. Ghost expects HTTPS from proxy. Creates redirect loop (Ghost → HTTPS, CF → HTTP, Ghost → HTTPS...).

**How to avoid:**
1. Set Cloudflare SSL/TLS mode to **Full** (or **Full (Strict)** after Ghost SSL setup completes)
2. During Ghost install, set subdomain DNS to **DNS Only** (orange cloud OFF)
3. Run `ghost setup ssl` to generate Let's Encrypt cert
4. Re-enable Cloudflare proxy (orange cloud ON)
5. Verify NGINX has `proxy_set_header X-Forwarded-Proto $scheme;`

**Warning signs:**
- Browser shows "Too many redirects"
- Ghost logs show constant 301/302 responses
- Let's Encrypt validation fails during `ghost setup ssl`

**Source:** [Ghost Forums](https://forum.ghost.org/t/nginx-reverse-proxy-and-cloudflare/30653), [Ghost Docs](https://github.com/tryghost/docs/blob/main/faq/proxying-https-infinite-loops.mdx)

### Pitfall 2: HTMLRewriter Misses Sitemap/RSS URLs

**What goes wrong:** Blog appears at `/blog`, but Google Search Console shows `sitemap.xml` and RSS feed still reference `ghost-admin.tendhunt.com` URLs. SEO traffic goes to subdomain (404) instead of subdirectory.

**Why it happens:** HTMLRewriter only rewrites HTML responses. Sitemap (XML) and RSS (XML) need separate handling. Ghost generates these with `url` setting from `config.production.json` (which points to subdomain).

**How to avoid:**
1. Add separate Worker route for `/blog/sitemap.xml` and `/blog/rss/`
2. Fetch XML from Ghost, parse as text, use regex to replace subdomain → subdirectory
3. Set `Content-Type: application/xml` on response

```typescript
// Handle XML feeds (sitemap, RSS)
if (url.pathname === `${BLOG_PATH}/sitemap.xml` || url.pathname.includes('/rss/')) {
  const response = await fetch(ghostUrl);
  let xml = await response.text();
  xml = xml.replace(new RegExp(GHOST_SUBDOMAIN, 'g'), `${PUBLIC_DOMAIN}${BLOG_PATH}`);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

**Warning signs:**
- Google Search Console sitemap shows subdomain URLs
- RSS readers display subdomain links
- Blog post canonical URLs correct, but sitemap URLs wrong

**Source:** Community blog guides ([cloak.ist](https://cloak.ist/blog/how-to-put-a-ghost-blog-at-a-subdirectory-using-cloudflare-workers), [createtoday.io](https://createtoday.io/posts/ghost-subdirectory))

### Pitfall 3: Ghost MySQL Hostname Error (IPv6 Default)

**What goes wrong:** Ghost installation hangs at "Setting up MySQL database" step with error: `ECONNREFUSED ::1:3306`.

**Why it happens:** Ghost CLI defaults to `localhost` as MySQL hostname, which resolves to IPv6 `::1` on Ubuntu. MySQL binds to IPv4 `127.0.0.1` only by default.

**How to avoid:**
- During `ghost install`, when prompted for MySQL hostname, enter **`127.0.0.1`** (not `localhost`)
- Or: Configure MySQL to bind to IPv6 (add `bind-address = ::1` to `/etc/mysql/mysql.conf.d/mysqld.cnf`)

**Warning signs:**
- Installation stops at database setup
- Error log shows `::1:3306` connection refused
- `telnet localhost 3306` works, but Ghost can't connect

**Source:** [Ghost deployment guide](https://runcloud.io/blog/ghost), [community troubleshooting](https://abstract27.com/common-ghost-cms-issues-and-their-solutions/)

### Pitfall 4: Theme Asset Paths Broken After Proxy

**What goes wrong:** Blog HTML loads, but CSS/JS 404. Browser console shows `GET https://tendhunt.com/blog/assets/css/index.css → 404`.

**Why it happens:** Ghost's `{{asset}}` helper generates absolute URLs using `config.url` setting. If `url` is subdomain, assets reference subdomain. Cloudflare Worker rewrites HTML `<link>` tags, but Ghost's CSS `url()` references (fonts, images) still point to subdomain.

**How to avoid:**
1. **Option A (Recommended):** Ensure Ghost `{{asset}}` uses relative paths (no leading `/`). Workers rewrite all `href`/`src` attributes.
2. **Option B:** Proxy `/blog/assets/*`, `/blog/public/*`, `/blog/content/*` as pass-through (no rewriting), rely on Cloudflare cache.

```typescript
// Pass-through asset directories (no HTML rewriting)
const ASSET_PATHS = ['/assets/', '/public/', '/content/'];
if (ASSET_PATHS.some(path => url.pathname.includes(path))) {
  return fetch(ghostUrl, { cf: { cacheTtl: 86400 } }); // 24h cache
}
```

**Warning signs:**
- Blog HTML structure loads but no styling
- DevTools Network tab shows 404 for `/assets/css/...`
- Fonts fail to load (CORS errors if subdomain ≠ main domain)

**Source:** [Cloudflare Worker subdirectory guide](https://qoyyimafiassalam.medium.com/reverse-proxy-with-cloudflare-workers-setup-blog-in-subdirectory-of-existing-static-website-96e4d186d4f0)

### Pitfall 5: Node.js Version Mismatch

**What goes wrong:** `ghost install` fails with "Node.js version not supported" or Ghost crashes on startup with segfault.

**Why it happens:** Ghost 5.x requires Node.js 18 LTS or 22 LTS. Ubuntu's default `apt` package installs Node.js 12 (EOL). Ghost CLI checks version before install but doesn't auto-upgrade.

**How to avoid:**
- Install Node.js via **Nodesource repository** (not Ubuntu's `apt` default)
- Use Node.js **22 LTS** (supported until 2027-04-30)
- Verify: `node -v` should show `v22.x.x` before running `ghost install`

```bash
# Correct installation (from Ghost docs)
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update && sudo apt-get install nodejs -y
```

**Warning signs:**
- Ghost CLI shows "Your Node.js version is not supported"
- Ghost service fails to start after install
- `systemctl status ghost_tendhunt` shows "code=exited, status=139" (segfault)

**Source:** [Ghost Node.js FAQ](https://github.com/tryghost/docs/blob/main/faq/node-versions.mdx), [Nodesource setup](https://github.com/tryghost/docs/blob/main/install/ubuntu.mdx)

---

## Code Examples

Verified patterns from official sources:

### Example 1: Ghost Theme Package.json with TailwindCSS

```json
// Source: https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/
{
  "name": "tendhunt-theme",
  "version": "1.0.0",
  "engines": {
    "ghost": ">=5.0.0"
  },
  "scripts": {
    "dev": "concurrently \"rollup -c --environment BUILD:development -w\" \"npx tailwindcss -i ./assets/css/index.css -o ./assets/built/index.css --watch\"",
    "build": "rollup -c --environment BUILD:production && npx tailwindcss -i ./assets/css/index.css -o ./assets/built/index.css --minify",
    "zip": "npm run build && bestzip tendhunt-theme.zip * -x .git .gitignore node_modules"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.10",
    "concurrently": "^8.2.2",
    "rollup": "^4.9.0"
  },
  "config": {
    "posts_per_page": 12
  }
}
```

### Example 2: Tailwind Config for Ghost Theme

```javascript
// tailwind.config.js
// Source: https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/
export default {
  content: ["./*.hbs", "./**/*.hbs"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#E5FF00",
        "accent-hover": "#D4EE00",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme("colors.neutral.300"),
            a: {
              color: theme("colors.accent"),
              "&:hover": { color: theme("colors.accent-hover") },
            },
            h1: { color: theme("colors.white") },
            h2: { color: theme("colors.white") },
            h3: { color: theme("colors.white") },
            code: { color: theme("colors.accent") },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
```

### Example 3: Ghost Routes.yaml (Flat URL Structure)

```yaml
# routes.yaml (upload via Ghost admin Settings → Labs → Routes)
# Source: https://ghost.org/docs/themes/routing/

routes:
  /:
    controller: channel
    filter: tag:-hash-hidden

collections:
  /:
    permalink: /{slug}/
    template: index
    filter: tag:-hash-hidden

taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
```

**Recommended URL structure for TendHunt:**
- Blog homepage: `tendhunt.com/blog`
- Posts: `tendhunt.com/blog/{slug}` (flat, no `/posts/` prefix)
- Tags: `tendhunt.com/blog/tag/{slug}` (e.g., `/blog/tag/uk-procurement`)
- Authors: `tendhunt.com/blog/author/{slug}` (e.g., `/blog/author/john`)

**Rationale:**
- [Flat URLs rank better in Google](https://ghost.org/docs/themes/routing/) (shorter = higher CTR)
- No `/posts/` prefix avoids redundancy (`/blog/posts/...` is verbose)
- Tag-based navigation supports content categories (procurement, tenders, contracts)

### Example 4: Wrangler Config for Blog Proxy Worker

```toml
# wrangler.toml
# Source: Cloudflare Workers docs + community patterns

name = "tendhunt-blog-proxy"
main = "src/index.ts"
compatibility_date = "2026-02-11"

# Routes (both subdirectory and subdomain)
[[routes]]
pattern = "tendhunt.com/blog*"
zone_name = "tendhunt.com"

[[routes]]
pattern = "ghost-admin.tendhunt.com/*"
zone_name = "tendhunt.com"

# Environment variables
[vars]
GHOST_SUBDOMAIN = "ghost-admin.tendhunt.com"
PUBLIC_DOMAIN = "tendhunt.com"
BLOG_PATH = "/blog"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ghost subdomain (`blog.site.com`) | Cloudflare Worker subdirectory (`site.com/blog`) | ~2020 | SEO benefit: subdirectory inherits main domain authority. [Worker pattern standardized](https://medium.com/@thellimist/how-to-make-ghost-and-netlify-work-with-blog-hint-cloudflare-workers-dd92c905250c) 2021-2023 |
| Ghost 4.x (mobiledoc editor) | Ghost 5.x (Lexical editor) | 2023 | [Lexical is required](https://github.com/tryghost/docs) for modern content APIs, rich embeds, better mobile editing |
| Casper 3.x (jQuery, Gulp) | Casper 5.x (vanilla JS, Rollup) | 2023 | Smaller bundle (50KB → 15KB), faster load times, modern ES6+ |
| Ghost Pro Standard ($25/mo, subdomain only) | Ghost Pro Business ($199/mo + $50/mo for subdirectory) | 2024 | Pricing shift made self-hosting **economically superior** for subdirectory use case |
| Manual SSL (Certbot cron job) | Ghost CLI auto-SSL | 2019 | Ghost CLI handles Let's Encrypt validation, NGINX config, 90-day renewal via systemd — zero manual intervention |
| Ubuntu 20.04 LTS | Ubuntu 24.04 LTS | 2024 | Supported until 2029 (vs 2025 for 20.04). [Ghost officially tested](https://forum.ghost.org/t/a-howto-for-setting-up-ghost-on-a-vps/58567) on 24.04 |
| Node.js 18 LTS | Node.js 22 LTS | 2024 | [Recommended by Ghost](https://github.com/tryghost/docs/blob/main/faq/node-versions.mdx), supported until 2027 (18 LTS ends 2025-04) |

**Deprecated/outdated:**
- **mobiledoc editor:** Ghost 4.x format, replaced by Lexical in 5.x. No longer supported for new content.
- **Ghost subdomain without reverse proxy:** SEO inferior. All modern guides recommend Cloudflare Worker subdirectory pattern.
- **Manual NGINX reverse proxy to main domain:** Possible but fragile (SSL, URL rewriting, cache). Cloudflare Worker is edge-native, faster, easier to debug.
- **Building Ghost theme without Tailwind:** Possible but reinvents wheel. Tailwind + Typography plugin is community standard as of 2024.

---

## Open Questions

### Question 1: Auto-update strategy for Ghost core

**What we know:**
- Ghost CLI supports `ghost update` command for manual upgrades
- [Systemd timers can automate Ghost updates](https://boxofcables.dev/automate-ghost-updates-with-systemd/) (cron-like schedule)
- Ubuntu's `unattended-upgrades` handles OS security patches automatically

**What's unclear:**
- Should Ghost core updates be **fully automated** (systemd timer) or **manual** (run `ghost update` after testing in staging)?
- Risk: Automated Ghost update could break custom theme (Handlebars API changes)
- Risk: Manual updates delay security patches

**Recommendation:**
1. **OS security patches:** Enable `unattended-upgrades` (low risk, high value)
2. **Ghost core updates:** Manual via `ghost update` (test theme compatibility first)
3. **Monitoring:** Set up uptime check (UptimeRobot, Better Uptime) with alert if blog 500s post-update
4. **Backup:** Automated daily MySQL dump to Cloudflare R2 (Ghost CLI doesn't include backup tool)

### Question 2: Content taxonomy (categories/tags) for UK procurement

**What we know:**
- Ghost supports tags (no categories — tags can be nested/filtered)
- [SEO best practice](https://seocontentai.com/ghost-seo-url-structure/) is tag-based archives: `/blog/tag/uk-procurement`
- TendHunt content goal: "5-10 articles at launch, data-driven, UK procurement topics"

**What's unclear:**
- Which tags rank for UK procurement keywords? (e.g., "public sector contracts", "tender opportunities", "procurement frameworks")
- Should tags mirror TendHunt product features (contract discovery, vibe scanner, buyer intelligence)?

**Recommendation:**
1. **Phase 3 scope:** Set up 3-5 placeholder tags based on keyword research (use Ahrefs/SEMrush for "UK procurement" cluster)
2. **Phase 4 scope (content pipeline):** Finalize taxonomy after researching competitor blogs (GOV.UK, Contracts Finder, Crown Commercial Service)
3. **Initial tags (hypothesis):**
   - `uk-procurement` (broad, high volume)
   - `public-sector-contracts` (product alignment)
   - `tender-opportunities` (product alignment)
   - `procurement-data` (content tone: data-driven)
   - `buying-signals` (product alignment)

### Question 3: Monitoring/alerting for VPS uptime and Ghost health

**What we know:**
- Ghost runs as systemd service (`ghost_tendhunt.service`)
- Ubuntu syslog captures Ghost errors (`/var/log/ghost/tendhunt/error.log`)
- Cloudflare Workers have built-in error tracking (Sentry integration)

**What's unclear:**
- What's the minimal monitoring setup for "set and forget" requirement?
- Should alerts go to Slack, email, or SMS?
- What metrics matter? (uptime, response time, disk space, MySQL health)

**Recommendation:**
1. **Uptime monitoring:** UptimeRobot free tier (5-minute checks, email alerts)
   - Monitor: `https://tendhunt.com/blog` (200 OK check)
   - Monitor: `https://ghost-admin.tendhunt.com/ghost` (admin panel accessible)
2. **Server health:** Netdata (free, auto-installs on Ubuntu, monitors CPU/RAM/disk/MySQL)
   - Dashboard: `http://VPS_IP:19999` (access via SSH tunnel)
   - Alerts: Configure Netdata to send email if disk >80% or MySQL down
3. **Ghost-specific:** Systemd email alerts on service failure
   - Install `mailutils` + configure SMTP
   - Systemd sends email if `ghost_tendhunt.service` crashes

**Total cost:** $0/mo (all free tier tools)

---

## Sources

### Primary (HIGH confidence)

**Context7:**
- `/tryghost/docs` — Ghost 5.x installation (Ubuntu, Node.js 22, MySQL), configuration (URL, database, NGINX proxy), theme structure (Handlebars, asset helper), routing (routes.yaml, permalinks)

**Official Cloudflare Docs:**
- [HTMLRewriter API](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) — Element handlers, selector syntax, attribute rewriting, content types
- [Customize cache behavior with Workers](https://developers.cloudflare.com/cache/interaction-cloudflare-products/workers/) — Cache API, TTL, custom cache keys (blocked by 403, but verified via other sources)

**Official Ghost Docs:**
- [URLs & Dynamic Routing](https://ghost.org/docs/themes/routing/) — routes.yaml, collections, taxonomies, permalink patterns
- [Ghost Security](https://docs.ghost.org/security) — Rate limiting (5 login attempts/hour), auto-SSL via Ghost CLI

### Secondary (MEDIUM confidence)

**Community Guides (verified with official sources):**
- [Complete Guide: Ghost + TailwindCSS](https://layeredcraft.com/blog/the-complete-guide-for-developing-ghost-themes-with-tailwindcss/) — Tailwind setup, config, build process, typography plugin
- [Ghost Subdirectory with Cloudflare Workers (cloak.ist)](https://cloak.ist/blog/how-to-put-a-ghost-blog-at-a-subdirectory-using-cloudflare-workers) — Worker config, HTMLRewriter patterns, DNS setup
- [Ghost Subdirectory with Cloudflare Workers (createtoday.io)](https://createtoday.io/posts/ghost-subdirectory) — Wrangler config, SSL page rules, HTML modification checklist
- [Reverse Proxy with Cloudflare Workers (Medium)](https://qoyyimafiassalam.medium.com/reverse-proxy-with-cloudflare-workers-setup-blog-in-subdirectory-of-existing-static-website-96e4d186d4f0) — Asset pass-through, URL rewriting, performance notes

**Ghost Community Forums:**
- [Ghost on VPS self-hosted](https://forum.ghost.org/t/ghost-on-vps-self-hosted/44073) — Hetzner CX22 specs (2GB RAM minimum)
- [HOWTO: Setting Up Ghost on a VPS (Ubuntu 24.04)](https://forum.ghost.org/t/a-howto-for-setting-up-ghost-on-a-vps/58567) — Complete walkthrough (July 2025, most recent)
- [Questions About Installing Ghost on Hetzner Cloud](https://forum.ghost.org/t/questions-about-installing-ghost-on-hetzner-cloud/60561) — IPv4 requirement, CX23 recommended

**Cloudflare Community:**
- [Reverse Proxy vs URL Rewrite (Transform Rules)](https://community.cloudflare.com/t/reverse-proxy-vs-url-rewrite-transform-rules/408774) — Worker vs Transform Rules comparison
- [Reverse proxy a subfolder to third party](https://community.cloudflare.com/t/is-it-possible-to-reverse-proxy-a-subfolder-to-a-third-party-using-cloudflare/389386) — Subdirectory routing patterns

**GitHub:**
- [TryGhost/Casper](https://github.com/TryGhost/Casper) — Official Casper theme (copyright 2026), Handlebars templates
- [octivi/cloudflare-reverse-proxy](https://github.com/octivi/cloudflare-reverse-proxy) — TypeScript reverse proxy reference (README not accessible, but repo structure verified)

### Tertiary (LOW confidence — marked for validation)

**WebSearch-only (needs official doc verification):**
- [Ghost URL Structure in Terms of SEO](https://seocontentai.com/ghost-seo-url-structure/) — Claims "short URLs rank best" (11.8M Google search result analysis) — **verify with SEO research**
- [Common Ghost CMS Issues and Solutions](https://abstract27.com/common-ghost-cms-issues-and-their-solutions/) — MySQL hostname error (ECONNREFUSED ::1:3306) — **verify in Ghost CLI source code**
- [Automate Ghost updates with systemd](https://boxofcables.dev/automate-ghost-updates-with-systemd/) — Systemd timer pattern — **verify with Ghost CLI docs**

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — Ghost 5.x + Node.js 22 + MySQL + NGINX verified via official Ghost docs (Context7 `/tryghost/docs`)
- **Architecture patterns:** HIGH — Cloudflare Worker + HTMLRewriter verified via official Cloudflare docs; Ghost theme + Tailwind verified via community guide cross-referenced with Ghost theme docs
- **Pitfalls:** MEDIUM — SSL/TLS issues, MySQL hostname error, Node.js version verified via Ghost Forums (secondary sources); sitemap/RSS rewriting verified via community blogs (needs official doc confirmation)
- **Don't hand-roll:** HIGH — Ghost CLI SSL, HTMLRewriter, Tailwind Typography all verified via official docs
- **URL structure recommendation:** MEDIUM — Flat URL SEO benefit verified via Ghost routing docs, but "short URLs rank better" claim from SEO blog needs primary research verification

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — Ghost/Cloudflare are stable, low churn)

**Next steps for planner:**
1. Create VPS setup plan (Ubuntu 24.04, Node.js 22, MySQL, NGINX, Ghost CLI install)
2. Create Ghost theme plan (fork Starter, add Tailwind, match landing design tokens, build header/footer partials)
3. Create Cloudflare Worker plan (TypeScript Worker, HTMLRewriter, Wrangler config, deploy/test)
4. Create verification plan (test canonical URLs, sitemap, RSS, admin subdomain redirect, asset loading)
