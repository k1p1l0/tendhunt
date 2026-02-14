import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWorkerBudgets, updateWorkerBudgets } from "@/lib/settings";

import type { WorkerBudgets } from "@/lib/settings";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const budgets = await getWorkerBudgets();
    return NextResponse.json({ workerBudgets: budgets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[settings] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await requireAdmin(userId);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await request.json()) as { workerBudgets: Partial<WorkerBudgets> };
    if (!body.workerBudgets) {
      return NextResponse.json({ error: "Missing workerBudgets" }, { status: 400 });
    }

    const updated = await updateWorkerBudgets(body.workerBudgets);
    return NextResponse.json({ workerBudgets: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[settings] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
