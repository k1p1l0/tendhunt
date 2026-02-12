// ---------------------------------------------------------------------------
// Contracts Finder (CF) OCDS API client
//
// Key API behaviours (verified against live API 2026-02-11):
//  - CF supports comma-separated stages: `stages=tender,award` in one request
//  - Uses `publishedFrom` / `publishedTo` date params (NOT updatedFrom)
//  - Pagination via `links.next` full URLs (same as FaT, not bare cursors)
//  - Base URL: https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search
// ---------------------------------------------------------------------------

import type { FetchPageFn, FetchPageResult } from "../sync-engine";
import type { OcdsRelease } from "../types";
import { fetchWithDelay } from "./rate-limiter";

const CF_BASE =
  "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";

/**
 * Create a FetchPageFn for Contracts Finder.
 *
 * Unlike FaT, CF supports both stages in a single request.
 * Like FaT, CF uses `links.next` full URLs for pagination.
 *
 * @param backfillStartDate  ISO 8601 date for historical backfill start
 */
export function createCfFetchPage(backfillStartDate: string): FetchPageFn {
  return async (params: {
    cursor: string | null;
    dateFrom?: string;
  }): Promise<FetchPageResult> => {
    let url: string;

    if (params.cursor && params.cursor.startsWith("http")) {
      // Continuation: follow full URL from links.next
      url = params.cursor;
    } else {
      // First call: build from date params
      const publishedFrom = params.dateFrom ?? backfillStartDate;
      url = `${CF_BASE}?publishedFrom=${encodeURIComponent(publishedFrom)}&stages=tender,award&limit=100`;
    }

    const res = await fetchWithDelay(url);
    const data = (await res.json()) as {
      releases?: OcdsRelease[];
      links?: { next?: string };
    };

    const releases = data.releases ?? [];

    // Empty response -- no more data
    if (releases.length === 0) {
      return { releases: [], nextCursor: null };
    }

    // CF uses links.next with full URLs
    const nextCursor = data.links?.next ?? null;

    return { releases, nextCursor };
  };
}
