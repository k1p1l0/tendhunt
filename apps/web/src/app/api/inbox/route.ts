import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import PipelineCard from "@/models/pipeline-card";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const cards = await PipelineCard.find({
      userId,
      isArchived: false,
    })
      .sort({ stage: 1, position: 1 })
      .lean();

    return Response.json({ cards });
  } catch (error) {
    console.error("Inbox list error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list inbox cards",
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
      entityType?: string;
      entityId?: string;
      title?: string;
      subtitle?: string;
      value?: number;
      currency?: string;
      deadlineDate?: string;
      sector?: string;
      buyerName?: string;
      logoUrl?: string;
    };

    if (!body.entityType || !body.entityId || !body.title) {
      return Response.json(
        { error: "entityType, entityId, and title are required" },
        { status: 400 }
      );
    }

    if (!["contract", "buyer", "signal"].includes(body.entityType)) {
      return Response.json(
        { error: "entityType must be contract, buyer, or signal" },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(body.entityId)) {
      return Response.json(
        { error: "Invalid entityId" },
        { status: 400 }
      );
    }

    await dbConnect();

    const position = await PipelineCard.countDocuments({
      userId,
      stage: "NEW",
      isArchived: false,
    });

    const card = await PipelineCard.findOneAndUpdate(
      {
        userId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
      {
        $setOnInsert: {
          userId,
          entityType: body.entityType,
          entityId: body.entityId,
          title: body.title,
          subtitle: body.subtitle,
          value: body.value,
          currency: body.currency || "GBP",
          deadlineDate: body.deadlineDate
            ? new Date(body.deadlineDate)
            : undefined,
          sector: body.sector,
          buyerName: body.buyerName,
          logoUrl: body.logoUrl,
          stage: "NEW",
          position,
          priority: "LOW",
          addedBy: "manual",
          isArchived: false,
        },
      },
      { upsert: true, new: true }
    );

    return Response.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Inbox create error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create inbox card",
      },
      { status: 500 }
    );
  }
}
