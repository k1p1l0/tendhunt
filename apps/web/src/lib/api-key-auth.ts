import { createHash } from "crypto";
import { dbConnect } from "@/lib/mongodb";
import ApiKey from "@/models/api-key";

export interface ApiKeyAuth {
  userId: string;
  keyHash: string;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuth | null> {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  let rawKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    rawKey = apiKeyHeader;
  }

  if (!rawKey || !rawKey.startsWith("th_live_")) {
    return null;
  }

  const keyHash = hashKey(rawKey);

  await dbConnect();

  const apiKey = await ApiKey.findOneAndUpdate(
    {
      keyHash,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    },
    { $set: { lastUsedAt: new Date() } },
    { new: true }
  ).lean();

  if (!apiKey) {
    return null;
  }

  return { userId: apiKey.userId, keyHash };
}

export function generateApiKeyHash(rawKey: string): string {
  return hashKey(rawKey);
}
