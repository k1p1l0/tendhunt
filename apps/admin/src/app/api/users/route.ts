import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

import { fetchEnrichedUsers } from "@/lib/users";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchEnrichedUsers();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
