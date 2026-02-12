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

/**
 * PATCH /api/scanners/[id]
 *
 * Updates scanner properties:
 * - name, description, searchQuery — direct string fields
 * - filters — type-specific filter object
 * - columnRenames — custom display names for core columns (merged individually)
 */
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
        { error: "Invalid scanner ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      searchQuery?: string;
      filters?: Record<string, unknown>;
      columnRenames?: Record<string, string>;
      columnFilters?: Record<string, string[]>;
      autoRun?: boolean;
      rowOffset?: number;
      rowLimit?: number;
    };

    const setFields: Record<string, unknown> = {};

    // Simple string fields
    if (typeof body.name === "string" && body.name.trim()) {
      setFields.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      setFields.description = body.description.trim();
    }
    if (typeof body.searchQuery === "string") {
      setFields.searchQuery = body.searchQuery.trim();
    }

    // Filters (replace entire object)
    if (body.filters && typeof body.filters === "object") {
      setFields.filters = body.filters;
    }

    // Column renames (merge individually)
    if (body.columnRenames && typeof body.columnRenames === "object") {
      for (const [key, value] of Object.entries(body.columnRenames)) {
        if (typeof value === "string" && value.trim()) {
          setFields[`columnRenames.${key}`] = value.trim();
        }
      }
    }

    // Column filters (replace entire map)
    if (body.columnFilters && typeof body.columnFilters === "object") {
      setFields.columnFilters = body.columnFilters;
    }

    // Auto-run toggle
    if (typeof body.autoRun === "boolean") {
      setFields.autoRun = body.autoRun;
    }

    // Row pagination
    if (typeof body.rowOffset === "number") {
      setFields.rowOffset = Math.max(0, Math.floor(body.rowOffset));
    }
    if (typeof body.rowLimit === "number") {
      setFields.rowLimit = Math.max(0, Math.floor(body.rowLimit));
    }

    if (Object.keys(setFields).length === 0) {
      return Response.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await Scanner.updateOne(
      { _id: id, userId },
      { $set: setFields }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    // Return the updated scanner
    const updated = await Scanner.findOne({ _id: id, userId }).lean();
    return Response.json({ scanner: updated });
  } catch (error) {
    console.error("Scanner patch error:", error);
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
