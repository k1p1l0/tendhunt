# Phase 1: Foundation - Research

**Researched:** 2026-02-11
**Domain:** Astro 5.x static site with Tailwind CSS v4, base layout, design tokens, Cloudflare Pages deployment
**Confidence:** HIGH

## Summary

Phase 1 establishes the project skeleton: an Astro 5.x static site with Tailwind CSS v4, a base layout (header with sticky scroll effect, footer with oversized tagline), TendHunt design tokens (dark theme, yellow/lime accent, Space Grotesk + Inter fonts), and deployment to Cloudflare Pages. Every subsequent phase builds on this foundation.

The tech stack is well-established and current. Astro 5.17.x is the latest stable version with first-class Tailwind v4 support via `npx astro add tailwind` (which installs `@tailwindcss/vite` automatically). Tailwind v4 eliminates the config file entirely -- all theming happens in CSS via the `@theme` directive. Cloudflare Pages remains fully functional for git-connected static site deployment, though Cloudflare now recommends Workers for new projects. For a pure static site, Pages is simpler and sufficient.

**Primary recommendation:** Use `npm create astro@latest` with the minimal template, add Tailwind v4 via `npx astro add tailwind`, self-host Space Grotesk and Inter fonts via `@fontsource` packages, define all design tokens in a single `global.css` file using Tailwind's `@theme` directive, and deploy to Cloudflare Pages via git-connected CI/CD.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dark background theme (not pure black -- use dark gray/near-black like #0A0A0A or #111)
- Yellow/lime accent color for CTAs and highlight bars (#E5FF00 or similar high-contrast lime)
- Enterprise clean aesthetic -- more whitespace and restraint than the bold Figma template
- Generate a simple text+icon logo for TendHunt during this phase (minimal, modern)
- Standard nav with 5-6 items: How It Works, Features, Pricing, Blog, Log In, **Get Early Access** (CTA button)
- Sticky header with backdrop blur/fade effect on scroll (transparent at top, gains dark bg + blur on scroll)
- Header CTA button text: **"Get Early Access"**
- Follow Figma template alternating pattern: dark hero -> light sections -> dark sections -> yellow/lime stats bar -> FAQ on light -> dark CTA banner -> dark footer
- Max content width: **1280px**
- Full footer with oversized tagline: **"Find contracts. Win business."**
- Footer includes: logo, nav links, social icons (LinkedIn, X), legal links (Terms, Privacy), contact email
- Heading font: **Space Grotesk**
- Bold headings + regular weight body text -- clear hierarchy
- Oversized display text for footer tagline
- Font scale should feel enterprise -- not too large, clean spacing

### Claude's Discretion
- Mobile navigation implementation (hamburger menu recommended)
- Body font pairing with Space Grotesk
- Exact dark background color value
- Section padding/spacing values
- Logo icon design (keep it simple and modern)
- Hover states and micro-interactions
- Footer layout columns and grouping

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `astro` | 5.17.x | Static site generator | Zero JS by default, perfect Lighthouse scores. First-class Tailwind v4 support via `astro add tailwind`. Static output mode pre-renders all pages. |
| `tailwindcss` | 4.1.x | Utility-first CSS | v4 uses CSS-native `@theme` directive for design tokens. No config file. Installed via `@tailwindcss/vite` plugin. |
| `@tailwindcss/vite` | 4.x | Tailwind build integration | How Tailwind v4 integrates with Astro's Vite pipeline. Installed automatically by `npx astro add tailwind`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fontsource-variable/space-grotesk` | latest | Heading font (variable, 300-700) | Self-hosted font with automatic `@font-face` rules. Variable font = single file for all weights. |
| `@fontsource-variable/inter` | latest | Body font (variable, 100-900) | Recommended pairing with Space Grotesk. Clean, highly readable at small sizes. System font stack as fallback. |
| `astro-navbar` | latest | Responsive nav with sticky header | Provides `<StickyHeader>` component with scroll detection + `<Astronav>` for mobile hamburger menu. Headless (no imposed styles). Tiny JS footprint. |
| `astro-seo` | 1.1.0 | SEO meta tag component | Centralizes title, description, OG tags, Twitter Card in one component. Sets up correct meta for Phase 5 polish. |
| `sharp` | latest | Image optimization | Astro uses it for `<Image>` component. Converts to WebP/AVIF at build time. Install as dependency. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@fontsource-variable/*` | Google Fonts `@import` | Google Fonts sends user data to Google. Fontsource self-hosts = better privacy + performance (no external request). |
| `@fontsource-variable/*` | Manual `@font-face` with woff2 files in `public/fonts/` | Works fine but requires manual file management. Fontsource handles font-face declarations, subsetting, and updates automatically. |
| `astro-navbar` | Vanilla JS scroll listener + custom nav | `astro-navbar` is 2KB, headless, handles accessibility (ARIA) and mobile toggle. Rolling your own adds effort for zero benefit. |
| Inter (body font) | System font stack (`-apple-system, BlinkMacSystemFont, ...`) | System fonts load instantly (zero network). Trade-off: less consistent cross-platform appearance. Inter is a safe middle ground -- widely cached, excellent readability. |
| Cloudflare Pages | Cloudflare Workers (static assets) | Workers is the strategic direction. But Pages has simpler git-connected CI/CD, no config needed for static sites, and is still fully supported. Use Pages now, migrate later if needed. |

**Installation:**
```bash
# Create project
npm create astro@latest -- --template minimal tendhunt-landing

# Add Tailwind v4 (installs @tailwindcss/vite automatically)
cd tendhunt-landing
npx astro add tailwind

# Fonts (variable font packages for single-file all-weights)
npm install @fontsource-variable/space-grotesk @fontsource-variable/inter

# Navigation + SEO
npm install astro-navbar astro-seo

# Image optimization (used by Astro's <Image> component)
npm install sharp

# Dev tools
npm install -D wrangler prettier prettier-plugin-astro
```

## Architecture Patterns

### Recommended Project Structure

```
landing/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro       # HTML shell, meta, fonts, global CSS, header + footer
│   ├── components/
│   │   ├── Header.astro            # Sticky nav with scroll effect
│   │   ├── Footer.astro            # Full footer with tagline
│   │   ├── Logo.astro              # TendHunt text+icon logo (SVG)
│   │   ├── MobileNav.astro         # Hamburger menu (via astro-navbar)
│   │   └── Button.astro            # Reusable CTA button component
│   ├── styles/
│   │   └── global.css              # Tailwind import + @theme design tokens + @font-face
│   ├── pages/
│   │   ├── index.astro             # Landing page (uses BaseLayout)
│   │   ├── privacy.astro           # Privacy policy (placeholder)
│   │   └── terms.astro             # Terms of service (placeholder)
│   └── assets/                     # Images processed by Astro <Image>
│       └── logo.svg
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── astro.config.mjs
├── wrangler.jsonc                  # Cloudflare Pages config (static)
├── package.json
├── tsconfig.json
└── .prettierrc
```

### Pattern 1: Tailwind v4 Design Tokens via @theme

**What:** All design tokens (colors, fonts, spacing, container widths) defined in a single CSS file using Tailwind v4's `@theme` directive. No `tailwind.config.js` file -- v4 eliminated it.

**When to use:** Always in Tailwind v4 projects. This IS the configuration mechanism.

**Example:**
```css
/* src/styles/global.css */
@import "tailwindcss";

/* Import fonts -- adds @font-face rules automatically */
@import "@fontsource-variable/space-grotesk";
@import "@fontsource-variable/inter";

@theme {
  /* Typography */
  --font-heading: "Space Grotesk Variable", sans-serif;
  --font-body: "Inter Variable", sans-serif;

  /* Colors -- Dark theme with lime accent */
  --color-bg-primary: #0A0A0A;
  --color-bg-secondary: #111111;
  --color-bg-tertiary: #1A1A1A;
  --color-bg-light: #F5F5F5;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A1A1A1;
  --color-text-body: #D4D4D4;
  --color-accent: #E5FF00;
  --color-accent-hover: #D4EE00;
  --color-border: #2A2A2A;
  --color-border-light: #E5E5E5;

  /* Container -- matches user decision of 1280px max */
  --container-content: 80rem; /* 1280px */

  /* Spacing scale for sections */
  --spacing-section: 6rem;    /* 96px -- section vertical padding */
  --spacing-section-sm: 4rem; /* 64px -- smaller section padding */
}
```

**Source:** Tailwind CSS v4 official docs -- `@theme` directive (Context7, verified HIGH confidence)

### Pattern 2: Astro Base Layout with Global CSS and Component Slots

**What:** A single `BaseLayout.astro` that provides the HTML shell, imports global CSS (which triggers Tailwind + font loading), renders Header and Footer, and uses `<slot />` for page content.

**When to use:** Every page uses this layout. It is the single source for document structure.

**Example:**
```astro
---
// src/layouts/BaseLayout.astro
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { SEO } from 'astro-seo';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'TendHunt - Find and win UK government contracts' } = Astro.props;
---
<!DOCTYPE html>
<html lang="en" class="bg-bg-primary font-body text-text-body">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <SEO
      title={title}
      description={description}
      openGraph={{
        basic: {
          title: title,
          type: 'website',
          image: '/og-image.png',
        },
      }}
    />
  </head>
  <body class="min-h-screen bg-bg-primary">
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

