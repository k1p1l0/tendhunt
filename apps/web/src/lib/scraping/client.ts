import { Puppeteer } from "@scrapeless-ai/sdk";

import type { PuppeteerLaunchOptions } from "@scrapeless-ai/sdk";

const SCRAPELESS_API_KEY = process.env.SCRAPELESS_API_KEY;

if (!SCRAPELESS_API_KEY) {
  console.warn("SCRAPELESS_API_KEY not set — scraping features disabled");
}

export async function createBrowser(sessionName: string) {
  if (!SCRAPELESS_API_KEY) {
    throw new Error("SCRAPELESS_API_KEY is not configured");
  }

  const config: PuppeteerLaunchOptions = {
    sessionName,
    sessionTTL: 180,
    proxyCountry: "GB",
  };

  const browser = await Puppeteer.connect({
    ...config,
    apiKey: SCRAPELESS_API_KEY,
  });

  return browser;
}

export function isScrapingEnabled(): boolean {
  return Boolean(SCRAPELESS_API_KEY);
}
