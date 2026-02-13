import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  await dbConnect();

  try {
    const profile = await CompanyProfile.findOne({ userId: auth!.userId }).lean();

    if (!profile) {
      return publicApiResponse({
        summary: "No company profile found",
        data: null,
      });
    }

    return publicApiResponse({
      summary: `Profile for ${profile.companyName || "unnamed company"}`,
      data: {
        companyName: profile.companyName,
        website: profile.website,
        sectors: profile.sectors,
        capabilities: profile.capabilities,
        keywords: profile.keywords,
        certifications: profile.certifications,
        regions: profile.regions,
        idealContractDescription: profile.idealContractDescription,
        companySize: profile.companySize,
        summary: profile.summary,
        logoUrl: profile.logoUrl,
      },
    });
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Failed to fetch profile",
      500
    );
  }
}