**Source:** Astro official docs -- Layouts, BaseLayout patterns (Context7, verified HIGH confidence)

### Pattern 3: Sticky Header with Scroll Detection (astro-navbar)

**What:** The `<StickyHeader>` component from `astro-navbar` adds a tiny JS snippet that toggles CSS classes based on scroll position. Combined with Tailwind utilities, this creates the transparent-to-solid header effect the user requested.

**When to use:** For the TendHunt header -- transparent at top, gains dark bg + backdrop blur on scroll.

**Example:**
```astro
---
// src/components/Header.astro
import { Astronav, MenuItems, MenuIcon, StickyHeader } from 'astro-navbar';
import Logo from './Logo.astro';
---
<StickyHeader
  class="sticky top-0 z-50 transition-all duration-300 border-b"
  scrollY={50}
  defaultClass="py-4 border-transparent bg-transparent"
  activeClass="py-3 bg-bg-primary/90 border-border backdrop-blur-lg"
>
  <nav class="mx-auto max-w-[80rem] px-6 flex items-center justify-between">
    <Logo />
    <Astronav closeOnClick>
      <MenuIcon class="block lg:hidden">
        <!-- Hamburger icon SVG -->
      </MenuIcon>
      <MenuItems class="hidden lg:flex items-center gap-8">
        <a href="#how-it-works" class="text-text-secondary hover:text-text-primary transition-colors">How It Works</a>
        <a href="#features" class="text-text-secondary hover:text-text-primary transition-colors">Features</a>
        <a href="#pricing" class="text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
        <a href="/blog" class="text-text-secondary hover:text-text-primary transition-colors">Blog</a>
        <a href="https://app.tendhunt.com/sign-in" class="text-text-secondary hover:text-text-primary transition-colors">Log In</a>
        <a href="#early-access" class="bg-accent text-bg-primary font-heading font-bold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
          Get Early Access
        </a>
      </MenuItems>
    </Astronav>
  </nav>
</StickyHeader>
```

