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

    const { id: cardId } = await params;

    if (!mongoose.isValidObjectId(cardId)) {
      return Response.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const card = await PipelineCard.findOne({
      _id: cardId,
      userId,
    }).lean();

    if (!card) {
      return Response.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    const notes = await PipelineCardNote.find({ cardId })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ notes });
  } catch (error) {
    console.error("Notes list error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list notes",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: cardId } = await params;

    if (!mongoose.isValidObjectId(cardId)) {
      return Response.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { content?: string };

    if (
      !body.content ||
      typeof body.content !== "string" ||
      body.content.trim().length === 0
    ) {
      return Response.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (body.content.length > 2000) {
      return Response.json(
        { error: "Content must be 2000 characters or less" },
        { status: 400 }
      );
    }

    await dbConnect();

    const card = await PipelineCard.findOne({
      _id: cardId,
      userId,
    }).lean();

    if (!card) {
      return Response.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    const note = await PipelineCardNote.create({
      cardId,
      userId,
      content: body.content.trim(),
    });

    return Response.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Note create error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create note",
      },
      { status: 500 }
    );
  }
}
