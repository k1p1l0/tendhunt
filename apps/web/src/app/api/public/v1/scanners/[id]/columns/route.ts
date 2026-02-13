import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await request.json();

  try {
    const result = await executeToolHandler(
      "add_scanner_column",
      { scannerId: id, ...body },
      auth!.userId
    );
    return publicApiResponse(result, 201);
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}
