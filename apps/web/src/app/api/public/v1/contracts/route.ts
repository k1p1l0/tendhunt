import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const input: Record<string, unknown> = {};

  if (searchParams.get("query")) input.query = searchParams.get("query");
  if (searchParams.get("sector")) input.sector = searchParams.get("sector");
  if (searchParams.get("region")) input.region = searchParams.get("region");
  if (searchParams.get("minValue"))
    input.minValue = Number(searchParams.get("minValue"));
  if (searchParams.get("maxValue"))
    input.maxValue = Number(searchParams.get("maxValue"));
  if (searchParams.get("limit"))
    input.limit = Number(searchParams.get("limit"));

  try {
    const result = await executeToolHandler("query_contracts", input, auth!.userId);
    return publicApiResponse(result);
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}
