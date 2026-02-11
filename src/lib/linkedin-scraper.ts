import { env } from "@/lib/env";

export interface LinkedInCompanyData {
  profile: string | null; // formatted company profile text
  posts: string | null; // formatted recent posts text
}

/** Timeout for Apify actor calls (30 seconds) */
const APIFY_TIMEOUT_MS = 30_000;

/** Maximum characters per post content */
const MAX_POST_CONTENT_LENGTH = 500;

/**
 * Validate that a URL looks like a LinkedIn company page.
 */
function isLinkedInCompanyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("linkedin.com") &&
      parsed.pathname.includes("/company/")
    );
  } catch {
    return false;
  }
}

/**
 * Call an Apify actor via HTTP API and return parsed JSON results.
 * Uses query param auth as required by Apify's API.
 */
async function callApifyActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<unknown[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

  try {
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(
        `Apify actor ${actorId} returned ${response.status}: ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`Apify actor ${actorId} call failed:`, err);
    return [];
  }
}

/**
 * Format company profile data from Apify actor response into readable text.
 */
function formatCompanyProfile(
  results: Record<string, unknown>[]
): string | null {
  if (results.length === 0) return null;

  const company = results[0];
  if (!company) return null;

  const lines: string[] = [];

  if (company.companyName) lines.push(`Company: ${company.companyName}`);
  if (company.industry) lines.push(`Industry: ${company.industry}`);
  if (company.employeeCount)
    lines.push(`Employees: ${company.employeeCount}`);
  if (company.foundedYear) lines.push(`Founded: ${company.foundedYear}`);
  if (company.headquartersLocation)
    lines.push(`HQ: ${company.headquartersLocation}`);
  if (company.followerCount)
    lines.push(`Followers: ${company.followerCount}`);
  if (company.website) lines.push(`Website: ${company.website}`);
  if (company.specialities)
    lines.push(
      `Specialties: ${Array.isArray(company.specialities) ? company.specialities.join(", ") : company.specialities}`
    );
  if (company.description) lines.push(`Description: ${company.description}`);

  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Format recent posts data from Apify actor response into readable text.
 */
function formatRecentPosts(
  results: Record<string, unknown>[]
): string | null {
  if (results.length === 0) return null;

  const postLines: string[] = ["Recent LinkedIn Posts:"];

  for (let i = 0; i < results.length; i++) {
    const post = results[i];
    if (!post) continue;

    // Extract content -- truncate to max length
    let content = String(post.content || post.text || post.postText || "");
    if (content.length > MAX_POST_CONTENT_LENGTH) {
      content = content.substring(0, MAX_POST_CONTENT_LENGTH) + "...";
    }

    if (!content.trim()) continue;

    const date = post.postedAt || post.publishedAt || post.date || "Unknown";
    const likes = post.likes ?? post.numLikes ?? post.likeCount ?? 0;
    const comments =
      post.comments ?? post.numComments ?? post.commentCount ?? 0;

    postLines.push(
      `\nPost ${i + 1} (${date}): ${content} [Likes: ${likes}, Comments: ${comments}]`
    );
  }

  return postLines.length > 1 ? postLines.join("") : null;
}

/**
 * Scrape LinkedIn company profile data and recent posts using Apify actors.
 *
 * Calls two actors in parallel:
 * 1. dev_fusion/Linkedin-Company-Scraper (company profile)
 * 2. harvestapi/linkedin-company-posts (recent posts)
 *
 * Uses Promise.allSettled so one failure doesn't block the other.
 * Never throws -- returns { profile: null, posts: null } on complete failure.
 */
export async function scrapeLinkedInCompany(
  linkedinUrl: string
): Promise<LinkedInCompanyData> {
  if (!isLinkedInCompanyUrl(linkedinUrl)) {
    console.warn(
      `Invalid LinkedIn company URL: ${linkedinUrl}`
    );
    return { profile: null, posts: null };
  }

  try {
    const [profileResult, postsResult] = await Promise.allSettled([
      // Actor 1: Company Profile
      callApifyActor("dev_fusion~Linkedin-Company-Scraper", {
        profileUrls: [linkedinUrl],
      }),
      // Actor 2: Recent Posts
      callApifyActor("harvestapi~linkedin-company-posts", {
        targetUrls: [linkedinUrl],
        maxPosts: 5,
        scrapeReactions: false,
        scrapeComments: false,
      }),
    ]);

    const profile =
      profileResult.status === "fulfilled"
        ? formatCompanyProfile(
            profileResult.value as Record<string, unknown>[]
          )
        : null;

    const posts =
      postsResult.status === "fulfilled"
        ? formatRecentPosts(
            postsResult.value as Record<string, unknown>[]
          )
        : null;

    return { profile, posts };
  } catch (err) {
    console.warn("LinkedIn scraping failed:", err);
    return { profile: null, posts: null };
  }
}
