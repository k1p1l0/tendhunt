import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    // Fetch distinct values for each filterable field in parallel
    const [sectors, orgTypes, regions] = await Promise.all([
      Buyer.distinct("sector"),
      Buyer.distinct("orgType"),
      Buyer.distinct("region"),
    ]);

    // Filter out null/empty values and sort alphabetically
    const cleanSort = (values: (string | null | undefined)[]) =>
      values
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .sort((a, b) => a.localeCompare(b));

    return Response.json({
      sectors: cleanSort(sectors),
      orgTypes: cleanSort(orgTypes),
      regions: cleanSort(regions),
    });
  } catch (error) {
    console.error("Buyer filters API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch filter values",
      },
      { status: 500 }
    );
  }
}
