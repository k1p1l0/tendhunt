import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { encrypt, decrypt, maskKey } from "@/lib/encryption";
import UserAiConfig from "@/models/user-ai-config";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();
  const config = await UserAiConfig.findOne({ userId }).lean();

  if (!config) {
    return Response.json({
      hasKey: false,
      maskedKey: null,
      useOwnKey: false,
      preferredScoringModel: "claude-haiku-4-5-20251001",
      preferredAgentModel: "claude-sonnet-4-5-20250929",
      keyValidatedAt: null,
    });
  }

  let maskedKey: string | null = null;
  if (config.anthropicApiKey) {
    try {
      const raw = decrypt(config.anthropicApiKey);
      maskedKey = maskKey(raw);
    } catch {
      maskedKey = "sk-ant-...****";
    }
  }

  return Response.json({
    hasKey: Boolean(config.anthropicApiKey),
    maskedKey,
    useOwnKey: config.useOwnKey ?? false,
    preferredScoringModel:
      config.preferredScoringModel || "claude-haiku-4-5-20251001",
    preferredAgentModel:
      config.preferredAgentModel || "claude-sonnet-4-5-20250929",
    keyValidatedAt: config.keyValidatedAt || null,
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as {
    anthropicApiKey?: string;
    useOwnKey?: boolean;
    preferredScoringModel?: string;
    preferredAgentModel?: string;
  };

  const update: Record<string, unknown> = {};

  // Validate and encrypt API key if provided
  if (body.anthropicApiKey && body.anthropicApiKey.trim()) {
    const key = body.anthropicApiKey.trim();

    // Validate the key by making a tiny test call
    try {
      const testClient = new Anthropic({ apiKey: key });
      await testClient.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 401 || apiErr.status === 403) {
        return Response.json(
          { error: "Invalid API key. Authentication failed." },
          { status: 400 }
        );
      }
      // 400-level errors besides auth mean the key is valid but request was bad
      // (shouldn't happen with our simple request, but handle gracefully)
      if (apiErr.status && apiErr.status >= 400 && apiErr.status < 500 && apiErr.status !== 429) {
        return Response.json(
          { error: `API key validation failed: ${apiErr.message || "Unknown error"}` },
          { status: 400 }
        );
      }
      // 429 or 5xx means the key is valid but service is busy/down — accept it
    }

    update.anthropicApiKey = encrypt(key);
    update.keyValidatedAt = new Date();
    update.useOwnKey = true;
  }

  if (typeof body.useOwnKey === "boolean") {
    update.useOwnKey = body.useOwnKey;
  }

  if (body.preferredScoringModel) {
    update.preferredScoringModel = body.preferredScoringModel;
  }

  if (body.preferredAgentModel) {
    update.preferredAgentModel = body.preferredAgentModel;
  }

  await dbConnect();

  await UserAiConfig.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true }
  );

  return Response.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();

  await UserAiConfig.findOneAndUpdate(
    { userId },
    {
      $set: { useOwnKey: false },
      $unset: { anthropicApiKey: 1, keyValidatedAt: 1 },
    }
  );

  return Response.json({ success: true });
}
