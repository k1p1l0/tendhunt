// ---------------------------------------------------------------------------
// Per-domain rate limiter with configurable delays
// ---------------------------------------------------------------------------

/**
 * Delay (ms) between requests per domain pattern.
 * Domains are matched by substring — e.g., "moderngov" matches
 * "democracy.camden.gov.uk/moderngov" and "moderngov.sutton.gov.uk".
 */
const DOMAIN_DELAYS: Record<string, number> = {
  moderngov: 2000, // 1 req/2s per council site
  "nhs.uk": 2000, // 1 req/2s for NHS trusts
  "gov.uk": 1000, // 1 req/s for gov.uk
  default: 3000, // Conservative default
};

/**
 * Track last request time per hostname.
 * Persists within a single Worker invocation.
 */
const lastRequestTime = new Map<string, number>();

/**
 * Max retries for transient errors (429, 503, network).
 */
const MAX_RETRIES = 3;

/**
 * Base delay (ms) for exponential backoff.
 */
const BASE_BACKOFF_MS = 1000;

/**
 * Get the configured delay for a domain.
 */
function getDelayForDomain(hostname: string): number {
  for (const [pattern, delay] of Object.entries(DOMAIN_DELAYS)) {
    if (pattern === "default") continue;
    if (hostname.includes(pattern)) return delay;
  }
  return DOMAIN_DELAYS.default;
}

/**
 * Wait for the appropriate delay before making a request to a domain.
 */
async function waitForDomain(hostname: string): Promise<void> {
  const delay = getDelayForDomain(hostname);
  const lastTime = lastRequestTime.get(hostname) ?? 0;
  const elapsed = Date.now() - lastTime;

  if (elapsed < delay) {
    await new Promise((r) => setTimeout(r, delay - elapsed));
  }

  lastRequestTime.set(hostname, Date.now());
}

/**
 * Fetch with exponential backoff on 429/503/network errors.
 */
async function fetchWithBackoff(
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);

      // Success or client error (not retryable)
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }

      // Rate limited — respect Retry-After header if present
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `Rate limited on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Server error (503, 502, 500) — backoff and retry
      if (res.status >= 500) {
        const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `Server error ${res.status} on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(
        `Network error on ${url}: ${lastError.message}, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
}

/**
 * Fetch a URL with per-domain rate limiting and exponential backoff.
 *
 * - Waits the configured delay for the domain before making the request
 * - Retries on 429/503/network errors with exponential backoff
 * - Respects Retry-After header on 429 responses
 */
export async function fetchWithDomainDelay(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const hostname = new URL(url).hostname;
  await waitForDomain(hostname);
  return fetchWithBackoff(url, init);
}

/**
 * Reset rate limiter state (useful for testing).
 */
export function resetRateLimiter(): void {
  lastRequestTime.clear();
}
