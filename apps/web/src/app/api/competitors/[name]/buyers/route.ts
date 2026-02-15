import { auth } from "@clerk/nextjs/server";
import { getCompetitorBuyers } from "@/lib/competitors";

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

    const buyers = await getCompetitorBuyers(supplierName);

    return Response.json({ buyers });
  } catch (error) {
    console.error("Competitor buyers API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor buyers",
      },
      { status: 500 }
    );
  }
}
