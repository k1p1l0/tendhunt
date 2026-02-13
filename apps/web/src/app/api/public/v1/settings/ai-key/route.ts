import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  await dbConnect();

  try {
    // Dynamic import to avoid issues if model doesn't exist yet
    const { default: UserAiKeys } = await import("@/models/user-ai-keys");

    const keys = await UserAiKeys.findOne({ userId: auth!.userId }).lean();

    if (!keys || !keys.isActive) {
      return publicApiResponse({ hasKey: false, provider: null });
    }

    return publicApiResponse({
      hasKey: true,
      provider: keys.preferredProvider,
      hasAnthropic: Boolean(keys.anthropicApiKey),
      hasOpenai: Boolean(keys.openaiApiKey),
    });
  } catch {
    return publicApiError("AI keys not configured", 404);
  }
}
