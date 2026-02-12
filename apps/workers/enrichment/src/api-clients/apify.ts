import { fetchWithDomainDelay } from "./rate-limiter";

/** Timeout for Apify actor calls (120 seconds — batch LinkedIn lookups can take a while) */
const APIFY_TIMEOUT_MS = 120_000;

/**
 * Call an Apify actor synchronously and return parsed JSON results.
 *
 * Uses the `run-sync-get-dataset-items` endpoint which blocks until the
 * actor finishes and returns dataset items directly as JSON array.
 *
 * Auth is via query param token (required by Apify API).
 * Rate-limited via fetchWithDomainDelay on api.apify.com.
 */
export async function callApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  apiToken: string
): Promise<unknown[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

  try {
    // Apify API uses tilde (~) as separator in actor IDs, not slash (/)
    const encodedActorId = actorId.replace("/", "~");
    const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${apiToken}`;

    const response = await fetchWithDomainDelay(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(
        `Apify actor ${actorId} returned ${response.status}: ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`Apify actor ${actorId} timed out after ${APIFY_TIMEOUT_MS}ms`);
    } else {
      console.warn(`Apify actor ${actorId} call failed:`, err);
    }
    return [];
  }
}
