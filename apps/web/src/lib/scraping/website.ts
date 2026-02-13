import { createBrowser } from "./client";

import type { WebsiteScrapedData } from "./types";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+44|0)\s*\d[\d\s-]{8,}/g;
const PAGES_TO_CHECK = [
  "/contact",
  "/procurement",
  "/about",
  "/about-us",
  "/contact-us",
];

export async function scrapeBuyerWebsite(
  websiteUrl: string
): Promise<WebsiteScrapedData> {
  const result: WebsiteScrapedData = {
    emails: [],
    phones: [],
    personnel: [],
  };

  const baseUrl = websiteUrl.replace(/\/$/, "");
  const browser = await createBrowser(`website-${Date.now()}`);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    for (const path of PAGES_TO_CHECK) {
      try {
        const url = baseUrl + path;
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        if (!response || response.status() >= 400) continue;

        const pageData = await page.evaluate((pagePath: string) => {
          const text = document.body?.innerText || "";

          const people: Array<{
            name: string;
            title?: string;
            email?: string;
          }> = [];

          const contactElements = document.querySelectorAll(
            "[class*='contact'], [class*='staff'], [class*='team'], [class*='person']"
          );

          for (const el of contactElements) {
            const nameEl = el.querySelector(
              "h2, h3, h4, strong, [class*='name']"
            );
            const titleEl = el.querySelector(
              "[class*='title'], [class*='role'], [class*='position']"
            );
            const emailEl = el.querySelector(
              "a[href^='mailto:']"
            ) as HTMLAnchorElement | null;

            if (nameEl?.textContent?.trim()) {
              people.push({
                name: nameEl.textContent.trim(),
                title: titleEl?.textContent?.trim(),
                email: emailEl?.href?.replace("mailto:", ""),
              });
            }
          }

          return {
            text,
            people,
            isProcurement: pagePath.includes("procurement"),
            isAbout: pagePath.includes("about"),
          };
        }, path);

        const emails = pageData.text.match(EMAIL_REGEX) || [];
        const phones = pageData.text.match(PHONE_REGEX) || [];

        result.emails.push(...emails);
        result.phones.push(...phones);
        result.personnel.push(
          ...pageData.people.map((p) => ({
            name: p.name,
            title: p.title,
            email: p.email,
          }))
        );

        if (pageData.isProcurement) {
          result.procurementInfo = pageData.text.slice(0, 2000);
        }
        if (pageData.isAbout) {
          result.aboutText = pageData.text.slice(0, 2000);
        }
      } catch {
        continue;
      }
    }

    result.emails = [...new Set(result.emails)];
    result.phones = [...new Set(result.phones)];

    return result;
  } catch (err) {
    console.error("Website scrape error:", err);
    return result;
  } finally {
    await browser.close().catch(() => {});
  }
}