**Source:** astro-navbar GitHub (verified, HIGH confidence)

### Pattern 4: Astro Static Site on Cloudflare Pages

**What:** Pure static HTML output from Astro deployed to Cloudflare Pages via git-connected CI/CD. No adapter needed for static sites.

**When to use:** This is the deployment model for the landing page.

**Configuration:**
```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tendhunt.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap(),
  ],
});
```

```jsonc
// wrangler.jsonc -- for Cloudflare Pages static deployment
{
  "name": "tendhunt-landing",
  "compatibility_date": "2026-02-11",
  "pages_build_output_dir": "./dist"
}
```

**Cloudflare Pages dashboard settings:**
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

**Source:** Astro official Cloudflare deployment docs + Cloudflare Pages docs (verified HIGH confidence)

### Anti-Patterns to Avoid

- **Do NOT create `tailwind.config.js`:** Tailwind v4 eliminated the config file. All configuration happens via `@theme` in CSS. A config file will be ignored or cause conflicts.
- **Do NOT use `@astrojs/tailwind`:** This was the v3 integration. Deprecated for v4. Use `@tailwindcss/vite` plugin instead (installed automatically by `npx astro add tailwind`).
- **Do NOT use `@astrojs/cloudflare` adapter for static sites:** The adapter is for SSR/server-rendered sites. For pure static output, Astro builds to `dist/` and Cloudflare Pages serves it directly. No adapter needed.
- **Do NOT use Google Fonts `@import` URL:** Self-host via Fontsource. Google Fonts adds external dependency, GDPR privacy concerns, and an extra DNS lookup. Fontsource bundles the font with your build.
- **Do NOT add React integration for Phase 1:** The header, footer, and layout are all achievable with pure Astro components. React islands add JS bundle overhead. Only add React in later phases if truly interactive components are needed (e.g., animated hero, complex forms).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive mobile nav with hamburger | Custom JS toggle with event listeners | `astro-navbar` (`<Astronav>`, `<MenuItems>`, `<MenuIcon>`) | Handles ARIA attributes, focus management, mobile toggle, close-on-click, keyboard navigation. 2KB. |
| Sticky header with scroll detection | `IntersectionObserver` or `scroll` event listener | `astro-navbar` `<StickyHeader>` component | Tiny performant JS snippet, class toggling API, `scrollY` threshold config. Tested cross-browser. |
| SEO meta tags (OG, Twitter, canonical) | Manual `<meta>` tags in layout head | `astro-seo` component | Single component manages all meta variants. Type-safe props. Prevents missing tags. |
| Font loading and @font-face rules | Manual woff2 files + CSS @font-face | `@fontsource-variable/*` packages | Auto-generates @font-face, handles subsets, provides variable font with all weights in one file. |
| Image optimization (WebP/AVIF) | Manual Sharp/ImageMagick processing | Astro's built-in `<Image>` component from `astro:assets` | Automatic format conversion, responsive srcset, lazy loading, width/height for CLS prevention. |

