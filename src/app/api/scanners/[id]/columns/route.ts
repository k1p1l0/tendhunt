import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import type { ScannerType } from "@/models/scanner";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { VALID_ACCESSORS } from "@/components/scanners/table-columns";
import { VALID_USE_CASES, VALID_MODELS } from "@/lib/ai-column-config";

const VALID_DATA_TYPES = new Set([
  "text",
  "number",
  "date",
  "currency",
  "badge",
  "url",
  "email",
  "checkbox",
  "paragraph",
]);

/**
 * POST /api/scanners/[id]/columns
 *
 * Adds a new column to a scanner.
 * - If body contains `prompt` → AI column (stored in aiColumns)
 * - If body contains `accessor` → Custom data column (stored in customColumns)
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
      accessor?: string;
      dataType?: string;
      useCase?: string;
      model?: string;
    };

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json(
        { error: "Column name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ── Custom data column ──────────────────────────────────
    if (body.accessor) {
      if (typeof body.accessor !== "string" || !body.accessor.trim()) {
        return Response.json(
          { error: "Field accessor is required" },
          { status: 400 }
        );
      }

      if (!body.dataType || !VALID_DATA_TYPES.has(body.dataType)) {
        return Response.json(
          { error: "Invalid data type" },
          { status: 400 }
        );
      }

      // Look up scanner to validate accessor against its type
      const scanner = await Scanner.findOne({ _id: id, userId }).lean();
      if (!scanner) {
        return Response.json(
          { error: "Scanner not found or access denied" },
          { status: 404 }
        );
      }

      const scannerType = scanner.type as ScannerType;
      const validFields = VALID_ACCESSORS[scannerType];
      if (!validFields?.has(body.accessor)) {
        return Response.json(
          { error: `Invalid field "${body.accessor}" for scanner type "${scannerType}"` },
          { status: 400 }
        );
      }

      const columnId = nanoid(12);
      const newColumn = {
        columnId,
        name: body.name.trim(),
        accessor: body.accessor.trim(),
        dataType: body.dataType,
      };

      const result = await Scanner.updateOne(
        { _id: id, userId },
        { $push: { customColumns: newColumn } }
      );

      if (result.matchedCount === 0) {
        return Response.json(
          { error: "Scanner not found or access denied" },
          { status: 404 }
        );
      }

      return Response.json({ column: newColumn, kind: "custom" }, { status: 201 });
    }

    // ── AI column (existing logic) ──────────────────────────
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

    const columnId = nanoid(12);
    const newColumn = {
      columnId,
      name: body.name.trim(),
      prompt: body.prompt.trim(),
      useCase: body.useCase && VALID_USE_CASES.has(body.useCase) ? body.useCase : "score",
      model: body.model && VALID_MODELS.has(body.model) ? body.model : "haiku",
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

    return Response.json({ column: newColumn, kind: "ai" }, { status: 201 });
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

/**
 * PUT /api/scanners/[id]/columns
 *
 * Updates an existing column.
 * - If body has `prompt` → AI column update
 * - If body has `accessor` or `dataType` → Custom column update
 */
