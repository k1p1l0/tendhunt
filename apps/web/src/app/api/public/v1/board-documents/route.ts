import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const input: Record<string, unknown> = {};

  if (searchParams.get("buyerId")) input.buyerId = searchParams.get("buyerId");
  if (searchParams.get("committeeName"))
    input.committeeName = searchParams.get("committeeName");
  if (searchParams.get("dateFrom"))
    input.dateFrom = searchParams.get("dateFrom");
  if (searchParams.get("dateTo")) input.dateTo = searchParams.get("dateTo");
  if (searchParams.get("limit"))
    input.limit = Number(searchParams.get("limit"));

  try {
    const result = await executeToolHandler(
      "query_board_documents",
      input,
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
