import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { dbConnect } from "@/lib/mongodb";
import AutoSendRule from "@/models/auto-send-rule";

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
      return Response.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      threshold?: number;
      stage?: string;
      isActive?: boolean;
    };

    const allowedFields = ["threshold", "stage", "isActive"] as const;
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (
      updates.threshold !== undefined &&
      (typeof updates.threshold !== "number" ||
        updates.threshold < 0 ||
        updates.threshold > 10)
    ) {
      return Response.json(
        { error: "threshold must be between 0 and 10" },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await dbConnect();

    const rule = await AutoSendRule.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!rule) {
      return Response.json({ error: "Rule not found" }, { status: 404 });
    }

    return Response.json({ rule });
  } catch (error) {
    console.error("Auto-rules update error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update auto-send rule",
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
      return Response.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    await dbConnect();

    const result = await AutoSendRule.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return Response.json({ error: "Rule not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Auto-rules delete error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete auto-send rule",
      },
      { status: 500 }
    );
  }
}
