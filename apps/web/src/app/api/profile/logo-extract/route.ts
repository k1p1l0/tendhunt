import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";
import { fetchWebContentWithOgImage } from "@/lib/fetch-web-content";
import { scrapeLinkedInCompany } from "@/lib/linkedin-scraper";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const profile = await CompanyProfile.findOne({ userId });
    if (!profile) {
      return Response.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Re-run logo extraction from website and LinkedIn in parallel
    const websitePromise = profile.website
      ? fetchWebContentWithOgImage(profile.website)
      : Promise.resolve({ text: null, ogImage: null });

    const linkedInPromise = profile.linkedinUrl
      ? scrapeLinkedInCompany(profile.linkedinUrl)
      : Promise.resolve({ profile: null, posts: null, logoUrl: null });

    const [websiteResult, linkedInResult] = await Promise.allSettled([
      websitePromise,
      linkedInPromise,
    ]);

    // Extract logo URLs
    const ogImageUrl =
      websiteResult.status === "fulfilled"
        ? websiteResult.value.ogImage
        : null;

    const linkedInLogoUrl =
      linkedInResult.status === "fulfilled"
        ? linkedInResult.value.logoUrl
        : null;

    // LinkedIn logo takes priority over og:image
    const logoUrl = linkedInLogoUrl || ogImageUrl || null;

    if (!logoUrl) {
      return Response.json(
        { error: "No logo found from website or LinkedIn" },
        { status: 404 }
      );
    }

    // Update profile with new logo URL
    await CompanyProfile.findOneAndUpdate(
      { userId },
      { $set: { logoUrl, lastEditedAt: new Date() } },
      { new: true }
    );

    return Response.json({ logoUrl });
  } catch (error) {
    console.error("Logo re-extract error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract logo",
      },
      { status: 500 }
    );
  }
}
