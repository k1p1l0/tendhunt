import { auth } from "@clerk/nextjs/server";
import { fetchBuyerById } from "@/lib/buyers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const buyer = await fetchBuyerById(id);

    if (!buyer) {
      return Response.json({ error: "Buyer not found" }, { status: 404 });
    }

    return Response.json(buyer);
  } catch (error) {
    console.error("Buyer detail API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch buyer",
      },
      { status: 500 }
    );
  }
}
