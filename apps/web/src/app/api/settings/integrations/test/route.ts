import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import UserIntegration from "@/models/user-integration";

import type { NextRequest } from "next/server";

async function testApifyKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.apify.com/v2/acts?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function testCompaniesHouseKey(apiKey: string): Promise<boolean> {
  try {
    const encoded = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(
      "https://api.company-information.service.gov.uk/search/companies?q=test&items_per_page=1",
      { headers: { Authorization: `Basic ${encoded}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { integrationId, apiKey: rawKey } = body;

  if (!integrationId) {
    return Response.json(
      { error: "integrationId is required" },
      { status: 400 }
    );
  }

  let keyToTest = rawKey;

  if (!keyToTest) {
    await dbConnect();
    const saved = await UserIntegration.findOne({
      userId,
      integrationId,
    }).lean();
    if (saved?.apiKey) {
      try {
        keyToTest = decrypt(saved.apiKey);
      } catch {
        return Response.json(
          { error: "Failed to decrypt saved key. Please re-enter it." },
          { status: 500 }
        );
      }
    }
  }

  if (!keyToTest) {
    return Response.json(
      { error: "No API key provided or saved" },
      { status: 400 }
    );
  }

  let valid = false;

  switch (integrationId) {
    case "apify":
      valid = await testApifyKey(keyToTest);
      break;
    case "companies_house":
      valid = await testCompaniesHouseKey(keyToTest);
      break;
    case "website_scraper":
      valid = true;
      break;
    default:
      return Response.json(
        { error: "Unknown integration" },
        { status: 400 }
      );
  }

  if (valid) {
    await dbConnect();
    await UserIntegration.findOneAndUpdate(
      { userId, integrationId },
      { $set: { lastTestedAt: new Date() } },
      { upsert: true }
    );
  }

  return Response.json({ valid });
}
