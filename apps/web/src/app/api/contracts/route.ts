import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const contracts = await Contract.find({})
      .select(
        "title description buyerName sector valueMin valueMax buyerRegion cpvCodes source status publishedDate deadlineDate vibeScore vibeReasoning"
      )
      .sort({ publishedDate: -1 })
      .lean();

    return Response.json({ contracts });
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
