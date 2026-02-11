import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import VibeScanner from "@/models/vibe-scanner";
import { updateScoringPrompt, resetScoringPrompt } from "@/lib/vibe-scanner";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const scanner = await VibeScanner.findOne({ userId }).lean();

    return Response.json({ scanner: scanner || null });
  } catch (error) {
    console.error("Scanner retrieval error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve scanner",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { scoringPrompt?: string };

    if (!body.scoringPrompt || typeof body.scoringPrompt !== "string" || body.scoringPrompt.trim().length === 0) {
      return Response.json(
        { error: "scoringPrompt must be a non-empty string" },
        { status: 400 }
      );
    }

    const scanner = await updateScoringPrompt(userId, body.scoringPrompt);

    return Response.json({ scanner });
  } catch (error) {
    console.error("Scanner update error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update scanner",
      },
      { status: 500 }
    );
  }
}

export async function PUT() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const scanner = await resetScoringPrompt(userId);

    return Response.json({ scanner });
  } catch (error) {
    console.error("Scanner reset error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reset scanner",
      },
      { status: 500 }
    );
  }
}
