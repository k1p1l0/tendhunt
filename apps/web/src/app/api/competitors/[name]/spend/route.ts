import { auth } from "@clerk/nextjs/server";
import { getCompetitorSpend } from "@/lib/competitors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name } = await params;
    const supplierName = decodeURIComponent(name);

    const spend = await getCompetitorSpend(supplierName);

    return Response.json({ spend });
  } catch (error) {
    console.error("Competitor spend API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor spend data",
      },
      { status: 500 }
    );
  }
}
