import mongoose from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { isScrapingEnabled } from "@/lib/scraping/client";
import { scrapeLinkedInCompany } from "@/lib/scraping/linkedin";
import Buyer from "@/models/buyer";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isScrapingEnabled()) {
    return Response.json(
      { error: "Scraping is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { buyerId, linkedinUrl } = body;

  if (!buyerId || !mongoose.isValidObjectId(buyerId)) {
    return Response.json({ error: "Invalid buyerId" }, { status: 400 });
  }

  if (!linkedinUrl || !linkedinUrl.includes("linkedin.com")) {
    return Response.json({ error: "Invalid LinkedIn URL" }, { status: 400 });
  }

  await dbConnect();

  const result = await scrapeLinkedInCompany(linkedinUrl);

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
        ...(result.data.specialties && {
          "linkedin.specialities": result.data.specialties,
        }),
        ...(result.data.logoUrl && {
          "linkedin.logos": [{ url: result.data.logoUrl }],
        }),
      },
    });
  }

  return Response.json({
    success: result.success,
    error: result.error,
    scrapedAt: result.scrapedAt,
  });
}