**Key insight:** Phase 1 is infrastructure -- spend zero time on custom solutions for solved problems. Every library above is under 5KB or build-time only. The goal is a skeleton that Phase 2 fills with content.

## Common Pitfalls

### Pitfall 1: Tailwind v4 @theme Variables Not Available as Utilities

**What goes wrong:** You define `--color-accent: #E5FF00` in `@theme` but `bg-accent` or `text-accent` doesn't work in HTML.
**Why it happens:** Tailwind v4 generates utility classes from theme variable names. The variable must follow the naming convention: `--color-*` generates `bg-*`, `text-*`, `border-*` etc. If you use `--accent-color` instead of `--color-accent`, no color utility is generated.
**How to avoid:** Always follow Tailwind v4's namespace convention:
- Colors: `--color-{name}` -> `bg-{name}`, `text-{name}`, `border-{name}`
- Fonts: `--font-{name}` -> `font-{name}`
- Spacing: `--spacing` sets the base scale
- Container: `--container-{name}` -> for `@container` queries
**Warning signs:** Tailwind classes appear in HTML but produce no CSS. Browser devtools show no matching rule.

### Pitfall 2: Fontsource Variable Font Import Path

**What goes wrong:** You install `@fontsource-variable/space-grotesk` but import it as `@fontsource/space-grotesk` (without `-variable`). The static font loads one weight only instead of the full variable range.
**Why it happens:** Fontsource has two packages: `@fontsource/space-grotesk` (static, one file per weight) and `@fontsource-variable/space-grotesk` (variable, single file for all weights 300-700). The import paths differ.
**How to avoid:** Always use the `-variable` variant for variable fonts:
```css
/* CORRECT */
@import "@fontsource-variable/space-grotesk";
/* WRONG -- loads only weight 400 */
@import "@fontsource/space-grotesk";
```
**Warning signs:** Font renders but `font-weight: 700` looks the same as `font-weight: 400`. Only one weight appears to work.

