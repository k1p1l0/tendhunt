import { auth } from "@clerk/nextjs/server";
import { fetchBuyers, type BuyerFilters } from "@/lib/buyers";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters: BuyerFilters = {
      sort: (searchParams.get("sort") as BuyerFilters["sort"]) ?? undefined,
      order: (searchParams.get("order") as BuyerFilters["order"]) ?? undefined,
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page")!, 10)
        : undefined,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize")!, 10)
        : undefined,
    };

    const { buyers, total } = await fetchBuyers(userId, filters);

    return Response.json({ buyers, total });
  } catch (error) {
    console.error("Buyers API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch buyers",
      },
      { status: 500 }
    );
  }
}
