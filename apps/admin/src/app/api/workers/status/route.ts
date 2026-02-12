import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchAllWorkerStatus } from "@/lib/workers";
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
    const workers = await fetchAllWorkerStatus();

    return NextResponse.json(workers, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[workers/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch worker status" },
      { status: 500 }
    );
  }
}
