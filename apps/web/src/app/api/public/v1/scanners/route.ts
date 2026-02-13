import { dbConnect } from "@/lib/mongodb";
import { executeToolHandler } from "@/lib/agent/tool-handlers";
import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import Scanner from "@/models/scanner";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  await dbConnect();

  try {
    const scanners = await Scanner.find({ userId: auth!.userId })
      .sort({ createdAt: -1 })
      .select("name type searchQuery description createdAt")
      .lean();

    return publicApiResponse({
      summary: `Found ${scanners.length} scanners`,
      data: scanners,
    });
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}

export async function POST(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const body = await request.json();

  try {
    const result = await executeToolHandler(
      "create_scanner",
      body,
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
