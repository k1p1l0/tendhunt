import { auth } from "@clerk/nextjs/server";
import { fetchBuyers } from "@/lib/buyers";
import type { BuyerFilters } from "@/lib/buyers";

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
      q: searchParams.get("q") ?? undefined,
      sector: searchParams.get("sector") ?? undefined,
      orgType: searchParams.get("orgType") ?? undefined,
      region: searchParams.get("region") ?? undefined,
    };

    const { buyers, total, filteredCount } = await fetchBuyers(filters);

    return Response.json({ buyers, total, filteredCount });
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
