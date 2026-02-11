import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

/**
 * POST /api/scanners/[id]/columns
 *
 * Adds a new AI column to a scanner. The column is stored in the scanner's
 * aiColumns array with a nanoid-generated columnId.
 */
export async function POST(
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
        { error: "Invalid scanner ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      prompt?: string;
    };

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json(
        { error: "Column name is required" },
        { status: 400 }
      );
    }

    if (
      !body.prompt ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim()
    ) {
      return Response.json(
        { error: "Column prompt is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const columnId = nanoid(12);
    const newColumn = {
      columnId,
      name: body.name.trim(),
      prompt: body.prompt.trim(),
    };

    const result = await Scanner.updateOne(
      { _id: id, userId },
      { $push: { aiColumns: newColumn } }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    return Response.json({ column: newColumn }, { status: 201 });
  } catch (error) {
    console.error("Add column error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add column",
      },
      { status: 500 }
    );
  }
}
