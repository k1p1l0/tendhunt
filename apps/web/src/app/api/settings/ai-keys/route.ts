import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { encrypt, maskKey } from "@/lib/encryption";
import UserAiKeys from "@/models/user-ai-keys";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();
  const keys = await UserAiKeys.findOne({ userId }).lean();

  if (!keys) {
    return Response.json({
      hasAnthropic: false,
      hasOpenai: false,
      preferredProvider: "anthropic",
    });
  }

  return Response.json({
    hasAnthropic: Boolean(keys.anthropicApiKey),
    anthropicMask: keys.anthropicApiKey ? maskKey("sk-ant-...key") : null,
    hasOpenai: Boolean(keys.openaiApiKey),
    openaiMask: keys.openaiApiKey ? maskKey("sk-...key") : null,
    preferredProvider: keys.preferredProvider,
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.anthropicApiKey !== undefined) {
    update.anthropicApiKey = body.anthropicApiKey
      ? encrypt(body.anthropicApiKey)
      : null;
  }
  if (body.openaiApiKey !== undefined) {
    update.openaiApiKey = body.openaiApiKey
      ? encrypt(body.openaiApiKey)
      : null;
  }
  if (body.preferredProvider) {
    update.preferredProvider = body.preferredProvider;
  }

  await dbConnect();

  await UserAiKeys.findOneAndUpdate(
    { userId },
    { $set: { ...update, isActive: true } },
    { upsert: true }
  );

  return Response.json({ success: true });
}
