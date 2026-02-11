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
      // Handles https://, http://, and protocol-relative //
      xml = rewriteAllUrls(xml, GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH);
      return new Response(xml, {
        status: ghostResponse.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Rewrite HTML content — full text replacement for absolute URLs,
    // then HTMLRewriter for root-relative asset/post paths
    if (contentType.includes("text/html")) {
      // Step 1: Read full HTML and do global text replacement for subdomain URLs.
      // This catches everything: JSON-LD, data-ghost attrs, data-api attrs, inline scripts.
      let html = await ghostResponse.text();
      // Handles https://, http://, and protocol-relative //
      html = rewriteAllUrls(html, GHOST_SUBDOMAIN, PUBLIC_DOMAIN, BLOG_PATH);

      // Step 2: Create a new Response from the rewritten HTML
      const rewrittenResponse = new Response(html, {
        status: ghostResponse.status,
        headers: ghostResponse.headers,
      });

      // Step 3: Use HTMLRewriter for root-relative URL prefixing only.
      // Absolute URLs are already handled by text replacement above.
      const rewriter = new HTMLRewriter()
        .on(
          "a[href]",
          new RootRelativeRewriter("href", BLOG_PATH)
        )
        .on(
          "link[href]",
          new RootRelativeRewriter("href", BLOG_PATH)
        )
        .on(
          "img[src]",
          new RootRelativeRewriter("src", BLOG_PATH)
        )
        .on(
          "img[srcset]",
          new RootRelativeRewriter("srcset", BLOG_PATH)
        )
        .on(
          "script[src]",
          new RootRelativeRewriter("src", BLOG_PATH)
        );

      return rewriter.transform(rewrittenResponse);
    }

    // Default: return response as-is
    return ghostResponse;
  },
};

/**
 * Rewrite a single URL string, replacing ghost subdomain with public domain + blog path.
 */
function rewriteUrl(
  urlStr: string,
  ghostSubdomain: string,
  publicDomain: string,
  blogPath: string
): string {
  return rewriteAllUrls(urlStr, ghostSubdomain, publicDomain, blogPath);
}

/**
 * Replace all ghost subdomain references in text.
 * Handles https://, http://, and protocol-relative // URLs.
 */
function rewriteAllUrls(
  text: string,
  ghostSubdomain: string,
  publicDomain: string,
  blogPath: string
): string {
  const escaped = escapeRegex(ghostSubdomain);
  // Replace https:// and http:// URLs
  text = text.replace(
    new RegExp(`https?://${escaped}`, "g"),
    `https://${publicDomain}${blogPath}`
  );
  // Replace protocol-relative // URLs
  text = text.replace(
    new RegExp(`//${escaped}`, "g"),
    `//tendhunt.com${blogPath}`
  );
  return text;
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
 * HTMLRewriter handler that prefixes root-relative URLs with /blog.
 * Only handles paths starting with "/" that are Ghost assets or post slugs.
 * Absolute URLs (https://ghost-admin...) are already rewritten by text replacement.
 */
class RootRelativeRewriter {
  private attribute: string;
  private blogPath: string;

  constructor(attribute: string, blogPath: string) {
    this.attribute = attribute;
    this.blogPath = blogPath;
  }

  element(element: Element) {
    const value = element.getAttribute(this.attribute);
    if (!value) return;

    // Only handle root-relative URLs not already prefixed with /blog
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
