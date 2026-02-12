import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { anthropic } from "@/lib/anthropic";
import VibeScanner from "@/models/vibe-scanner";
import Contract from "@/models/contract";

async function scoreOneContract(
  contract: {
    _id: unknown;
    title: string;
    buyerName: string;
    description?: string | null;
    sector?: string | null;
    buyerRegion?: string | null;
    valueMin?: number | null;
    valueMax?: number | null;
    cpvCodes?: string[] | null;
  },
  scoringPrompt: string
) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: [
      {
        type: "text",
        text: scoringPrompt,
        cache_control: { type: "ephemeral" }, // Prompt caching -- 5 min TTL
      },
    ],
    messages: [
      {
        role: "user",
        content: `Score this contract:\n\nTitle: ${contract.title}\nBuyer: ${contract.buyerName}\nDescription: ${(contract.description || "").substring(0, 2000)}\nSector: ${contract.sector || "Unknown"}\nRegion: ${contract.buyerRegion || "Unknown"}\nValue: ${contract.valueMin || "N/A"}-${contract.valueMax || "N/A"} GBP\nCPV Codes: ${(contract.cpvCodes || []).join(", ") || "None"}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema" as const,
        schema: {
          type: "object" as const,
          properties: {
            score: { type: "number" as const },
            reasoning: { type: "string" as const },
          },
          required: ["score", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.content[0];
  if (content.type === "text") {
    return JSON.parse(content.text) as { score: number; reasoning: string };
  }
  return { score: 0, reasoning: "Failed to parse response" };
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { scannerId?: string };
    if (!body.scannerId) {
      return Response.json(
        { error: "scannerId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Load scanner and verify ownership
    const scanner = await VibeScanner.findById(body.scannerId);
    if (!scanner || scanner.userId !== userId) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    // Load all contracts with minimal fields
    const contracts = await Contract.find({})
      .select(
        "title description buyerName sector valueMin valueMax buyerRegion cpvCodes"
      )
      .lean();

    // Clear existing contractScores to avoid stale scores after re-scoring
    await VibeScanner.updateOne(
      { _id: scanner._id },
      { $set: { contractScores: [] } }
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const pLimit = (await import("p-limit")).default;
        const limit = pLimit(5); // 5 concurrent API calls

        // Send initial event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", total: contracts.length })}\n\n`
          )
        );

        let scored = 0;
        const allScores: Array<{
          contractId: string;
          score: number;
          reasoning: string;
        }> = [];

        // Process all contracts with concurrency limit
        const promises = contracts.map((contract) =>
          limit(async () => {
            try {
              const result = await scoreOneContract(
                contract as {
                  _id: unknown;
                  title: string;
                  buyerName: string;
                  description?: string | null;
                  sector?: string | null;
                  buyerRegion?: string | null;
                  valueMin?: number | null;
                  valueMax?: number | null;
                  cpvCodes?: string[] | null;
                },
                scanner.scoringPrompt
              );
              scored++;
              allScores.push({
                contractId: String(contract._id),
                ...result,
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    scored,
                    total: contracts.length,
                    contractId: String(contract._id),
                    score: result.score,
                    reasoning: result.reasoning,
                  })}\n\n`
                )
              );
            } catch (err) {
              console.error(
                `Failed to score contract ${contract._id}:`,
                err
              );
              scored++;
              allScores.push({
                contractId: String(contract._id),
                score: 0,
                reasoning: "Scoring failed",
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    scored,
                    total: contracts.length,
                    contractId: String(contract._id),
                    score: 0,
                    reasoning: "Scoring failed",
                  })}\n\n`
                )
              );
            }
          })
        );

        await Promise.all(promises);

        // Persist all scores to MongoDB
        await VibeScanner.updateOne(
          { _id: scanner._id },
          {
            $set: {
              contractScores: allScores.map((s) => ({
                contractId: s.contractId,
                score: s.score,
                reasoning: s.reasoning,
              })),
              lastScoredAt: new Date(),
            },
          }
        );

        // Also update the Contract documents with the latest scores for dashboard display
        const bulkOps = allScores
          .filter((s) => s.score > 0)
          .map((s) => ({
            updateOne: {
              filter: { _id: s.contractId },
              update: {
                $set: { vibeScore: s.score, vibeReasoning: s.reasoning },
              },
            },
          }));
        if (bulkOps.length > 0) {
          await Contract.bulkWrite(bulkOps);
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "complete", scored })}\n\n`
          )
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
  } catch (error) {
    console.error("Scoring API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start scoring",
      },
      { status: 500 }
    );
  }
}
