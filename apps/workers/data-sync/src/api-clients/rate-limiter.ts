// ---------------------------------------------------------------------------
// Rate limiting utilities for UK government OCDS APIs
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a URL with exponential backoff on rate-limit and server errors.
 *
 * Handles HTTP 429 (Too Many Requests), 403 (Forbidden -- used by some UK gov
 * endpoints when rate-limited), and 503 (Service Unavailable).
 *
 * Reads the `Retry-After` header when present; otherwise uses exponential
 * backoff starting at 10s, capped at 5 minutes.
 */
export async function fetchWithBackoff(
  url: string,
  maxRetries = 5
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      const retryAfter = parseInt(
        res.headers.get("Retry-After") ?? "0",
        10
      );
      const backoff =
        retryAfter > 0
          ? retryAfter * 1000
          : Math.min(10000 * Math.pow(2, attempt), 300000);
      console.warn(
        `Rate limited (${res.status}). Attempt ${attempt + 1}/${maxRetries}. Waiting ${backoff / 1000}s...`
      );
      await sleep(backoff);
      continue;
    }

    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Fetch a URL with backoff + a fixed inter-request delay.
 *
 * Default 10 000 ms delay = ~6 requests/minute, staying well within the
 * undocumented rate limits of Find a Tender and Contracts Finder APIs.
 */
export async function fetchWithDelay(
  url: string,
  delayMs = 10000
): Promise<Response> {
  const res = await fetchWithBackoff(url);
  await sleep(delayMs);
  return res;
}
