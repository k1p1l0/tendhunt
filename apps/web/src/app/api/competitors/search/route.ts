import { auth } from "@clerk/nextjs/server";
import { searchSuppliers } from "@/lib/competitors";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 10, 50) : 10;

    if (!query || query.trim().length < 2) {
      return Response.json({ results: [] });
    }

    const results = await searchSuppliers(query.trim(), limit);

    return Response.json({ results });
  } catch (error) {
    console.error("Competitor search API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search competitors",
      },
      { status: 500 }
    );
  }
}
