import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import mongoose from "mongoose";

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
      return Response.json({ error: "Invalid scanner ID" }, { status: 400 });
    }

    await dbConnect();
    const scanner = await Scanner.findOne({ _id: id, userId }).lean();

    if (!scanner) {
      return Response.json({ error: "Scanner not found" }, { status: 404 });
    }

    return Response.json({ scanner });
  } catch (error) {
    console.error("Scanner fetch error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch scanner",
      },
      { status: 500 }
    );
  }
}
