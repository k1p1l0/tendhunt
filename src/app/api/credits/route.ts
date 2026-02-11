import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { CreditAccount } from "@/models/credit";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const account = await CreditAccount.findOne({ userId }).lean();

    return Response.json({ balance: account?.balance ?? 0 });
  } catch (error) {
    console.error("Credits API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch credit balance",
      },
      { status: 500 }
    );
  }
}
