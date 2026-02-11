const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on rate-limit (429), forbidden (403), and
 * service-unavailable (503) responses. Reads the Retry-After header when
 * present; defaults to 60 s for 429, 300 s for 403, and 30 s for 503.
 */
export async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url);

    if (res.ok) return res;

    if (res.status === 429 || res.status === 403 || res.status === 503) {
      const defaultWait =
        res.status === 429 ? 60 : res.status === 403 ? 300 : 30;
      const retryAfter = parseInt(
        res.headers.get("Retry-After") ?? String(defaultWait),
        10
      );
      console.warn(
        `[attempt ${attempt}/${maxRetries}] HTTP ${res.status} — waiting ${retryAfter}s before retry...`
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    // Non-retryable error
    const body = await res.text().catch(() => "(unreadable body)");
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Fetch all OCDS releases from a paginated endpoint.
 *
 * The Find a Tender API uses `links.next` (a full URL) for pagination
 * rather than a standalone cursor token. This function handles both
 * styles: full next-URL (`links.next`) and bare cursor token
 * (`nextCursor` / `cursor` fields).
 *
 * Stops when there is no next page, the page returns no releases,
 * or maxItems is reached. Waits 500 ms between pages.
 */
export async function fetchAllReleases(
  baseUrl: string,
  params: Record<string, string>,
  maxItems = 500
): Promise<any[]> {
  const allReleases: any[] = [];
  let page = 0;

  // Build the first page URL from baseUrl + params
  const firstUrl = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    firstUrl.searchParams.set(key, value);
  }
  firstUrl.searchParams.set("limit", "100");

  let nextUrl: string | undefined = firstUrl.toString();

  while (nextUrl && allReleases.length < maxItems) {
    page++;
    console.log(
      `Fetching page ${page} (${allReleases.length} releases so far)...`
    );

    const res = await fetchWithRetry(nextUrl);
    const data = await res.json();

    // OCDS release packages wrap releases in a `releases` array
    const releases: any[] = data.releases ?? [];
    if (releases.length === 0) {
      console.log("No more releases — pagination complete.");
      break;
    }

    allReleases.push(...releases);

    // Determine next page URL:
    // 1. links.next — full URL (Find a Tender style)
    // 2. nextCursor / cursor — bare token (append as query param)
    if (data.links?.next) {
      nextUrl = data.links.next;
    } else {
      const cursor = data.nextCursor ?? data.cursor;
      if (cursor) {
        const u = new URL(baseUrl);
        for (const [key, value] of Object.entries(params)) {
          u.searchParams.set(key, value);
        }
        u.searchParams.set("limit", "100");
        u.searchParams.set("cursor", cursor);
        nextUrl = u.toString();
      } else {
        console.log("No next page — pagination complete.");
        nextUrl = undefined;
      }
    }

    // Polite delay between requests
    if (nextUrl && allReleases.length < maxItems) {
      await sleep(500);
    }
  }

  const result = allReleases.slice(0, maxItems);
  console.log(`Fetched ${result.length} releases total (${page} pages).`);
  return result;
}
