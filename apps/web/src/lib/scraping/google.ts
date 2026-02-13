import { createBrowser } from "./client";

import type { GoogleSearchResult } from "./types";

export async function googleSearchBuyer(
  buyerName: string,
  query?: string
): Promise<GoogleSearchResult[]> {
  const searchQuery = query
    ? `${buyerName} ${query}`
    : `${buyerName} UK procurement contact`;

  const browser = await createBrowser(`google-${Date.now()}`);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const encodedQuery = encodeURIComponent(searchQuery);
    await page.goto(`https://www.google.com/search?q=${encodedQuery}&num=5`, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    // Accept cookies if dialog appears
    const consentBtn = await page.$("[id='L2AGLb']");
    if (consentBtn) {
      await consentBtn.click();
      await page
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 })
        .catch(() => {});
    }

    const results = await page.evaluate(() => {
      const items: Array<{ title: string; url: string; snippet: string }> = [];
      const searchResults = document.querySelectorAll("div.g");

      for (const result of searchResults) {
        if (items.length >= 5) break;

        const linkEl = result.querySelector("a") as HTMLAnchorElement | null;
        const titleEl = result.querySelector("h3");
        const snippetEl =
          result.querySelector("[data-sncf]") ||
          result.querySelector(".VwiC3b");

        if (linkEl?.href && titleEl?.textContent) {
          items.push({
            title: titleEl.textContent.trim(),
            url: linkEl.href,
            snippet: snippetEl?.textContent?.trim() || "",
          });
        }
      }

      return items;
    });

    return results;
  } catch (err) {
    console.error("Google search error:", err);
    return [];
  } finally {
    await browser.close().catch(() => {});
  }
}
