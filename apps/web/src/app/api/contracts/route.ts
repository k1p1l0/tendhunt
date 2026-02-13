import { auth } from "@clerk/nextjs/server";
import { fetchContracts } from "@/lib/contracts";
import type { ContractFilters } from "@/lib/contracts";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters: ContractFilters = {
      query: searchParams.get("q") ?? undefined,
      sector: searchParams.get("sector") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      minValue: searchParams.get("minValue")
        ? Number(searchParams.get("minValue"))
        : undefined,
      maxValue: searchParams.get("maxValue")
        ? Number(searchParams.get("maxValue"))
        : undefined,
      stage: searchParams.get("stage") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sort: (searchParams.get("sort") as ContractFilters["sort"]) ?? undefined,
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page")!, 10)
        : 1,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize")!, 10)
        : 0,
    };

    const { contracts, filteredCount, totalCount } =
      await fetchContracts(filters);

    return Response.json({ contracts, filteredCount, totalCount });
  } catch (error) {
    console.error("Contracts API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch contracts",
      },
      { status: 500 }
    );
  }
}
