import { auth } from "@clerk/nextjs/server";
import { getCompetitorContracts } from "@/lib/competitors";

import type { ContractSortField, SortDirection } from "@/lib/competitors";

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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
    );

    const validSortFields: ContractSortField[] = [
      "value",
      "awardDate",
      "buyerName",
    ];
    const sortByParam = searchParams.get("sortBy") as ContractSortField | null;
    const sortBy = sortByParam && validSortFields.includes(sortByParam)
      ? sortByParam
      : "awardDate";

    const sortDirParam = searchParams.get("sortDir") as SortDirection | null;
    const sortDir =
      sortDirParam === "asc" || sortDirParam === "desc"
        ? sortDirParam
        : "desc";

    const result = await getCompetitorContracts(supplierName, {
      page,
      pageSize,
      sortBy,
      sortDir,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Competitor contracts API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor contracts",
      },
      { status: 500 }
    );
  }
}
