import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import ChatConversation from "@/models/chat-conversation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();

  const count = await ChatConversation.countDocuments({ userId, source: "web" });

  return Response.json({ isFirstTime: count === 0 });
}
