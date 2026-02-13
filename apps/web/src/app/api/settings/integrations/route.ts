import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { encrypt, decrypt, maskKey } from "@/lib/encryption";
import UserIntegration from "@/models/user-integration";

import type { NextRequest } from "next/server";

interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  category: "data" | "research" | "scraping";
}

const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "apify",
    name: "Apify Platform",
    description:
      "LinkedIn profiles, Google search, and web scraping via Apify actors",
    requiresApiKey: true,
    category: "research",
  },
  {
    id: "website_scraper",
    name: "Website Scraper",
    description: "Extract data from any webpage using built-in scraping",
    requiresApiKey: false,
    category: "scraping",
  },
  {
    id: "companies_house",
    name: "Companies House",
    description: "UK company filings, directors, and financial data",
    requiresApiKey: true,
    category: "data",
  },
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();
  const saved = await UserIntegration.find({ userId }).lean();

  const integrations = INTEGRATIONS.map((def) => {
    const userConfig = saved.find((s) => s.integrationId === def.id);
    return {
      ...def,
      isEnabled: userConfig?.isEnabled ?? false,
      hasApiKey: Boolean(userConfig?.apiKey),
      apiKeyMask: userConfig?.apiKey
        ? (() => {
            try {
              return maskKey(decrypt(userConfig.apiKey));
            } catch {
              return "****";
            }
          })()
        : null,
      lastTestedAt: userConfig?.lastTestedAt ?? null,
      config: userConfig?.config ?? {},
    };
  });

  return Response.json({ integrations });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { integrationId, isEnabled, apiKey, config } = body;

  if (!integrationId) {
    return Response.json(
      { error: "integrationId is required" },
      { status: 400 }
    );
  }

  const definition = INTEGRATIONS.find((d) => d.id === integrationId);
  if (!definition) {
    return Response.json(
      { error: "Unknown integration" },
      { status: 400 }
    );
  }

  await dbConnect();

  const update: Record<string, unknown> = {};

  if (isEnabled !== undefined) {
    update.isEnabled = Boolean(isEnabled);
  }

  if (apiKey !== undefined) {
    update.apiKey = apiKey ? encrypt(apiKey) : null;
  }

  if (config !== undefined) {
    update.config = config;
  }

  await UserIntegration.findOneAndUpdate(
    { userId, integrationId },
    { $set: update },
    { upsert: true }
  );

  return Response.json({ success: true });
}
