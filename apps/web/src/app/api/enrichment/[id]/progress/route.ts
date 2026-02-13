import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";

import type { NextRequest } from "next/server";

const ENRICHMENT_WORKER_URL =
  process.env.ENRICHMENT_WORKER_URL ?? "https://tendhunt-enrichment.kozak-74d.workers.dev";
const SPEND_INGEST_WORKER_URL =
  process.env.SPEND_INGEST_WORKER_URL ?? "https://tendhunt-spend-ingest.kozak-74d.workers.dev";

const ENRICHMENT_STAGES = [
  { name: "classify", label: "Classifying organisation" },
  { name: "website_discovery", label: "Finding website" },
  { name: "logo_linkedin", label: "Fetching LinkedIn & logo" },
  { name: "governance_urls", label: "Mapping governance portals" },
  { name: "moderngov", label: "Pulling board meeting data" },
  { name: "scrape", label: "Scraping governance pages" },
  { name: "personnel", label: "Extracting key personnel" },
  { name: "score", label: "Calculating enrichment score" },
];

const SPEND_STAGES = [
  { name: "spend_discover", label: "Discovering spending pages" },
  { name: "spend_extract", label: "Extracting download links" },
  { name: "spend_parse", label: "Parsing spend data" },
  { name: "spend_aggregate", label: "Building spend summary" },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: buyerId } = await params;
  await dbConnect();

  const buyer = await Buyer.findById(buyerId).select("name enrichmentScore").lean();
  if (!buyer) {
    return new Response("Buyer not found", { status: 404 });
  }

  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: Record<string, unknown>) {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cancelled = true;
        }
      }

      // Send initial state with all stages
      send({
        type: "init",
        buyerId,
        buyerName: buyer.name,
        stages: [...ENRICHMENT_STAGES, ...SPEND_STAGES].map((s) => ({
          ...s,
          status: "pending",
        })),
      });

      // Simulate stage progress while enrichment worker runs
      // The worker processes all stages sequentially — we estimate timing
      const stageTimings = [1, 5, 5, 1, 10, 5, 15, 1, 8, 5, 10, 3]; // seconds per stage (rough)
      const allStages = [...ENRICHMENT_STAGES, ...SPEND_STAGES];

      // Fire enrichment worker (non-blocking)
      const enrichmentPromise = fetch(
        `${ENRICHMENT_WORKER_URL}/run-buyer?id=${encodeURIComponent(buyerId)}`
      ).then((r) => r.json()).catch(() => null);

      // Progressive stage updates based on estimated timing
      let currentStage = 0;
      for (const stage of allStages) {
        if (cancelled) break;
        if (currentStage >= ENRICHMENT_STAGES.length && currentStage === ENRICHMENT_STAGES.length) {
          // Wait for enrichment to finish before starting spend stages
          await enrichmentPromise;
          if (cancelled) break;

          // Fire spend-ingest worker
          fetch(
            `${SPEND_INGEST_WORKER_URL}/run-buyer?id=${encodeURIComponent(buyerId)}`
          ).catch(() => null);
        }

        send({ type: "stage_active", stage: stage.name, label: stage.label });

        // Wait estimated time for this stage
        const waitMs = (stageTimings[currentStage] ?? 3) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        if (cancelled) break;

        send({ type: "stage_complete", stage: stage.name, label: stage.label });
        currentStage++;
      }

      if (!cancelled) {
        // Fetch updated buyer data
        const updatedBuyer = await Buyer.findById(buyerId)
          .select("name enrichmentScore lastEnrichedAt orgType website logoUrl linkedinUrl staffCount")
          .lean();

        send({
          type: "done",
          buyerId,
          buyerName: buyer.name,
          enrichmentScore: updatedBuyer?.enrichmentScore ?? 0,
          summary: {
            orgType: updatedBuyer?.orgType,
            website: updatedBuyer?.website,
            hasLogo: !!updatedBuyer?.logoUrl,
            hasLinkedIn: !!updatedBuyer?.linkedinUrl,
            staffCount: updatedBuyer?.staffCount,
          },
        });

        controller.close();
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
}
