import { createBrowser } from "./client";

import type { ScrapeResult } from "./types";

const RATE_LIMIT_DELAY = 120_000;
let lastScrapeTime = 0;

export async function scrapeLinkedInCompany(
  companyUrl: string
): Promise<ScrapeResult> {
  const now = Date.now();
  const elapsed = now - lastScrapeTime;
  if (elapsed < RATE_LIMIT_DELAY) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_DELAY - elapsed)
    );
  }
  lastScrapeTime = Date.now();

  const browser = await createBrowser(`linkedin-${Date.now()}`);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const normalizedUrl = companyUrl.endsWith("/")
      ? companyUrl + "about/"
      : companyUrl + "/about/";
    await page.goto(normalizedUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector("main", { timeout: 10000 }).catch(() => {});

    const data = await page.evaluate(() => {
      const result: Record<string, unknown> = {};

      const descEl =
        document.querySelector("[data-test-id='about-us__description']") ||
        document.querySelector(
          ".org-about-us-organization-description__text"
        );
      if (descEl) result.description = descEl.textContent?.trim();

      const empTexts = document.querySelectorAll(
        ".org-top-card-summary-info-list__info-item"
      );
      for (const el of empTexts) {
        const text = el.textContent?.trim() || "";
        const match = text.match(/([\d,]+)\s*employees/i);
        if (match) {
          result.employeeCount = parseInt(match[1].replace(/,/g, ""), 10);
        }
      }

      const specEl =
        document.querySelector("[data-test-id='about-us__specialties']") ||
        document.querySelector(".org-page-details-module__specialties");
      if (specEl) {
        result.specialties = specEl.textContent
          ?.split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const industryEl = document.querySelector(
        ".org-top-card-summary-info-list__info-item:first-child"
      );
      if (industryEl) result.industry = industryEl.textContent?.trim();

      const hqEl = document.querySelector(
        "[data-test-id='about-us__headquarters']"
      );
      if (hqEl) result.headquarters = hqEl.textContent?.trim();

      const logoEl = document.querySelector(
        ".org-top-card-primary-content__logo"
      ) as HTMLImageElement | null;
      if (logoEl?.src) result.logoUrl = logoEl.src;

      return result;
    });

    return {
      success: true,
      data: data as Record<string, unknown>,
      scrapedAt: new Date(),
      source: "linkedin",
    };
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : String(err),
      scrapedAt: new Date(),
      source: "linkedin",
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
