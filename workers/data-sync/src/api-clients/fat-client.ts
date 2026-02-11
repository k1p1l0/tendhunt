// ---------------------------------------------------------------------------
// Find a Tender (FaT) OCDS API client
//
// Key API behaviours (discovered in Phase 2 research):
//  - FaT REJECTS comma-separated stages -- fetch tender and award SEPARATELY
//  - Pagination via `links.next` which are FULL URLs (not bare cursor tokens)
//  - Uses `updatedFrom` date param (ISO 8601)
//  - Base URL: https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
// ---------------------------------------------------------------------------

import type { FetchPageFn, FetchPageResult } from "../sync-engine";
import type { OcdsRelease } from "../types";
import { fetchWithDelay } from "./rate-limiter";

const FAT_BASE =
  "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";

/**
 * Create a FetchPageFn for Find a Tender.
 *
 * Uses a closure variable `currentStage` to track whether we are fetching
 * tender or award releases. The synthetic cursor `"STAGE:award"` triggers
 * the transition from tender to award stage.
 *
 * @param backfillStartDate  ISO 8601 date for historical backfill start
 */
export function createFatFetchPage(backfillStartDate: string): FetchPageFn {
  let currentStage: "tender" | "award" = "tender";

  return async (params: {
    cursor: string | null;
    dateFrom?: string;
  }): Promise<FetchPageResult> => {
    let url: string;

    // Case 1: Full URL cursor from links.next
    if (params.cursor && params.cursor.startsWith("http")) {
      url = params.cursor;
    }
    // Case 2: Synthetic cursor to start award stage
    else if (params.cursor === "STAGE:award") {
      currentStage = "award";
      const updatedFrom = params.dateFrom ?? backfillStartDate;
      url = `${FAT_BASE}?updatedFrom=${encodeURIComponent(updatedFrom)}&stages=award&limit=100`;
    }
    // Case 3: First call (no cursor) -- start with tender stage
    else {
      currentStage = "tender";
      const updatedFrom = params.dateFrom ?? backfillStartDate;
      url = `${FAT_BASE}?updatedFrom=${encodeURIComponent(updatedFrom)}&stages=tender&limit=100`;
    }

    const res = await fetchWithDelay(url);
    const data = (await res.json()) as {
      releases?: OcdsRelease[];
      links?: { next?: string };
    };

    const releases = data.releases ?? [];

    // Empty response -- no more data for this stage
    if (releases.length === 0) {
      if (currentStage === "tender") {
        // Tender exhausted -- switch to award stage
        return { releases: [], nextCursor: "STAGE:award" };
      }
      // Both stages exhausted
      return { releases: [], nextCursor: null };
    }

    // Determine next cursor
    let nextCursor: string | null;

    if (data.links?.next) {
      // More pages in current stage
      nextCursor = data.links.next;
    } else if (currentStage === "tender") {
      // Tender stage exhausted -- transition to award
      nextCursor = "STAGE:award";
    } else {
      // Award stage exhausted -- all done
      nextCursor = null;
    }

    return { releases, nextCursor };
  };
}
