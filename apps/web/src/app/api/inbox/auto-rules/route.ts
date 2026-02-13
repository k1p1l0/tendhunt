import { auth } from "@clerk/nextjs/server";

import { dbConnect } from "@/lib/mongodb";
import AutoSendRule from "@/models/auto-send-rule";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(request.url);
    const scannerId = url.searchParams.get("scannerId");

    const filter: Record<string, string> = { userId };
    if (scannerId) {
      filter.scannerId = scannerId;
    }

    const rules = await AutoSendRule.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ rules });
  } catch (error) {
    console.error("Auto-rules list error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list auto-send rules",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as {
      scannerId?: string;
      scannerName?: string;
      columnId?: string;
      columnName?: string;
      threshold?: number;
      stage?: string;
    };

    if (!body.scannerId || !body.columnId) {
      return Response.json(
        { error: "scannerId and columnId are required" },
        { status: 400 }
      );
    }

    if (
      body.threshold === undefined ||
      body.threshold < 0 ||
      body.threshold > 10
    ) {
      return Response.json(
        { error: "threshold must be between 0 and 10" },
        { status: 400 }
      );
    }

    await dbConnect();

    const rule = await AutoSendRule.findOneAndUpdate(
      { userId, scannerId: body.scannerId, columnId: body.columnId },
      {
        $set: {
          userId,
          scannerId: body.scannerId,
          scannerName: body.scannerName,
          columnId: body.columnId,
          columnName: body.columnName,
          threshold: body.threshold,
          stage: body.stage || "NEW",
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Auto-rules create error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create auto-send rule",
      },
      { status: 500 }
    );
  }
}
