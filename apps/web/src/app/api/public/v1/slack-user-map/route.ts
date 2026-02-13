import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const slackUserId = searchParams.get("slackUserId");

  if (!slackUserId) {
    return publicApiError("slackUserId query parameter is required", 400);
  }

  // The API key authenticates to a specific TendHunt user.
  // For the hackathon, we return the authenticated user's ID as the memory group owner.
  // In production, this would look up a slack_user_id → clerk_user_id mapping table.
  return publicApiResponse({
    slackUserId,
    userId: auth!.userId,
    memoryGroupId: `user_${auth!.userId}`,
  });
}