### Pitfall 3: Cloudflare Pages Build Fails on Sharp

**What goes wrong:** Cloudflare Pages CI/CD build fails with `Error: Could not load sharp` or similar native module errors during `npm run build`.
**Why it happens:** `sharp` is a native Node module that requires compilation. Cloudflare Pages build environment may not have the correct binary for the platform.
**How to avoid:** Ensure `sharp` is in `dependencies` (not `devDependencies`). If build still fails, add to Cloudflare Pages environment variables: `SHARP_IGNORE_GLOBAL_LIBVIPS=1`. Alternatively, set the Node version explicitly in the Pages dashboard (18.x or 20.x).
**Warning signs:** Build succeeds locally but fails in CI. Error mentions `sharp`, `libvips`, or `node-gyp`.

### Pitfall 4: Astro Static Build Missing Pages

**What goes wrong:** You create `src/pages/privacy.astro` but it doesn't appear at `/privacy` after build.
**Why it happens:** Astro's file-based routing requires pages to be in `src/pages/`. If the file is elsewhere, or if the page doesn't export a default component (for `.astro` files this is automatic), it won't be included in the build.
**How to avoid:** All routable pages go in `src/pages/`. Verify with `npx astro build` and check `dist/` output. Files prefixed with `_` (e.g., `_Layout.astro`) are excluded from routing.
**Warning signs:** `dist/` directory is missing expected HTML files. 404 on deployed site for pages that exist in source.

### Pitfall 5: Dark Theme CLS from Late Body Class Application

**What goes wrong:** Page briefly flashes white before dark background applies, causing Cumulative Layout Shift (CLS) and jarring user experience.
**Why it happens:** If the dark background is applied via a class that loads after the CSS, or if the `<html>` element doesn't have the background color set early enough in the render, the browser paints the default white background first.
**How to avoid:** Set `bg-bg-primary` directly on the `<html>` element in the layout (not on `<body>` or a wrapper div). Since this is a dark-only theme (not toggling light/dark), the background color is static and should be in the initial HTML. Alternatively, add an inline style: `<html style="background-color: #0A0A0A">`.
**Warning signs:** White flash on page load, especially noticeable on slower connections or during development with HMR.

### Pitfall 6: Missing `site` in astro.config.mjs Breaks Sitemap and Canonical URLs

**What goes wrong:** Sitemap generates with `localhost` URLs. Canonical and OG URLs point to wrong domain.
**Why it happens:** Astro's `@astrojs/sitemap` integration and `Astro.url` use the `site` config value. If not set, they fall back to localhost or the dev server URL.
**How to avoid:** Always set `site: "https://tendhunt.com"` in `astro.config.mjs`. This is also used by `astro-seo` for canonical URL generation.
**Warning signs:** Sitemap.xml contains `http://localhost:4321` URLs. Google Search Console reports wrong canonical.

## Code Examples

### Complete global.css with Design Tokens