export async function PUT(
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
      columnId?: string;
      name?: string;
      prompt?: string;
      accessor?: string;
      dataType?: string;
      useCase?: string;
      model?: string;
    };

    if (!body.columnId || typeof body.columnId !== "string") {
      return Response.json(
        { error: "columnId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ── Custom column update ────────────────────────────────
    if (body.accessor !== undefined || body.dataType !== undefined) {
      const setFields: Record<string, string> = {};

      if (body.name && typeof body.name === "string" && body.name.trim()) {
        setFields["customColumns.$.name"] = body.name.trim();
      }
      if (body.accessor && typeof body.accessor === "string" && body.accessor.trim()) {
        // Validate accessor against scanner type
        const scanner = await Scanner.findOne({ _id: id, userId }).lean();
        if (!scanner) {
          return Response.json(
            { error: "Scanner not found or access denied" },
            { status: 404 }
          );
        }
        const scannerType = scanner.type as ScannerType;
        const validFields = VALID_ACCESSORS[scannerType];
        if (!validFields?.has(body.accessor)) {
          return Response.json(
            { error: `Invalid field "${body.accessor}" for scanner type "${scannerType}"` },
            { status: 400 }
          );
        }
        setFields["customColumns.$.accessor"] = body.accessor.trim();
      }
      if (body.dataType && VALID_DATA_TYPES.has(body.dataType)) {
        setFields["customColumns.$.dataType"] = body.dataType;
      }

      if (Object.keys(setFields).length === 0) {
        return Response.json(
          { error: "Nothing to update" },
          { status: 400 }
        );
      }

      const result = await Scanner.updateOne(
        { _id: id, userId, "customColumns.columnId": body.columnId },
        { $set: setFields }
      );

      if (result.matchedCount === 0) {
        return Response.json(
          { error: "Scanner or custom column not found" },
          { status: 404 }
        );
      }

      return Response.json({
        updated: { columnId: body.columnId, ...setFields },
        kind: "custom",
      });
    }

    // ── AI column update (existing logic) ───────────────────
    const setFields: Record<string, string> = {};
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      setFields["aiColumns.$.name"] = body.name.trim();
    }
    if (body.prompt && typeof body.prompt === "string" && body.prompt.trim()) {
      setFields["aiColumns.$.prompt"] = body.prompt.trim();
    }
    if (body.useCase && VALID_USE_CASES.has(body.useCase)) {
      setFields["aiColumns.$.useCase"] = body.useCase;
    }
    if (body.model && VALID_MODELS.has(body.model)) {
      setFields["aiColumns.$.model"] = body.model;
    }

    if (Object.keys(setFields).length === 0) {
      return Response.json(
        { error: "Nothing to update — provide name, prompt, useCase, and/or model" },
        { status: 400 }
      );
    }

    const result = await Scanner.updateOne(
      { _id: id, userId, "aiColumns.columnId": body.columnId },
      { $set: setFields }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { error: "Scanner or column not found" },
        { status: 404 }
      );
    }

    return Response.json({
      updated: {
        columnId: body.columnId,
        ...(setFields["aiColumns.$.name"] && { name: setFields["aiColumns.$.name"] }),
        ...(setFields["aiColumns.$.prompt"] && { prompt: setFields["aiColumns.$.prompt"] }),
        ...(setFields["aiColumns.$.useCase"] && { useCase: setFields["aiColumns.$.useCase"] }),
        ...(setFields["aiColumns.$.model"] && { model: setFields["aiColumns.$.model"] }),
      },
      kind: "ai",
    });
  } catch (error) {
    console.error("Update column error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update column",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scanners/[id]/columns
 *
 * Removes a column (AI or custom) by columnId.
 * Checks aiColumns first, then customColumns.
 */
export async function DELETE(
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

    const body = (await request.json()) as { columnId?: string };

    if (!body.columnId || typeof body.columnId !== "string") {
      return Response.json(
        { error: "columnId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Look up scanner to determine which array the column is in
    const scanner = await Scanner.findOne({ _id: id, userId }).lean();
    if (!scanner) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    // Check if it's an AI column
    const isAiColumn = (scanner.aiColumns as Array<{ columnId: string }>)?.some(
      (c) => c.columnId === body.columnId
    );

    if (isAiColumn) {
      // Remove AI column + associated scores
      await Scanner.updateOne(
        { _id: id, userId },
        {
          $pull: {
            aiColumns: { columnId: body.columnId },
            scores: { columnId: body.columnId },
          },
        }
      );
      return Response.json({ deleted: body.columnId, kind: "ai" });
    }

    // Check if it's a custom column
    const isCustomColumn = (scanner.customColumns as Array<{ columnId: string }> | undefined)?.some(
      (c) => c.columnId === body.columnId
    );

    if (isCustomColumn) {
      await Scanner.updateOne(
        { _id: id, userId },
        { $pull: { customColumns: { columnId: body.columnId } } }
      );
      return Response.json({ deleted: body.columnId, kind: "custom" });
    }

    return Response.json(
      { error: "Column not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Delete column error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete column",
      },
      { status: 500 }
    );
  }
}
