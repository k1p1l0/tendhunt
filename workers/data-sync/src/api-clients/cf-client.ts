// ---------------------------------------------------------------------------
// Contracts Finder (CF) OCDS API client
//
// Key API behaviours (discovered in Phase 2 research):
//  - CF supports comma-separated stages: `stages=tender,award` in one request
//  - Uses `publishedFrom` / `publishedTo` date params (NOT updatedFrom)
//  - Pagination via bare cursor token in response (not full URL like FaT)
//  - Base URL: https://www.contractsfinder.service.gov.uk/Published/OCDS/Search
// ---------------------------------------------------------------------------

import type { FetchPageFn, FetchPageResult } from "../sync-engine";
import type { OcdsRelease } from "../types";
import { fetchWithDelay } from "./rate-limiter";

const CF_BASE =
  "https://www.contractsfinder.service.gov.uk/Published/OCDS/Search";

/**
 * Create a FetchPageFn for Contracts Finder.
 *
 * Unlike FaT, CF supports both stages in a single request and uses bare
 * cursor tokens for pagination.
 *
 * @param backfillStartDate  ISO 8601 date for historical backfill start
 */
export function createCfFetchPage(backfillStartDate: string): FetchPageFn {
  return async (params: {
    cursor: string | null;
    dateFrom?: string;
  }): Promise<FetchPageResult> => {
    let url: string;

    if (params.cursor) {
      // Continuation: append bare cursor token
      const publishedFrom = params.dateFrom ?? backfillStartDate;
      url = `${CF_BASE}?publishedFrom=${encodeURIComponent(publishedFrom)}&stages=tender,award&limit=100&cursor=${encodeURIComponent(params.cursor)}`;
    } else {
      // First call: build from date params
      const publishedFrom = params.dateFrom ?? backfillStartDate;
      url = `${CF_BASE}?publishedFrom=${encodeURIComponent(publishedFrom)}&stages=tender,award&limit=100`;
    }

    const res = await fetchWithDelay(url);
    const data = (await res.json()) as {
      releases?: OcdsRelease[];
      cursor?: string;
      nextCursor?: string;
    };

    const releases = data.releases ?? [];

    // Empty response -- no more data
    if (releases.length === 0) {
      return { releases: [], nextCursor: null };
    }

    // CF may use `cursor` or `nextCursor` field for the bare token
    const nextCursor = data.nextCursor ?? data.cursor ?? null;

    return { releases, nextCursor };
  };
}
