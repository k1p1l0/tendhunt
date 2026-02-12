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
      const sanitized = q.replace(/"/g, "").replace(/\s+/g, " ").trim();
      if (sanitized) {
        conditions.push({ $text: { $search: sanitized } });
      }
    }
    if (signalType) {
      conditions.push({ signalType });
    }
    if (sector) {
      conditions.push({ sector });
    }

    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : 1;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!, 10)
      : 0;

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const baseQuery = Signal.find(query)
      .select(
        "organizationName title signalType insight source sourceDate sector confidence"
      )
      .sort({ sourceDate: -1 });

    if (pageSize > 0) {
      baseQuery.skip((page - 1) * pageSize).limit(pageSize);
      const [signals, filteredCount] = await Promise.all([
        baseQuery.lean(),
        Signal.countDocuments(query),
      ]);
      return Response.json({ signals, filteredCount, totalCount: filteredCount });
    }

    const signals = await baseQuery.lean();
    return Response.json({ signals, filteredCount: signals.length, totalCount: signals.length });
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
