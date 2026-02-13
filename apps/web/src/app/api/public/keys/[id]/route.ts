import mongoose from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import ApiKey from "@/models/api-key";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Invalid key ID" }, { status: 400 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  await dbConnect();

  const key = await ApiKey.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  )
    .select("keyPrefix name scopes lastUsedAt expiresAt isActive createdAt")
    .lean();

  if (!key) {
    return Response.json({ error: "API key not found" }, { status: 404 });
  }

  return Response.json({ key });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Invalid key ID" }, { status: 400 });
  }

  await dbConnect();

  const result = await ApiKey.deleteOne({ _id: id, userId });

  if (result.deletedCount === 0) {
    return Response.json({ error: "API key not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
