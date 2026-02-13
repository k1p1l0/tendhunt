import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";
import ChatConversation from "@/models/chat-conversation";

export async function POST(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return publicApiError("Invalid JSON body", 400);
  }

  const { userMessage, assistantResponse, slackThreadTs, slackChannelId } = body as {
    userMessage?: string;
    assistantResponse?: string;
    slackThreadTs?: string;
    slackChannelId?: string;
  };

  if (!userMessage || !assistantResponse) {
    return publicApiError("userMessage and assistantResponse are required", 400);
  }

  await dbConnect();

  try {
    const userId = auth!.userId;
    const now = new Date();

    const query: Record<string, unknown> = {
      userId,
      source: "slack",
    };

    if (slackThreadTs) {
      query.slackThreadTs = slackThreadTs;
    }

    const messages = [
      { role: "user" as const, content: userMessage, timestamp: now },
      { role: "assistant" as const, content: assistantResponse, timestamp: now },
    ];

    let conversation = await ChatConversation.findOne(query);

    if (conversation) {
      conversation.messages.push(...messages);
      conversation.lastMessageAt = now;
      await conversation.save();
    } else {
      conversation = await ChatConversation.create({
        userId,
        source: "slack",
        title: userMessage.slice(0, 80),
        slackThreadTs: slackThreadTs || undefined,
        slackChannelId: slackChannelId || undefined,
        messages,
        lastMessageAt: now,
      });
    }

    return publicApiResponse({
      conversationId: conversation._id.toString(),
    });
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Failed to sync conversation",
      500
    );
  }
}
