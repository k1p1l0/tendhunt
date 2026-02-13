import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { dbConnect } from "@/lib/mongodb";
import { generateApiKeyHash } from "@/lib/api-key-auth";
import ApiKey from "@/models/api-key";

const MAX_KEYS_PER_USER = 5;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();

  const keys = await ApiKey.find({ userId })
    .sort({ createdAt: -1 })
    .select("keyPrefix name scopes lastUsedAt expiresAt isActive createdAt")
    .lean();

  return Response.json({ keys });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  await dbConnect();

  const existingCount = await ApiKey.countDocuments({ userId });
  if (existingCount >= MAX_KEYS_PER_USER) {
    return Response.json(
      { error: `Maximum ${MAX_KEYS_PER_USER} API keys allowed` },
      { status: 400 }
    );
  }

  const rawKey = `th_live_${nanoid(32)}`;
  const keyHash = generateApiKeyHash(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  const apiKey = await ApiKey.create({
    userId,
    keyHash,
    keyPrefix,
    name,
    scopes: body.scopes || ["read"],
    expiresAt: body.expiresAt || null,
  });

  return Response.json({
    key: {
      _id: apiKey._id,
      rawKey,
      keyPrefix,
      name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    },
  });
}
