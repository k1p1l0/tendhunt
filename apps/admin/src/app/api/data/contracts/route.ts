import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchRecentContracts } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

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
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 500);

  const data = await fetchRecentContracts(limit);

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
