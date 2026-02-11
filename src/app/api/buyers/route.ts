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

    const buyers = await Buyer.find({})
      .select("name description sector region website contractCount contacts")
      .sort({ name: 1 })
      .lean();

    // Add computed contactCount field for each buyer
    const buyersWithCount = buyers.map((b) => ({
      ...b,
      contactCount: Array.isArray(b.contacts) ? b.contacts.length : 0,
    }));

    return Response.json({ buyers: buyersWithCount });
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
