import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  try {
    const result = await executeToolHandler(
      "get_buyer_detail",
      { buyerId: id },
      auth!.userId
    );
    if (!result.data) {
      return publicApiError("Buyer not found", 404);
    }
    return publicApiResponse(result);
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}
