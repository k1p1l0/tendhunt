import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import SpendSummary from "@/models/spend-summary";
import CompanyProfile from "@/models/company-profile";
import Contract from "@/models/contract";
import {
  computeSpendOpportunities,
  computeSpendMetrics,
} from "@/lib/spend-analytics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: buyerId } = await params;

    if (!mongoose.isValidObjectId(buyerId)) {
      return Response.json({ error: "Invalid buyer ID" }, { status: 400 });
    }

    await dbConnect();

    const [summary, userProfile, contractSectors] = await Promise.all([
      SpendSummary.findOne({ buyerId }).lean(),
      CompanyProfile.findOne({ userId }).lean(),
      Contract.distinct("sector", {
        buyerId: new mongoose.Types.ObjectId(buyerId),
        sector: { $ne: null },
      }) as Promise<string[]>,
    ]);

    if (!summary) {
      return Response.json({ hasSpendData: false });
    }

    const metrics = computeSpendMetrics(summary);
    const opportunities = computeSpendOpportunities(summary, userProfile, contractSectors);

    // Serialize the summary — convert ObjectIds to strings and Dates to ISO
    const serialized = {
      ...summary,
      _id: String(summary._id),
      buyerId: String(summary.buyerId),
      dateRange: summary.dateRange
        ? {
            earliest: summary.dateRange.earliest
              ? new Date(summary.dateRange.earliest).toISOString()
              : null,
            latest: summary.dateRange.latest
              ? new Date(summary.dateRange.latest).toISOString()
              : null,
          }
        : null,
      lastComputedAt: summary.lastComputedAt
        ? new Date(summary.lastComputedAt).toISOString()
        : null,
      createdAt: summary.createdAt
        ? new Date(summary.createdAt).toISOString()
        : null,
      updatedAt: summary.updatedAt
        ? new Date(summary.updatedAt).toISOString()
        : null,
    };

    return Response.json({
      hasSpendData: true,
      summary: serialized,
      metrics,
      opportunities,
    });
  } catch (error) {
    console.error("Spending API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch spending data",
      },
      { status: 500 }
    );
  }
}
