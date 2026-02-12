import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Signal from "@/models/signal";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const signalType = searchParams.get("signalType");
    const sector = searchParams.get("sector");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: Record<string, any>[] = [];

    if (q) {
      conditions.push({ $text: { $search: q } });
    }
    if (signalType) {
      conditions.push({ signalType });
    }
    if (sector) {
      conditions.push({ sector });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const signals = await Signal.find(query)
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