```css
/* src/styles/global.css */
/* Source: Tailwind CSS v4 docs @theme directive + Fontsource docs */

@import "tailwindcss";

/* Self-hosted fonts via Fontsource (variable = all weights in one file) */
@import "@fontsource-variable/space-grotesk";
@import "@fontsource-variable/inter";

@theme {
  /* ========== Typography ========== */
  --font-heading: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Inter Variable", ui-sans-serif, system-ui, sans-serif;

  /* ========== Colors: Dark Theme ========== */
  --color-bg-primary: #0A0A0A;
  --color-bg-secondary: #111111;
  --color-bg-tertiary: #1A1A1A;
  --color-bg-card: #161616;
  --color-bg-light: #F5F5F5;
  --color-bg-light-secondary: #EBEBEB;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A1A1A1;
  --color-text-body: #D4D4D4;
  --color-text-muted: #737373;
  --color-text-dark: #171717;

  --color-accent: #E5FF00;
  --color-accent-hover: #D4EE00;
  --color-accent-muted: #E5FF0033; /* 20% opacity for subtle backgrounds */

  --color-border: #2A2A2A;
  --color-border-light: #E5E5E5;

  /* ========== Layout ========== */
  --container-content: 80rem; /* 1280px max content width */

  /* ========== Spacing (section-level) ========== */
  --spacing-section: 6rem;       /* 96px */
  --spacing-section-sm: 4rem;    /* 64px */
  --spacing-section-lg: 8rem;    /* 128px */
}

/* Base styles */
html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Complete astro.config.mjs

```javascript
// Source: Astro official docs + Tailwind v4 Vite plugin docs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tendhunt.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap(),
  ],
});
```

### Footer Component Pattern

```astro
---
// src/components/Footer.astro
import Logo from './Logo.astro';
---
<footer class="bg-bg-primary border-t border-border">
  <!-- Oversized tagline -->
  <div class="mx-auto max-w-[80rem] px-6 pt-20 pb-12">
    <h2 class="font-heading text-5xl md:text-7xl lg:text-8xl font-bold text-text-primary leading-tight">
      Find contracts.<br />Win business.
    </h2>
  </div>

  <!-- Footer columns -->
  <div class="mx-auto max-w-[80rem] px-6 pb-12 grid grid-cols-2 md:grid-cols-4 gap-8">
    <!-- Column 1: Logo + description -->
    <div class="col-span-2 md:col-span-1">
      <Logo />
      <p class="mt-4 text-text-secondary text-sm">
        UK procurement intelligence for suppliers.
      </p>
    </div>

    <!-- Column 2: Product -->
    <div>
      <h3 class="font-heading font-bold text-text-primary mb-4">Product</h3>
      <ul class="space-y-2 text-sm text-text-secondary">
        <li><a href="#how-it-works" class="hover:text-text-primary transition-colors">How It Works</a></li>
        <li><a href="#features" class="hover:text-text-primary transition-colors">Features</a></li>
        <li><a href="#pricing" class="hover:text-text-primary transition-colors">Pricing</a></li>
      </ul>
    </div>

    <!-- Column 3: Resources -->
    <div>
      <h3 class="font-heading font-bold text-text-primary mb-4">Resources</h3>
      <ul class="space-y-2 text-sm text-text-secondary">
        <li><a href="/blog" class="hover:text-text-primary transition-colors">Blog</a></li>
        <li><a href="mailto:hello@tendhunt.com" class="hover:text-text-primary transition-colors">Contact</a></li>
      </ul>
    </div>

    <!-- Column 4: Legal + Social -->
    <div>
      <h3 class="font-heading font-bold text-text-primary mb-4">Legal</h3>
      <ul class="space-y-2 text-sm text-text-secondary">
        <li><a href="/privacy" class="hover:text-text-primary transition-colors">Privacy Policy</a></li>
        <li><a href="/terms" class="hover:text-text-primary transition-colors">Terms of Service</a></li>
      </ul>
      <!-- Social icons -->
      <div class="flex gap-4 mt-6">
        <a href="#" aria-label="LinkedIn" class="text-text-secondary hover:text-text-primary transition-colors">
          <!-- LinkedIn SVG icon -->
        </a>
        <a href="#" aria-label="X (Twitter)" class="text-text-secondary hover:text-text-primary transition-colors">
          <!-- X SVG icon -->
        </a>
      </div>
    </div>
  </div>

  <!-- Copyright bar -->
  <div class="mx-auto max-w-[80rem] px-6 py-6 border-t border-border">
    <p class="text-text-muted text-xs">
      &copy; {new Date().getFullYear()} TendHunt. All rights reserved.
    </p>
  </div>
