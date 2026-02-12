// ---------------------------------------------------------------------------
// HTTP validation of candidate transparency URLs + spend keyword check
// ---------------------------------------------------------------------------

import { fetchWithDomainDelay } from "../api-clients/rate-limiter";
import { containsSpendKeywords } from "./html-extractor";

export interface UrlValidationResult {
  valid: boolean;
  html: string | null;
  hasSpendKeywords: boolean;
}

/**
 * Validate that a candidate URL is a spending transparency page.
 * Checks for 200 OK + HTML body containing spend-related keywords.
 * Returns the HTML body for CSV link extraction reuse (avoids double-fetch).
 */
export async function validateTransparencyUrl(
  url: string
): Promise<UrlValidationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetchWithDomainDelay(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TendHunt/1.0; transparency-discovery)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { valid: false, html: null, hasSpendKeywords: false };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { valid: false, html: null, hasSpendKeywords: false };
    }

    const html = await response.text();
    const hasKeywords = containsSpendKeywords(html);

    return {
      valid: hasKeywords,
      html,
      hasSpendKeywords: hasKeywords,
    };
  } catch {
    return { valid: false, html: null, hasSpendKeywords: false };
  }
}
