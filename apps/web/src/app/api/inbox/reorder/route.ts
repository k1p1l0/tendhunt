import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import PipelineCard from "@/models/pipeline-card";

import type { ReorderPayload } from "@/types/inbox";

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as ReorderPayload;

    if (!body.stage || !Array.isArray(body.cardIds)) {
      return Response.json(
        { error: "stage and cardIds are required" },
        { status: 400 }
      );
    }

    const allIds = [
      ...body.cardIds,
      ...(body.sourceColumn?.cardIds ?? []),
    ];

    if (allIds.some((id) => !mongoose.isValidObjectId(id))) {
      return Response.json(
        { error: "Invalid card ID in payload" },
        { status: 400 }
      );
    }

    await dbConnect();

    const bulkOps: Parameters<typeof PipelineCard.bulkWrite>[0] = [];

    for (let i = 0; i < body.cardIds.length; i++) {
      const cardId = body.cardIds[i];
      const isMovedCard =
        body.movedCard && cardId === body.movedCard.cardId;

      const updateFields: Record<string, unknown> = {
        stage: body.stage,
        position: i,
      };

      if (isMovedCard) {
        updateFields.stageChangedAt = new Date();
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: cardId, userId },
          update: { $set: updateFields },
        },
      });
    }

    if (body.sourceColumn?.cardIds) {
      for (let i = 0; i < body.sourceColumn.cardIds.length; i++) {
        bulkOps.push({
          updateOne: {
            filter: {
              _id: body.sourceColumn.cardIds[i],
              userId,
            },
            update: {
              $set: {
                stage: body.sourceColumn.stage,
                position: i,
              },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await PipelineCard.bulkWrite(bulkOps);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Inbox reorder error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reorder cards",
      },
      { status: 500 }
    );
  }
}
