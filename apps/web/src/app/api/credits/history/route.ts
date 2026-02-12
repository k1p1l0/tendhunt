import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { CreditTransaction } from "@/models/credit";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10", 10);

    const [transactions, total] = await Promise.all([
      CreditTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      CreditTransaction.countDocuments({ userId }),
    ]);

    return Response.json({ transactions, total });
  } catch (error) {
    console.error("Credit history API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch credit history",
      },
      { status: 500 }
    );
  }
}
