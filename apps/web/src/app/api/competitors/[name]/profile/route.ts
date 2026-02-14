import { auth } from "@clerk/nextjs/server";
import { getCompetitorProfile } from "@/lib/competitors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name } = await params;
    const supplierName = decodeURIComponent(name);

    const profile = await getCompetitorProfile(supplierName);

    if (!profile) {
      return Response.json(
        { error: "No contract data found for this supplier" },
        { status: 404 }
      );
    }

    return Response.json({ profile });
  } catch (error) {
    console.error("Competitor profile API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor profile",
      },
      { status: 500 }
    );
  }
}
