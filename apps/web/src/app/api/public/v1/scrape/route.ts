import mongoose from "mongoose";
import {
  authenticatePublicApi,
  publicApiResponse,
  publicApiError,
} from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";
import { isScrapingEnabled } from "@/lib/scraping/client";
import { scrapeLinkedInCompany } from "@/lib/scraping/linkedin";
import { googleSearchBuyer } from "@/lib/scraping/google";
import { scrapeBuyerWebsite } from "@/lib/scraping/website";
import Buyer from "@/models/buyer";

// Temporary per-user scrape rate limit until credit system is implemented
// WARNING: In-memory — resets on deploy/restart. Not shared across instances.
const scrapeRateMap = new Map<string, { count: number; resetAt: number }>();
const SCRAPE_LIMIT_WINDOW = 3_600_000; // 1 hour
const SCRAPE_LIMIT_MAX = 10;

setInterval(() => {
  const now = Date.now();
  scrapeRateMap.forEach((val, key) => {
    if (val.resetAt < now) scrapeRateMap.delete(key);
  });
}, 600_000);

function checkScrapeLimit(userId: string): boolean {
  const now = Date.now();
  const entry = scrapeRateMap.get(userId);

  if (!entry || entry.resetAt < now) {
    scrapeRateMap.set(userId, { count: 1, resetAt: now + SCRAPE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= SCRAPE_LIMIT_MAX;
}

export async function POST(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  if (!checkScrapeLimit(auth!.userId)) {
    return publicApiError(
      "Scrape limit exceeded (10/hour). Contact support for higher limits.",
      429
    );
  }

  if (!isScrapingEnabled()) {
    return publicApiError("Scraping is not configured", 503);
  }

  const body = await request.json();
  const { type, buyerId, url } = body;

  if (!type || !["linkedin", "google", "website"].includes(type)) {
    return publicApiError("type must be one of: linkedin, google, website");
  }

  if (!buyerId || !mongoose.isValidObjectId(buyerId)) {
    return publicApiError("Valid buyerId is required");
  }

  await dbConnect();

  try {
    if (type === "linkedin") {
      if (!url || !url.includes("linkedin.com")) {
        return publicApiError(
          "Valid LinkedIn URL required for linkedin type"
        );
      }
      const result = await scrapeLinkedInCompany(url);
      if (result.success) {
        await Buyer.findByIdAndUpdate(buyerId, {
          $set: {
            "linkedin.lastFetchedAt": result.scrapedAt,
            ...(result.data.description && {
              "linkedin.tagline": result.data.description,
            }),
            ...(result.data.employeeCount && {
              "linkedin.employeeCountRange": {
                start: result.data.employeeCount,
                end: result.data.employeeCount,
              },
            }),
          },
        });
      }
      return publicApiResponse({
        success: result.success,
        error: result.error,
        scrapedAt: result.scrapedAt,
      });
    }

    if (type === "google") {
      const buyer = await Buyer.findById(buyerId).select("name").lean();
      if (!buyer) return publicApiError("Buyer not found", 404);
      const results = await googleSearchBuyer(buyer.name);
      return publicApiResponse({ results });
    }

    if (type === "website") {
      const scrapeUrl = url;
      if (!scrapeUrl) {
        const buyer = await Buyer.findById(buyerId).select("website").lean();
        if (!buyer?.website) {
          return publicApiError(
            "No website URL provided or found for buyer"
          );
        }
        const result = await scrapeBuyerWebsite(buyer.website);
        return publicApiResponse(result);
      }
      const result = await scrapeBuyerWebsite(scrapeUrl);
      return publicApiResponse(result);
    }

    return publicApiError("Invalid type");
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Scraping failed",
      500
    );
  }
}
