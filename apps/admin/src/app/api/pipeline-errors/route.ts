import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const worker = searchParams.get("worker");
  const stage = searchParams.get("stage");
  const errorType = searchParams.get("errorType");
  const resolved = searchParams.get("resolved");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "50", 10), 100);

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 500 });
  }

  const filter: Record<string, unknown> = {};
  if (worker) filter.worker = worker;
  if (stage) filter.stage = stage;
  if (errorType) filter.errorType = errorType;
  if (resolved === "false") filter.resolvedAt = null;
  if (resolved === "true") filter.resolvedAt = { $ne: null };

  const [errors, total, unresolvedCount] = await Promise.all([
    db
      .collection("pipelineerrors")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection("pipelineerrors").countDocuments(filter),
    db.collection("pipelineerrors").countDocuments({ resolvedAt: null }),
  ]);

  const serialized = errors.map((e) => ({
    ...e,
    _id: String(e._id),
    buyerId: e.buyerId ? String(e.buyerId) : null,
    createdAt: e.createdAt ? new Date(e.createdAt as string).toISOString() : null,
    resolvedAt: e.resolvedAt ? new Date(e.resolvedAt as string).toISOString() : null,
  }));

  return NextResponse.json(
    { errors: serialized, total, unresolvedCount, page, pageSize },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) {
    return NextResponse.json({ error: "DB not available" }, { status: 500 });
  }

  const body = (await request.json()) as { ids: string[] };
  const ids = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const objectIds = ids.map((id) => new ObjectId(id));
  await db.collection("pipelineerrors").updateMany(
    { _id: { $in: objectIds } },
    { $set: { resolvedAt: new Date() } }
  );

  return NextResponse.json({ resolved: ids.length });
}
