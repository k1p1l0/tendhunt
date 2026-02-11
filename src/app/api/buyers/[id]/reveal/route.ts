import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { CreditAccount, CreditTransaction } from "@/models/credit";
import ContactReveal from "@/models/contact-reveal";
import Buyer from "@/models/buyer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: buyerId } = await params;

    if (!mongoose.isValidObjectId(buyerId)) {
      return Response.json({ error: "Invalid buyer ID" }, { status: 400 });
    }

    await dbConnect();

    // Idempotency check: if already revealed, return success without deducting
    const existingReveal = await ContactReveal.findOne({ userId, buyerId });
    if (existingReveal) {
      const account = await CreditAccount.findOne({ userId }).lean();
      return Response.json({
        revealed: true,
        balance: account?.balance ?? 0,
        message: "Already unlocked",
      });
    }

    // Atomic credit deduction: $gte filter ensures no negative balance
    const account = await CreditAccount.findOneAndUpdate(
      { userId, balance: { $gte: 1 } },
      { $inc: { balance: -1, totalSpent: 1 } },
      { new: true }
    );

    if (!account) {
      return Response.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Fetch buyer name for transaction description
    const buyer = await Buyer.findById(buyerId).select("name").lean();
    const buyerName = buyer?.name ?? "Unknown buyer";

    // Create reveal record + transaction in parallel
    await Promise.all([
      ContactReveal.create({ userId, buyerId }),
      CreditTransaction.create({
        userId,
        type: "CONTACT_REVEAL",
        amount: -1,
        description: `Unlocked contacts for ${buyerName}`,
        contactId: buyerId.toString(),
        balanceAfter: account.balance,
      }),
    ]);

    return Response.json({ revealed: true, balance: account.balance });
  } catch (error) {
    console.error("Reveal API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reveal contacts",
      },
      { status: 500 }
    );
  }
}
