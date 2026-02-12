import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchPlatformStats } from "@/lib/stats";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await fetchPlatformStats();

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    );
  }
}
