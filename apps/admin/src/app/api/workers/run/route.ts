import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { triggerWorkerRun } from "@/lib/workers";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { workerName } = (await request.json()) as { workerName: string };
    if (!workerName) return NextResponse.json({ error: "Missing workerName" }, { status: 400 });

    const result = await triggerWorkerRun(workerName);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[workers/run] Error:", error);
    return NextResponse.json({ error: "Failed to trigger worker" }, { status: 500 });
  }
}
