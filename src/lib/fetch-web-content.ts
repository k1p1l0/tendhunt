/** Maximum HTML size to download (500KB) */
const MAX_HTML_SIZE = 500_000;

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 5_000;

/**
 * Strip noise from HTML: scripts, styles, nav, footer, comments, and tags.
 * Returns plain text with collapsed whitespace.
 */
function stripHtmlNoise(html: string): string {
  let cleaned = html;

  // Remove script, style, nav, footer blocks
  cleaned = cleaned.replace(
    /<script[\s\S]*?<\/script>/gi,
    ""
  );
  cleaned = cleaned.replace(
    /<style[\s\S]*?<\/style>/gi,
    ""
  );
  cleaned = cleaned.replace(
    /<nav[\s\S]*?<\/nav>/gi,
    ""
  );
  cleaned = cleaned.replace(
    /<footer[\s\S]*?<\/footer>/gi,
    ""
  );

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned.trim();
}

/**
 * Extract og:image URL from raw HTML.
 * Handles both attribute orderings (property then content, and content then property).
 * Only returns URLs starting with "http".
 */
export function extractOgImage(html: string): string | null {
  // Try property-first ordering: <meta property="og:image" content="...">
  const match1 = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  if (match1?.[1] && match1[1].startsWith("http")) {
    return match1[1];
  }

  // Try content-first ordering: <meta content="..." property="og:image">
  const match2 = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  );
  if (match2?.[1] && match2[1].startsWith("http")) {
    return match2[1];
  }

  return null;
}

/**
 * Fetch a URL and return cleaned plain text content.
 * Returns null on any failure (4xx/5xx, timeout, size exceeded).
 */
export async function fetchWebContent(
  url: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS
    );

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TendHunt-Bot/1.0",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    // Check content length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE) {
      return null;
    }

    const html = await response.text();

    if (html.length > MAX_HTML_SIZE) {
      return null;
    }

    return stripHtmlNoise(html);
  } catch {
    // Timeout, network error, or any other failure
    return null;
  }
}

/**
 * Fetch a URL and return both cleaned plain text AND og:image URL.
 * og:image is extracted from raw HTML before stripping.
 * Returns { text: null, ogImage: null } on any failure.
 */
export async function fetchWebContentWithOgImage(
  url: string
): Promise<{ text: string | null; ogImage: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS
    );

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TendHunt-Bot/1.0",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { text: null, ogImage: null };
    }

    // Check content length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE) {
      return { text: null, ogImage: null };
    }

    const html = await response.text();

    if (html.length > MAX_HTML_SIZE) {
      return { text: null, ogImage: null };
    }

    // Extract og:image from raw HTML before stripping
    const ogImage = extractOgImage(html);

    // Strip HTML for text content
    const text = stripHtmlNoise(html);

    return { text: text || null, ogImage };
  } catch {
    // Timeout, network error, or any other failure
    return { text: null, ogImage: null };
  }
}
