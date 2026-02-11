export interface Env {
  GHOST_SUBDOMAIN: string;
  PUBLIC_DOMAIN: string;
  BLOG_PATH: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const GHOST_SUBDOMAIN = env.GHOST_SUBDOMAIN || "ghost-admin.tendhunt.com";
    const PUBLIC_DOMAIN = env.PUBLIC_DOMAIN || "tendhunt.com";
    const BLOG_PATH = env.BLOG_PATH || "/blog";

    // Only handle /blog/* requests — everything else passes through
    if (!url.pathname.startsWith(BLOG_PATH)) {
      return fetch(request);
    }

    // Block admin access on public domain
    if (url.pathname.startsWith(`${BLOG_PATH}/ghost`)) {
      return new Response(
        "Admin access not available on this domain. Use ghost-admin.tendhunt.com/ghost",
        {
          status: 403,
          headers: { "Content-Type": "text/plain" },
        }
      );
    }

    // Strip /blog prefix to get the Ghost-relative path
    const ghostPath = url.pathname.slice(BLOG_PATH.length) || "/";
    const ghostUrl = `https://${GHOST_SUBDOMAIN}${ghostPath}${url.search}`;

    // Build headers for Ghost request (pass through relevant headers)
    const ghostHeaders = new Headers(request.headers);
    ghostHeaders.set("Host", GHOST_SUBDOMAIN);
    // Remove CF-specific headers that shouldn't go to origin
    ghostHeaders.delete("cf-connecting-ip");
    ghostHeaders.delete("cf-ray");
    ghostHeaders.delete("cf-visitor");

    // Fetch from Ghost origin
    const ghostResponse = await fetch(ghostUrl, {
      headers: ghostHeaders,
      method: request.method,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "manual",
    });

    // Handle redirects — rewrite Location header
    if (ghostResponse.status >= 300 && ghostResponse.status < 400) {
      const location = ghostResponse.headers.get("Location");
      if (location) {
        const rewrittenLocation = rewriteUrl(
          location,
          GHOST_SUBDOMAIN,
          PUBLIC_DOMAIN,
          BLOG_PATH
        );
        const responseHeaders = new Headers(ghostResponse.headers);
        responseHeaders.set("Location", rewrittenLocation);
        return new Response(ghostResponse.body, {
          status: ghostResponse.status,
          headers: responseHeaders,
        });
      }
    }

    const contentType = ghostResponse.headers.get("Content-Type") || "";

    // Pass through binary assets (images, fonts, media)
    if (
      contentType.startsWith("image/") ||
      contentType.startsWith("font/") ||
      contentType.startsWith("audio/") ||
      contentType.startsWith("video/") ||
      contentType.includes("woff") ||
      contentType.includes("octet-stream") ||
      contentType.includes("application/javascript") ||
      contentType.includes("text/css")
    ) {
      const responseHeaders = new Headers(ghostResponse.headers);
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=604800"
      );
      return new Response(ghostResponse.body, {
        status: ghostResponse.status,
        headers: responseHeaders,
      });
    }

    // Rewrite XML feeds (sitemap, RSS) via text replacement
    if (
      url.pathname.includes("sitemap") ||
      url.pathname.endsWith("/rss/") ||
      url.pathname.endsWith("/rss") ||
      contentType.includes("xml") ||
      contentType.includes("rss")
    ) {
      let xml = await ghostResponse.text();
      // Replace all ghost subdomain references with public domain + blog path
      xml = xml.replace(
        new RegExp(
          `https?://${escapeRegex(GHOST_SUBDOMAIN)}`,
          "g"
        ),
        `https://${PUBLIC_DOMAIN}${BLOG_PATH}`
      );
      return new Response(xml, {
        status: ghostResponse.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Rewrite HTML content using HTMLRewriter
    if (contentType.includes("text/html")) {
      const rewriter = new HTMLRewriter()
        // Rewrite link URLs (navigation, post links)
        .on(
          "a[href]",
          new AttributeRewriter("href", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite stylesheet links
        .on(
          "link[href]",
          new AttributeRewriter("href", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite image sources
        .on(
          "img[src]",
          new AttributeRewriter("src", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        .on(
          "img[srcset]",
          new AttributeRewriter("srcset", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite script sources
        .on(
          "script[src]",
          new AttributeRewriter("src", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite SEO meta tags
        .on(
          'meta[property="og:url"]',
          new AttributeRewriter("content", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        .on(
          'meta[property="og:image"]',
          new AttributeRewriter("content", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        .on(
          'meta[name="twitter:image"]',
          new AttributeRewriter("content", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        .on(
          'meta[name="twitter:url"]',
          new AttributeRewriter("content", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite canonical URL
        .on(
          'link[rel="canonical"]',
          new AttributeRewriter("href", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite alternate links (RSS)
        .on(
          'link[rel="alternate"]',
          new AttributeRewriter("href", GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH)
        )
        // Rewrite JSON-LD structured data inline
        .on("script[type='application/ld+json']", new JsonLdRewriter(GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH));

      return rewriter.transform(ghostResponse);
    }

    // Default: return response as-is
    return ghostResponse;
  },
};

/**
 * Rewrite a URL string, replacing ghost subdomain with public domain + blog path.
 */
function rewriteUrl(
  urlStr: string,
  ghostSubdomain: string,
  publicDomain: string,
  blogPath: string
): string {
  return urlStr
    .replace(
      new RegExp(`https?://${escapeRegex(ghostSubdomain)}`, "g"),
      `https://${publicDomain}${blogPath}`
    );
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ghost asset paths that should be prefixed with /blog when root-relative.
 */
const GHOST_ASSET_PREFIXES = [
  "/assets/",
  "/content/",
  "/public/",
  "/favicon",
  "/sitemap",
  "/rss",
];

/**
 * HTMLRewriter handler that rewrites URL attributes on elements.
 */
class AttributeRewriter {
  private attribute: string;
  private ghostSubdomain: string;
  private publicDomain: string;
  private blogPath: string;

  constructor(
    attribute: string,
    ghostSubdomain: string,
    publicDomain: string,
    blogPath: string
  ) {
    this.attribute = attribute;
    this.ghostSubdomain = ghostSubdomain;
    this.publicDomain = publicDomain;
    this.blogPath = blogPath;
  }

  element(element: Element) {
    const value = element.getAttribute(this.attribute);
    if (!value) return;

    // Rewrite absolute URLs pointing to ghost subdomain
    if (value.includes(this.ghostSubdomain)) {
      const rewritten = rewriteUrl(
        value,
        this.ghostSubdomain,
        this.publicDomain,
        this.blogPath
      );
      element.setAttribute(this.attribute, rewritten);
      return;
    }

    // Rewrite root-relative URLs for Ghost assets and post slugs
    if (value.startsWith("/") && !value.startsWith(this.blogPath)) {
      // Check if it's a known Ghost asset path
      const isGhostAsset = GHOST_ASSET_PREFIXES.some((prefix) =>
        value.startsWith(prefix)
      );

      // Check if it's a post slug (e.g., /post-slug/ or /tag/name/)
      const isPostSlug = /^\/[a-z0-9][a-z0-9-]*\/?$/.test(value) ||
        /^\/tag\/[a-z0-9-]+\/?$/.test(value) ||
        /^\/author\/[a-z0-9-]+\/?$/.test(value) ||
        /^\/page\/\d+\/?$/.test(value);

      if (isGhostAsset || isPostSlug) {
        element.setAttribute(this.attribute, `${this.blogPath}${value}`);
      }
    }
  }
}

/**
 * HTMLRewriter handler that rewrites JSON-LD structured data.
 * Ghost injects <script type="application/ld+json"> with URLs pointing to the subdomain.
 */
class JsonLdRewriter {
  private ghostSubdomain: string;
  private publicDomain: string;
  private blogPath: string;
  private chunks: string[];

  constructor(ghostSubdomain: string, publicDomain: string, blogPath: string) {
    this.ghostSubdomain = ghostSubdomain;
    this.publicDomain = publicDomain;
    this.blogPath = blogPath;
    this.chunks = [];
  }

  text(text: Text) {
    this.chunks.push(text.text);
    if (text.lastInTextNode) {
      const fullText = this.chunks.join("");
      if (fullText.includes(this.ghostSubdomain)) {
        const rewritten = fullText.replace(
          new RegExp(
            `https?://${escapeRegex(this.ghostSubdomain)}`,
            "g"
          ),
          `https://${this.publicDomain}${this.blogPath}`
        );
        text.replace(rewritten, { html: false });
      }
      this.chunks = [];
    }
  }
}
