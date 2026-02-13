import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { getAnthropicKey } from "@/lib/ai-key-resolver";
import Scanner from "@/models/scanner";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import Buyer from "@/models/buyer";
import CompanyProfile from "@/models/company-profile";
import { generateScoringPrompt } from "@/lib/vibe-scanner";
import { scoreEntities } from "@/lib/scoring-engine";
import mongoose from "mongoose";

/**
 * POST /api/scanners/[id]/score
 *
 * Batch-scores all entities for a scanner across all AI columns.
 * Streams progress events via SSE for real-time UI updates.
 *
 * Flow:
 * 1. Auth + load scanner + verify ownership
 * 2. Load CompanyProfile to generate base scoring prompt (>4096 tokens for caching)
 * 3. Load type-appropriate entities from the database
 * 4. Clear existing scores for a fresh re-score
 * 5. Stream scoring progress via SSE
 * 6. Persist all scores to Scanner.scores + update source documents
 */
export async function POST(
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
        { error: "Invalid scanner ID" },
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

    // Resolve BYOK key (falls back to platform key)
    const apiKey = await getAnthropicKey(userId);

    // Load company profile for base scoring prompt generation
    const profile = await CompanyProfile.findOne({ userId });
    if (!profile) {
      return Response.json(
        { error: "No company profile found. Complete onboarding first." },
        { status: 400 }
      );
    }

    // Generate base scoring prompt (>4096 tokens for Haiku prompt caching)
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

    // Clear existing scores for a fresh re-score
    await Scanner.updateOne({ _id: scanner._id }, { $set: { scores: [] } });

    // SSE stream with cancellation support
    const encoder = new TextEncoder();
    let cancelled = false;

    const stream = new ReadableStream({
      async start(controller) {
        const allScores: Array<{
          columnId: string;
          entityId: string;
          score: number | null;
          value: string;
          reasoning: string;
        }> = [];

        function send(data: object) {
          if (cancelled) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            cancelled = true;
          }
        }

        try {
          for await (const event of scoreEntities(
            {
              aiColumns: scanner.aiColumns as Array<{
                columnId: string;
                name: string;
                prompt: string;
                model?: string;
                useCase?: string;
              }>,
              searchQuery: scanner.searchQuery || "",
              type: scanner.type,
            },
            entities,
            baseScoringPrompt,
            apiKey
          )) {
            if (cancelled) break;

            send(event);

            // Collect scores for persistence
            if (event.type === "progress" && event.entityId) {
              allScores.push({
                columnId: event.columnId!,
                entityId: event.entityId,
                score: event.score ?? null,
                value: event.response || "",
                reasoning: event.reasoning || "",
              });
            }
          }

          // Persist whatever scores we collected (even if cancelled partway)
          if (allScores.length > 0) {
            await Scanner.updateOne(
              { _id: scanner._id },
              {
                $set: {
                  scores: allScores,
                  lastScoredAt: new Date(),
                },
              }
            );
          }

          // Update source documents' vibeScore/vibeReasoning for the primary
          // AI column (first column) -- only for types that have these fields
          if (!cancelled) {
            const firstColumn = scanner.aiColumns[0];
            if (firstColumn && scanner.type !== "meetings") {
              const primaryScores = allScores.filter(
                (s) =>
                  s.columnId === (firstColumn as { columnId: string }).columnId &&
                  s.score != null
              );

              if (primaryScores.length > 0) {
                const Model =
                  scanner.type === "rfps" ? Contract : Buyer;

                const bulkOps = primaryScores.map((s) => ({
                  updateOne: {
                    filter: { _id: s.entityId },
                    update: {
                      $set: {
                        vibeScore: s.score,
                        vibeReasoning: s.reasoning,
                      },
                    },
                  },
                }));

                await Model.bulkWrite(bulkOps);
              }
            }
          }
        } catch (err) {
          console.error("Scoring stream error:", err);
          send({
            type: "error",
            message:
              err instanceof Error
                ? err.message
                : "Scoring failed",
          });
        }

        if (!cancelled) {
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
      cancel() {
        cancelled = true;
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
    console.error("Scoring API error:", error);
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
