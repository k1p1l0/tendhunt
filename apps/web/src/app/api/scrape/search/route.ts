import mongoose from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { isScrapingEnabled } from "@/lib/scraping/client";
import { googleSearchBuyer } from "@/lib/scraping/google";
import { scrapeBuyerWebsite } from "@/lib/scraping/website";
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
  const { buyerId, buyerName } = body;

  if (!buyerId || !mongoose.isValidObjectId(buyerId)) {
    return Response.json({ error: "Invalid buyerId" }, { status: 400 });
  }

  if (!buyerName) {
    return Response.json({ error: "buyerName is required" }, { status: 400 });
  }

  await dbConnect();

  const buyer = await Buyer.findById(buyerId).select("website").lean();

  const searchResults = await googleSearchBuyer(buyerName);

  let websiteData = null;
  const websiteUrl = buyer?.website;
  if (websiteUrl) {
    websiteData = await scrapeBuyerWebsite(websiteUrl);

    if (websiteData.personnel.length > 0 || websiteData.emails.length > 0) {
      const contactUpdates = websiteData.personnel.map((p) => ({
        name: p.name,
        title: p.title,
        email: p.email,
        phone: p.phone,
      }));

      const knownEmails = new Set(
        contactUpdates.map((c) => c.email).filter(Boolean)
      );
      for (const email of websiteData.emails) {
        if (!knownEmails.has(email)) {
          contactUpdates.push({
            name: email.split("@")[0],
            email,
            title: undefined,
            phone: undefined,
          });
        }
      }

      if (contactUpdates.length > 0) {
        await Buyer.findByIdAndUpdate(buyerId, {
          $addToSet: {
            contacts: { $each: contactUpdates },
          },
        });
      }
    }
  }

  return Response.json({
    searchResults,
    websiteData: websiteData
      ? {
          emails: websiteData.emails,
          phones: websiteData.phones,
          personnelCount: websiteData.personnel.length,
          hasProcurementInfo: Boolean(websiteData.procurementInfo),
        }
      : null,
  });
}
