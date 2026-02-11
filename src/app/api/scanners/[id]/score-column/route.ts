import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import Buyer from "@/models/buyer";
import CompanyProfile from "@/models/company-profile";
import { generateScoringPrompt } from "@/lib/vibe-scanner";
import {
  scoreOneEntity,
  buildScoringSystemPrompt,
} from "@/lib/scoring-engine";
import mongoose from "mongoose";
import pLimit from "p-limit";

/**
 * POST /api/scanners/[id]/score-column
 *
 * Scores a single AI column for all entities in a scanner.
 * Used when a new column is added -- scores only the new column, not all columns.
 * Streams progress events via SSE for real-time UI updates.
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

    const body = (await request.json()) as { columnId?: string };

    if (!body.columnId || typeof body.columnId !== "string") {
      return Response.json(
        { error: "columnId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Load scanner and verify ownership
    const scanner = await Scanner.findOne({ _id: id, userId });
    if (!scanner) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    // Find the target column
    const column = (
      scanner.aiColumns as Array<{
        columnId: string;
        name: string;
        prompt: string;
      }>
    ).find((c) => c.columnId === body.columnId);

    if (!column) {
      return Response.json(
        { error: "Column not found in scanner" },
        { status: 404 }
      );
    }

    // Load company profile for base scoring prompt
    const profile = await CompanyProfile.findOne({ userId });
    if (!profile) {
      return Response.json(
        { error: "No company profile found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const baseScoringPrompt = generateScoringPrompt(profile);

    // Load entities based on scanner type
    let entities: Array<Record<string, unknown>>;

    switch (scanner.type) {
      case "rfps":
        entities = (await Contract.find({})
          .select(
            "title description buyerName sector valueMin valueMax buyerRegion cpvCodes deadlineDate"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      case "meetings":
        entities = (await Signal.find({})
          .select(
            "organizationName signalType title insight sector sourceDate"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      case "buyers":
        entities = (await Buyer.find({})
          .select(
            "name sector region description contractCount website contacts"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      default:
        return Response.json(
          { error: `Unknown scanner type: ${scanner.type}` },
          { status: 400 }
        );
    }

    if (entities.length === 0) {
      return Response.json(
        { error: "No entities found to score" },
        { status: 400 }
      );
    }

    // Remove existing scores for this column only
    await Scanner.updateOne(
      { _id: scanner._id },
      { $pull: { scores: { columnId: body.columnId } } }
    );

    // Build system prompt for this column
    const systemPrompt = buildScoringSystemPrompt(
      baseScoringPrompt,
      column.prompt
    );

    // SSE stream
    const encoder = new TextEncoder();
    const limit = pLimit(5);

    const stream = new ReadableStream({
      async start(controller) {
        const columnScores: Array<{
          columnId: string;
          entityId: string;
          score: number | null;
          value: string;
          reasoning: string;
        }> = [];

        try {
          // Notify: column starting
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "column_start",
                columnId: column.columnId,
                columnName: column.name,
                total: entities.length,
              })}\n\n`
            )
          );

          let scored = 0;

          // Score all entities for this column with p-limit(5)
          const promises = entities.map((entity) =>
            limit(async () => {
              const entityId = String(entity._id || entity.id || "unknown");

              try {
                const result = await scoreOneEntity(
                  entity,
                  scanner.type,
                  systemPrompt,
                  scanner.searchQuery || ""
                );

                scored++;

                const event = {
                  type: "progress",
                  columnId: column.columnId,
                  entityId,
                  score: result.score,
                  reasoning: result.reasoning,
                  response: result.response,
                  scored,
                  total: entities.length,
                };

                columnScores.push({
                  columnId: column.columnId,
                  entityId,
                  score: result.score,
                  value: result.response,
                  reasoning: result.reasoning,
                });

                return event;
              } catch (err) {
                console.error(
                  `Scoring error [${column.columnId}] entity ${entityId}:`,
                  err
                );

                scored++;

                return {
                  type: "error",
                  columnId: column.columnId,
                  entityId,
                  scored,
                  total: entities.length,
                };
              }
            })
          );

          // Wait for all and yield sequentially
          const results = await Promise.all(promises);
          for (const event of results) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }

          // Column complete
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "column_complete",
                columnId: column.columnId,
                scored,
              })}\n\n`
            )
          );

          // Persist scores for this column
          if (columnScores.length > 0) {
            await Scanner.updateOne(
              { _id: scanner._id },
              {
                $push: { scores: { $each: columnScores } },
                $set: { lastScoredAt: new Date() },
              }
            );
          }

          // All done
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete" })}\n\n`
            )
          );
        } catch (err) {
          console.error("Single-column scoring error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  err instanceof Error
                    ? err.message
                    : "Scoring failed",
              })}\n\n`
            )
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Score-column API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start scoring",
      },
      { status: 500 }
    );
  }
}
