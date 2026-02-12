import { auth } from "@clerk/nextjs/server";
import { getOrCreateScanner } from "@/lib/vibe-scanner";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const scanner = await getOrCreateScanner(userId);

    // Convert Mongoose document to plain object for JSON serialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (scanner as any).toObject ? (scanner as any).toObject() : scanner;

    return Response.json({
      scanner: {
        _id: doc._id,
        scoringPrompt: doc.scoringPrompt,
        isDefault: doc.isDefault,
        threshold: doc.threshold,
        contractScores: doc.contractScores || [],
        buyerScores: doc.buyerScores || [],
      },
    });
  } catch (error) {
    console.error("Scanner creation error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create scanner";

    // If the error indicates no company profile, return 400
    if (message.toLowerCase().includes("no company profile")) {
      return Response.json({ error: message }, { status: 400 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
