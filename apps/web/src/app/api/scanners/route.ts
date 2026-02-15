import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Scanner, { type ScannerType } from "@/models/scanner";
import mongoose from "mongoose";

const DEFAULT_AI_COLUMNS: Record<
  ScannerType,
  Array<{ columnId: string; name: string; prompt: string }>
> = {
  rfps: [
    {
      columnId: "vibe-score",
      name: "Vibe Score",
      prompt:
        "Score how relevant this contract is to the company profile on a scale of 1-10. Consider sector alignment, capability match, geographic relevance, and contract value appropriateness.",
    },
    {
      columnId: "bid-recommendation",
      name: "Bid Recommendation",
      prompt:
        "Based on the company profile, provide a brief bid/no-bid recommendation for this contract. Consider competitive positioning, resource requirements, and strategic fit.",
    },
  ],
  meetings: [
    {
      columnId: "relevance-score",
      name: "Relevance Score",
      prompt:
        "Score how relevant this board meeting signal is to the company profile on a scale of 1-10. Consider whether the discussed topics align with company capabilities and offerings.",
    },
    {
      columnId: "buying-intent",
      name: "Buying Intent",
      prompt:
        "Assess the buying intent signal from this board meeting. Is the organization likely to procure services related to the company's capabilities? Provide a brief assessment.",
    },
  ],
  buyers: [
    {
      columnId: "account-score",
      name: "Account Score",
      prompt:
        "Score this buyer organization as a potential account on a scale of 1-10. Consider sector alignment, procurement history, geographic overlap, and strategic value.",
    },
    {
      columnId: "key-contact",
      name: "Key Contact",
      prompt:
        "Based on the organization's structure and procurement activities, identify the most likely key contact role for engagement (e.g., Procurement Manager, IT Director, etc.).",
    },
  ],
  schools: [
    {
      columnId: "tuition-relevance",
      name: "Tuition Relevance",
      prompt:
        "Score how likely this school needs tuition services on a scale of 1-10. Analyze the Ofsted report PDF content (provided below the school metadata) for specific evidence of:\n\n" +
        "- **Literacy & reading gaps**: mentions of below-expected reading levels, phonics weaknesses, poor vocabulary development\n" +
        "- **Numeracy & maths gaps**: below-expected maths attainment, gaps in number fluency\n" +
        "- **Catch-up / recovery needs**: references to COVID recovery, catch-up funding, pupils falling behind\n" +
        "- **Pupil premium concerns**: disadvantaged pupil underperformance, pupil premium strategy weaknesses\n" +
        "- **Attainment gaps**: gap between disadvantaged and non-disadvantaged pupils, SEND support needs\n" +
        "- **Quality of Education issues**: curriculum gaps, inconsistent teaching quality, poor progress rates\n\n" +
        "Higher scores (7-10) = strong evidence of tuition need from report content. " +
        "Medium scores (4-6) = some indicators but not definitive. " +
        "Low scores (1-3) = school performing well, limited tuition need.\n\n" +
        "In your reasoning, cite specific phrases or themes from the report that indicate tuition need. " +
        "If no report text is available, score based on Ofsted ratings and metadata only.",
    },
    {
      columnId: "outreach-priority",
      name: "Outreach Priority",
      prompt:
        "Based on this school's Ofsted data and report content (if available), recommend outreach priority (High/Medium/Low). Consider: recency of downgrade, severity of rating drop, school size, region, and any specific themes from the report suggesting urgency (e.g. 'requires improvement in reading', 'pupils not making expected progress'). Explain in 1-2 sentences.",
    },
  ],
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const scanners = await Scanner.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    // Compute summary stats for list view (avoid sending full scores array)
    const rows = scanners.map((s) => {
      const scores = s.scores ?? [];
      const uniqueEntities = new Set(
        scores.map((sc: { entityId: unknown }) => String(sc.entityId))
      );
      return {
        _id: s._id,
        name: s.name,
        type: s.type,
        description: s.description,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        lastScoredAt: s.lastScoredAt,
        aiColumns: (s.aiColumns ?? []).map(
          (c: { columnId: string; name: string }) => ({
            columnId: c.columnId,
            name: c.name,
          })
        ),
        totalEntries: uniqueEntities.size,
        creditsUsed: scores.length,
      };
    });

    return Response.json({ scanners: rows });
  } catch (error) {
    console.error("Scanner list error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve scanners",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      type?: ScannerType;
      searchQuery?: string;
      filters?: Record<string, unknown>;
    };

    if (!body.type || !["rfps", "meetings", "buyers", "schools"].includes(body.type)) {
      return Response.json(
        { error: "Valid scanner type is required (rfps, meetings, buyers, schools)" },
        { status: 400 }
      );
    }

    if (!body.name || body.name.trim().length === 0) {
      return Response.json(
        { error: "Scanner name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const scanner = await Scanner.create({
      userId,
      name: body.name.trim(),
      description: body.description?.trim() || "",
      type: body.type,
      searchQuery: body.searchQuery?.trim() || "",
      filters: body.filters || {},
      aiColumns: DEFAULT_AI_COLUMNS[body.type],
      scores: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (scanner as any).toObject ? (scanner as any).toObject() : scanner;

    return Response.json({ scanner: doc }, { status: 201 });
  } catch (error) {
    console.error("Scanner creation error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create scanner",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.isValidObjectId(id)) {
      return Response.json(
        { error: "Valid scanner id is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await Scanner.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return Response.json(
        { error: "Scanner not found or access denied" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Scanner delete error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete scanner",
      },
      { status: 500 }
    );
  }
}
