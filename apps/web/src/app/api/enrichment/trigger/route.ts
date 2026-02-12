import { auth } from "@clerk/nextjs/server";

const ENRICHMENT_WORKER_URL =
  process.env.ENRICHMENT_WORKER_URL ?? "https://tendhunt-enrichment.kozak-74d.workers.dev";
const SPEND_INGEST_WORKER_URL =
  process.env.SPEND_INGEST_WORKER_URL ?? "https://tendhunt-spend-ingest.kozak-74d.workers.dev";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { buyerId, pipeline } = body as {
      buyerId: string;
      pipeline: "enrichment" | "spend" | "both";
    };

    if (!buyerId || !pipeline) {
      return Response.json(
        { error: "Missing buyerId or pipeline field" },
        { status: 400 }
      );
    }

    const results: Record<string, unknown> = {};

    if (pipeline === "enrichment" || pipeline === "both") {
      const res = await fetch(
        `${ENRICHMENT_WORKER_URL}/run-buyer?id=${encodeURIComponent(buyerId)}`
      );
      results.enrichment = await res.json();
    }

    if (pipeline === "spend" || pipeline === "both") {
      const res = await fetch(
        `${SPEND_INGEST_WORKER_URL}/run-buyer?id=${encodeURIComponent(buyerId)}`
      );
      results.spend = await res.json();
    }

    return Response.json(results);
  } catch (error) {
    console.error("Enrichment trigger API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to trigger enrichment",
      },
      { status: 500 }
    );
  }
}
