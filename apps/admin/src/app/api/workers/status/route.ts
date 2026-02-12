import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchAllWorkerStatus } from "@/lib/workers";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
