import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import PipelineCard from "@/models/pipeline-card";
import PipelineCardNote from "@/models/pipeline-card-note";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return Response.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const card = await PipelineCard.findOne({
      _id: id,
      userId,
    }).lean();

    if (!card) {
      return Response.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return Response.json({ card });
  } catch (error) {
    console.error("Inbox card fetch error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch card",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return Response.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      stage?: string;
      priority?: string;
      isArchived?: boolean;
    };

    const updates: Record<string, unknown> = {};

    if (body.stage) {
      const validStages = [
        "NEW",
        "QUALIFIED",
        "PREPARING_BID",
        "SUBMITTED",
        "WON",
        "LOST",
      ];
      if (!validStages.includes(body.stage)) {
        return Response.json(
          { error: "Invalid stage value" },
          { status: 400 }
        );
      }
      updates.stage = body.stage;
      updates.stageChangedAt = new Date();
    }

    if (body.priority) {
      if (!["LOW", "MEDIUM", "HIGH"].includes(body.priority)) {
        return Response.json(
          { error: "Invalid priority value" },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (typeof body.isArchived === "boolean") {
      updates.isArchived = body.isArchived;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    await dbConnect();

    const card = await PipelineCard.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!card) {
      return Response.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return Response.json({ card });
  } catch (error) {
    console.error("Inbox card update error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update card",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return Response.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await PipelineCard.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return Response.json(
        { error: "Card not found or access denied" },
        { status: 404 }
      );
    }

    await PipelineCardNote.deleteMany({ cardId: id });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Inbox card delete error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete card",
      },
      { status: 500 }
    );
  }
}
