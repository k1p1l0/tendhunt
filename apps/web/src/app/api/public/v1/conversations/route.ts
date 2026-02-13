import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const source = searchParams.get("source");

  await dbConnect();

  try {
    const ChatConversation =
      mongoose.models.ChatConversation ||
      mongoose.model(
        "ChatConversation",
        new mongoose.Schema({}, { strict: false, collection: "chatconversations" })
      );

    const query: Record<string, unknown> = { userId: auth!.userId };
    if (source) query.source = source;

    const conversations = await ChatConversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return publicApiResponse({
      summary: `Found ${conversations.length} conversations`,
      data: conversations,
    });
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Failed to fetch conversations",
      500
    );
  }
}
