import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Signal from "@/models/signal";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const signals = await Signal.find({})
      .select(
        "organizationName title signalType insight source sourceDate sector confidence"
      )
      .sort({ sourceDate: -1 })
      .lean();

    return Response.json({ signals });
  } catch (error) {
    console.error("Signals API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch signals",
      },
      { status: 500 }
    );
  }
}