</footer>
```

### Cloudflare Pages Deployment (wrangler.jsonc)

```jsonc
// Source: Cloudflare Pages docs + Astro Cloudflare deployment guide
{
  "name": "tendhunt-landing",
  "compatibility_date": "2026-02-11",
  "pages_build_output_dir": "./dist"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` (v3) | `@theme` directive in CSS (v4) | Jan 2025 (v4.0 release) | No config file. All design tokens in CSS. Must NOT create tailwind.config.js. |
| `@astrojs/tailwind` integration | `@tailwindcss/vite` plugin | Astro 5.2+ (early 2025) | Old integration deprecated. Use `npx astro add tailwind` which installs the Vite plugin. |
| `@astrojs/image` | Built-in `<Image>` from `astro:assets` | Astro 3.0 (2023) | Old package removed. Use native image component. |
| Cloudflare Pages (traditional) | Cloudflare Workers (recommended for new projects) | 2025 | Pages still fully functional. Workers has more features. For pure static sites, Pages is simpler. Migrate later if needed. |
| `@fontsource/font-name` (static) | `@fontsource-variable/font-name` (variable) | 2024 | Variable fonts = single file for all weights. Better performance. Different import path. |

**Deprecated/outdated:**
- `tailwind.config.js` -- does NOT work with Tailwind v4. All config via `@theme` in CSS.
- `@astrojs/tailwind` -- deprecated. Use `@tailwindcss/vite` Vite plugin.
- `@astrojs/image` -- removed in Astro 3+. Use `astro:assets` built-in.
- `@astrojs/cloudflare` adapter for static sites -- NOT needed. Only for SSR. Static sites deploy to Pages/Workers without an adapter.

## Discretion Recommendations

Areas marked as Claude's Discretion in CONTEXT.md -- here are researched recommendations:

### Body Font: Inter Variable
**Recommendation:** Use `Inter Variable` via `@fontsource-variable/inter`.
**Rationale:** Inter is the most popular pairing with Space Grotesk (confirmed by Typewolf, maxibestof.one, and fontsinuse.com). Both are geometric sans-serifs but Inter is more neutral/readable at body sizes while Space Grotesk has distinctive character for headings. Inter's x-height is excellent for screen readability. The combination reads "techy but professional" -- fitting for procurement intelligence.

### Exact Dark Background Color: #0A0A0A
**Recommendation:** Use `#0A0A0A` for primary background, `#111111` for secondary/card, `#1A1A1A` for tertiary/hover.
**Rationale:** `#0A0A0A` is near-black without being pure black (`#000`). Pure black creates harsh contrast with white text that causes eye strain. The 3-tier gray system (`0A`, `11`, `1A`) creates subtle depth without being visually muddy. This is the standard SaaS dark theme pattern (used by Vercel, Linear, Raycast).

### Section Padding/Spacing
**Recommendation:** `96px` (6rem) vertical padding for major sections, `64px` (4rem) for minor sections, `128px` (8rem) for hero. Horizontal padding: `24px` (1.5rem) on mobile, increasing to `48px` on desktop.
**Rationale:** Enterprise feel requires generous whitespace. 96px is the sweet spot -- enough breathing room without feeling empty. The Figma template uses similar proportions.

### Mobile Navigation: Hamburger Menu
**Recommendation:** Use `astro-navbar`'s `<MenuIcon>` + `<MenuItems>` for a standard hamburger toggle below `lg` breakpoint (1024px). Full-screen overlay on mobile with the same nav items.
**Rationale:** Hamburger is the universal mobile nav pattern. `astro-navbar` handles the toggle logic, ARIA attributes, and close-on-click. No need to innovate here.

### Hover States and Micro-interactions
**Recommendation:** Keep minimal per enterprise aesthetic:
- Nav links: `text-text-secondary` -> `text-text-primary` on hover, `transition-colors duration-200`
- CTA button: `bg-accent` -> `bg-accent-hover` on hover, slight `scale-[1.02]` transform
- Footer links: same as nav hover
- No animations on scroll in Phase 1 (defer to Phase 2 when content sections are built)

### Footer Layout
**Recommendation:** 4-column grid (Logo | Product | Resources | Legal+Social) on desktop, 2x2 grid on tablet, stacked on mobile. Oversized tagline above the columns spanning full width.

### Logo Design
**Recommendation:** Text logo "TendHunt" in Space Grotesk Bold with a simple geometric icon (magnifying glass + document, or crosshair + contract motif). SVG format for crisp rendering at any size. Yellow/lime accent color for the icon, white text. Keep it minimal -- the logo should work at 24px height in the header.

## Open Questions

1. **Cloudflare Pages custom domain setup**
   - What we know: Cloudflare Pages supports custom domains via the dashboard. DNS must be proxied through Cloudflare.
   - What's unclear: Whether `tendhunt.com` DNS is already configured in Cloudflare, or needs initial setup.
   - Recommendation: Verify DNS zone exists in Cloudflare before deployment. If not, add the domain first.

2. **`pages_build_output_dir` vs `assets.directory` in wrangler.jsonc**
   - What we know: Pages uses `pages_build_output_dir`, Workers uses `assets.directory`. Both are valid but for different deployment targets.
   - What's unclear: Whether Cloudflare will auto-migrate Pages projects to Workers during the transition period.
   - Recommendation: Use `pages_build_output_dir` for now (Pages target). Switch to `assets.directory` if/when migrating to Workers.

3. **Product mockup screenshots for visuals**
   - What we know: The user wants TendHunt dashboard mockups as visual elements (since the app isn't public yet).
   - What's unclear: Whether real screenshots from the app exist, or if we need to create mockup designs.
   - Recommendation: Defer to Phase 2 (content sections). In Phase 1, set up the `<Image>` component and `src/assets/` structure so Phase 2 can drop in mockups.

## Sources

### Primary (HIGH confidence)
- Context7 `/withastro/docs` -- Astro 5 project setup, Tailwind v4 integration, layouts, Cloudflare deployment
- Context7 `/websites/tailwindcss` -- Tailwind v4 `@theme` directive, font configuration, color tokens, container utilities
- [Astro official docs: Deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/) -- Static site deployment, wrangler.jsonc config
- [Astro official docs: Using custom fonts](https://docs.astro.build/en/guides/fonts/) -- Fontsource integration, @font-face, preloading
- [Tailwind CSS v4 docs: Functions and directives](https://tailwindcss.com/docs/functions-and-directives) -- @theme directive, design token definition
- [Tailwind CSS v4 docs: Font family](https://tailwindcss.com/docs/font-family) -- Custom font configuration with @theme
- [Fontsource: Space Grotesk](https://fontsource.org/fonts/space-grotesk) -- Variable font package, weight range 300-700
- [astro-navbar GitHub](https://github.com/surjithctly/astro-navbar) -- StickyHeader component, responsive nav, ARIA support
- [Cloudflare Pages docs: Deploy a static site](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) -- Git-connected deployment, build settings
- [Astro npm: v5.17.x](https://www.npmjs.com/package/astro) -- Latest stable version confirmed

### Secondary (MEDIUM confidence)
- [Cloudflare: Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) -- Pages still supported, Workers recommended for new projects
- [Space Grotesk + Inter pairing](https://maxibestof.one/typefaces/space-grotesk/pairing/inter) -- Font pairing recommendation
- [Space Grotesk GitHub](https://github.com/floriankarsten/space-grotesk) -- Variable font woff2 files, OFL license

### Tertiary (LOW confidence)
- None -- all findings verified via primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages verified on npm with current versions. Astro 5.17.x, Tailwind 4.1.x, Fontsource packages all confirmed.
- Architecture: HIGH -- Astro layout patterns, Tailwind v4 @theme, and Cloudflare Pages deployment all verified via official docs and Context7.
- Pitfalls: HIGH -- Based on verified v4 breaking changes (no config file, new @theme directive) and known Cloudflare build environment issues with Sharp.
- Design tokens: MEDIUM-HIGH -- Color values and font pairings are recommendations within user's constraints. Final values may be adjusted during implementation based on Figma template extraction.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- stable ecosystem, no expected breaking changes)

---
*Phase: 01-foundation*
*Research completed: 2026-02-11*
