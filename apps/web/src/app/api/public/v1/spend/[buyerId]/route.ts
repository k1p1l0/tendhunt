import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { buyerId } = await params;

  try {
    const result = await executeToolHandler(
      "query_spend_data",
      { buyerId },
      auth!.userId
    );
    return publicApiResponse(result);
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}
