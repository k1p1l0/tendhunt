import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchWorkerDebug } from "@/lib/workers";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const workerName = url.searchParams.get("worker");
  if (!workerName) return NextResponse.json({ error: "Missing ?worker= param" }, { status: 400 });

  try {
    const result = await fetchWorkerDebug(workerName);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[workers/debug] Error:", error);
    return NextResponse.json({ error: "Failed to fetch debug info" }, { status: 500 });
  }
}
