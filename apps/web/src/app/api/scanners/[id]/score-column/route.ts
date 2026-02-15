import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner from "@/models/scanner";
import Contract from "@/models/contract";
import Signal from "@/models/signal";
import Buyer from "@/models/buyer";
import OfstedSchool from "@/models/ofsted-school";
import CompanyProfile from "@/models/company-profile";
import PipelineCard from "@/models/pipeline-card";
import AutoSendRule from "@/models/auto-send-rule";
import { generateScoringPrompt } from "@/lib/vibe-scanner";
import {
  scoreOneEntity,
  buildScoringSystemPrompt,
} from "@/lib/scoring-engine";
import {
  hasColumnReferences,
  resolveColumnReferences,
  extractReferencedColumnIds,
} from "@/lib/column-references";
import { batchGetReportTexts } from "@/lib/ofsted-report";
import type { AIModel } from "@/lib/ai-column-config";
import type { ScannerType } from "@/models/scanner";
import mongoose from "mongoose";
import pLimit from "p-limit";

const ENTITY_TYPE_MAP: Record<string, "contract" | "buyer" | "signal" | "school"> = {
  rfps: "contract",
  meetings: "signal",
  buyers: "buyer",
  schools: "school",
};

function getEntityDisplayFields(
  entity: Record<string, unknown>,
  scannerType: ScannerType
) {
  switch (scannerType) {
    case "rfps":
      return {
        title: String(entity.title || "Untitled Contract"),
        subtitle: String(entity.description || "").slice(0, 200),
        value: entity.valueMax as number | undefined,
        buyerName: entity.buyerName as string | undefined,
        sector: entity.sector as string | undefined,
        deadlineDate: entity.deadlineDate as Date | undefined,
      };
    case "buyers":
      return {
        title: String(entity.name || "Unknown Buyer"),
        subtitle: entity.description as string | undefined,
        sector: entity.sector as string | undefined,
      };
    case "meetings":
      return {
        title: String(entity.title || "Untitled Signal"),
        subtitle: entity.insight as string | undefined,
        buyerName: entity.organizationName as string | undefined,
        sector: entity.sector as string | undefined,
      };
    case "schools":
      return {
        title: String(entity.name || "Unknown School"),
        subtitle: `${entity.phase || ""} - ${entity.localAuthority || ""}`.trim(),
        sector: entity.region as string | undefined,
      };
    default:
      return {
        title: String(entity.title || entity.name || "Unknown"),
      };
  }
}

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

    const body = (await request.json()) as {
      columnId?: string;
      limit?: number;
      force?: boolean;
      entityIds?: string[];
    };

    if (!body.columnId || typeof body.columnId !== "string") {
      return Response.json(
        { error: "columnId is required" },
        { status: 400 }
      );
    }

    const rowLimit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 0;
    const forceRescore = body.force === true;
    const scopedEntityIds = Array.isArray(body.entityIds) && body.entityIds.length > 0
      ? body.entityIds
      : null;

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
        model?: string;
        useCase?: string;
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
    // When entityIds are provided (filtered view), only load those specific entities
    const entityFilter = scopedEntityIds
      ? { _id: { $in: scopedEntityIds.map((eid) => new mongoose.Types.ObjectId(eid)) } }
      : {};
    let entities: Array<Record<string, unknown>>;

    switch (scanner.type) {
      case "rfps":
        entities = (await Contract.find(entityFilter)
          .select(
            "title description buyerName sector valueMin valueMax buyerRegion cpvCodes deadlineDate"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      case "meetings":
        entities = (await Signal.find(entityFilter)
          .select(
            "organizationName signalType title insight sector sourceDate"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      case "buyers":
        entities = (await Buyer.find(entityFilter)
          .select(
            "name sector region description contractCount website contacts"
          )
          .lean()) as unknown as Array<Record<string, unknown>>;
        break;

      case "schools":
        entities = (await OfstedSchool.find(entityFilter)
          .select(
            "name urn phase schoolType localAuthority region " +
            "overallEffectiveness qualityOfEducation behaviourAndAttitudes " +
            "personalDevelopment leadershipAndManagement " +
            "inspectionDate previousOverallEffectiveness ratingDirection " +
            "lastDowngradeDate downgradeType totalPupils reportUrl"
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

    // Preserve display order: re-sort to match the entityIds array from the client
    if (scopedEntityIds) {
      const orderMap = new Map(scopedEntityIds.map((id, idx) => [id, idx]));
      entities.sort((a, b) => {
        const aIdx = orderMap.get(String(a._id)) ?? Infinity;
        const bIdx = orderMap.get(String(b._id)) ?? Infinity;
        return aIdx - bIdx;
      });
    }

    // Collect existing score entity IDs for this column
    const existingScoreIds = new Set(
      ((scanner.scores as unknown as Array<{ columnId: string; entityId: string }>) || [])
        .filter((s) => s.columnId === body.columnId)
        .map((s) => String(s.entityId))
    );

    if (forceRescore) {
      // Force: remove all existing scores for this column
      await Scanner.updateOne(
        { _id: scanner._id },
        { $pull: { scores: { columnId: body.columnId } } }
      );
    }

    // Filter entities: skip already-scored unless force
    let entitiesToScore = forceRescore
      ? entities
      : entities.filter((e) => !existingScoreIds.has(String(e._id || e.id || "")));

    // Apply row limit if specified
    if (rowLimit > 0 && entitiesToScore.length > rowLimit) {
      entitiesToScore = entitiesToScore.slice(0, rowLimit);
    }

    if (entitiesToScore.length === 0) {
      // All rows already scored, nothing to do — return immediate complete
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)
          );
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
    }

    // If force, already cleared above. If not force, only remove scores
    // for entities we're about to re-score (for incremental runs, none).
    if (!forceRescore && entitiesToScore.length > 0) {
      const entityIds = entitiesToScore.map((e) => String(e._id || e.id || ""));
      await Scanner.updateOne(
        { _id: scanner._id },
        {
          $pull: {
            scores: {
              columnId: body.columnId,
              entityId: { $in: entityIds },
            },
          },
        }
      );
    }

    // Check if the prompt references other columns ({{Column Name}} tokens)
    const promptHasRefs = hasColumnReferences(column.prompt);

    // Build scores lookup for referenced AI columns (only when needed)
    const allScores = ((scanner.scores ?? []) as unknown) as Array<{
      columnId: string;
      entityId: string;
      score?: number | null;
      value?: string;
      reasoning?: string;
    }>;
    const aiColumns = (scanner.aiColumns as Array<{ columnId: string; name: string; useCase?: string }>) ?? [];
    const customColumns = (scanner.customColumns as Array<{
      columnId: string;
      name: string;
      accessor: string;
      dataType: string;
    }> | undefined) ?? [];

    let referencedScores: typeof allScores = [];
    if (promptHasRefs) {
      const refColumnIds = extractReferencedColumnIds(
        column.prompt,
        scanner.type,
        aiColumns,
        customColumns
      );
      if (refColumnIds.length > 0) {
        const refSet = new Set(refColumnIds);
        referencedScores = allScores.filter((s) => refSet.has(s.columnId));
      }
    }

    // Build system prompt — static when no refs, per-entity when refs exist
    const staticSystemPrompt = promptHasRefs
      ? null
      : buildScoringSystemPrompt(baseScoringPrompt, column.prompt, column.useCase);

    // Pre-fetch Ofsted report texts for schools scanner type
    // Maps entityId -> extracted report text (used as additionalContext during scoring)
    let reportTexts: Map<string, string> | null = null;
    if (scanner.type === "schools") {
      try {
        const schoolEntities = entitiesToScore.map((e) => ({
          _id: e._id,
          urn: e.urn as number,
          reportUrl: e.reportUrl as string | undefined,
        }));
        reportTexts = await batchGetReportTexts(schoolEntities);
        console.log(
          `[score-column] Pre-fetched ${reportTexts.size}/${entitiesToScore.length} Ofsted reports`
        );
      } catch (err) {
        console.error(
          "[score-column] Report pre-fetch failed (scoring will proceed without report text):",
          err instanceof Error ? err.message : err
        );
      }
    }

    // Load auto-send rules for this scanner + column (cached for entire run)
    const autoSendRules = await AutoSendRule.find({
      userId,
      scannerId: id,
      columnId: body.columnId,
      isActive: true,
    }).lean();

    const entityType = ENTITY_TYPE_MAP[scanner.type as string] ?? "contract";

    // SSE stream with cancellation support
    const encoder = new TextEncoder();
    const concurrencyLimit = pLimit(2);
    let cancelled = false;

    const stream = new ReadableStream({
      async start(controller) {
        const columnScores: Array<{
          columnId: string;
          entityId: string;
          score: number | null;
          value: string;
          reasoning: string;
        }> = [];

        function send(data: Record<string, unknown>) {
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
          send({
            type: "column_start",
            columnId: column.columnId,
            columnName: column.name,
            total: entitiesToScore.length,
          });

          let scored = 0;

          const promises = entitiesToScore.map((entity) =>
            concurrencyLimit(async () => {
              if (cancelled) return;

              const entityId = String(entity._id || entity.id || "unknown");

              try {
                const entitySystemPrompt = staticSystemPrompt ?? buildScoringSystemPrompt(
                  baseScoringPrompt,
                  resolveColumnReferences(
                    column.prompt,
                    entity,
                    scanner.type,
                    referencedScores,
                    aiColumns,
                    customColumns
                  ),
                  column.useCase
                );

                // For schools, include Ofsted report text as additional context
                const reportContext = reportTexts?.get(entityId) ?? undefined;

                const result = await scoreOneEntity(
                  entity,
                  scanner.type,
                  entitySystemPrompt,
                  scanner.searchQuery || "",
                  (column.model as AIModel) || "haiku",
                  column.useCase,
                  reportContext
                );

                if (cancelled) return;

                scored++;

                columnScores.push({
                  columnId: column.columnId,
                  entityId,
                  score: result.score,
                  value: result.response,
                  reasoning: result.reasoning,
                });

                // Auto-send check: create inbox cards for qualifying scores
                if (
                  result.score != null &&
                  autoSendRules.length > 0
                ) {
                  for (const rule of autoSendRules) {
                    if (result.score >= rule.threshold) {
                      const displayFields = getEntityDisplayFields(
                        entity,
                        scanner.type as ScannerType
                      );
                      const position = await PipelineCard.countDocuments({
                        userId,
                        stage: rule.stage,
                        isArchived: false,
                      });
                      void PipelineCard.findOneAndUpdate(
                        { userId, entityType, entityId },
                        {
                          $setOnInsert: {
                            userId,
                            entityType,
                            entityId,
                            ...displayFields,
                            stage: rule.stage,
                            addedBy: "auto_rule",
                            autoRuleId: String(rule._id),
                            position,
                            priority: "LOW",
                            isArchived: false,
                          },
                        },
                        { upsert: true }
                      ).catch((err: unknown) => {
                        console.error(
                          "Auto-send rule card creation failed:",
                          err instanceof Error ? err.message : err
                        );
                      });
                    }
                  }
                }

                send({
                  type: "progress",
                  columnId: column.columnId,
                  entityId,
                  score: result.score,
                  reasoning: result.reasoning,
                  response: result.response,
                  scored,
                  total: entitiesToScore.length,
                });
              } catch (err) {
                if (cancelled) return;

                const errMsg = err instanceof Error ? err.message : String(err);
                console.error(
                  `Scoring error [${column.columnId}] entity ${entityId}:`,
                  errMsg
                );

                const isFatal =
                  errMsg.includes("credit balance is too low") ||
                  errMsg.includes("invalid x-api-key") ||
                  errMsg.includes("authentication") ||
                  errMsg.includes("permission");

                scored++;

                send({
                  type: "error",
                  columnId: column.columnId,
                  entityId,
                  message: errMsg,
                  fatal: isFatal,
                  scored,
                  total: entitiesToScore.length,
                });

                if (isFatal) {
                  cancelled = true;
                }
              }
            })
          );

          await Promise.all(promises);

          if (!cancelled) {
            send({
              type: "column_complete",
              columnId: column.columnId,
              scored,
            });
          }

          // Persist whatever scores we collected (even if cancelled partway)
          if (columnScores.length > 0) {
            await Scanner.updateOne(
              { _id: scanner._id },
              {
                $push: { scores: { $each: columnScores } },
                $set: { lastScoredAt: new Date() },
              }
            );
          }

          if (!cancelled) {
            send({ type: "complete" });
          }
        } catch (err) {
          console.error("Single-column scoring error:", err instanceof Error ? err.message : err);
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
