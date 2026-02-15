import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Watchlist from "@/models/watchlist";
import { normalizeSupplierName } from "@/lib/supplier-normalize";
import { getCompetitorProfile } from "@/lib/competitors";
import { getUserWatchlist } from "@/lib/watchlist";

/**
 * GET /api/watchlist — list all watched competitors for the current user
 * Optional: ?check=<supplierName> — returns { watched: boolean } for a specific supplier
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const check = searchParams.get("check");

    if (check) {
      const normalized = normalizeSupplierName(check);
      const entry = await Watchlist.findOne({
        userId,
        normalizedName: normalized,
      }).lean();
      return Response.json({
        watched: !!entry,
        notifyEmail: entry ? (entry as Record<string, unknown>).notifyEmail : false,
      });
    }

    const entries = await getUserWatchlist(userId);

    return Response.json({ entries });
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist — add a competitor to the watchlist
 * Body: { supplierName: string, notifyEmail?: boolean }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { supplierName, notifyEmail = false } = body;

    if (!supplierName || typeof supplierName !== "string") {
      return Response.json(
        { error: "supplierName is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSupplierName(supplierName);

    // Check if already watching
    const existing = await Watchlist.findOne({
      userId,
      normalizedName,
    });

    if (existing) {
      return Response.json(
        { error: "Already watching this competitor" },
        { status: 409 }
      );
    }

    // Capture initial snapshot of supplier's sectors/regions for change detection
    const profile = await getCompetitorProfile(supplierName);
    const snapshot = profile
      ? {
          sectors: profile.sectors.map((s) => s.name),
          regions: profile.regions.map((r) => r.name),
          contractCount: profile.contractCount,
          totalValue: profile.totalValue,
          snapshotAt: new Date(),
        }
      : {
          sectors: [],
          regions: [],
          contractCount: 0,
          totalValue: 0,
          snapshotAt: new Date(),
        };

    const entry = await Watchlist.create({
      userId,
      supplierName,
      normalizedName,
      notifyEmail,
      lastSnapshot: snapshot,
    });

    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/watchlist — remove a competitor from the watchlist
 * Body: { supplierName: string }
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { supplierName } = body;

    if (!supplierName || typeof supplierName !== "string") {
      return Response.json(
        { error: "supplierName is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSupplierName(supplierName);

    const result = await Watchlist.deleteOne({
      userId,
      normalizedName,
    });

    if (result.deletedCount === 0) {
      return Response.json(
        { error: "Not found in watchlist" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/watchlist — update watchlist settings (e.g., notifyEmail toggle)
 * Body: { supplierName: string, notifyEmail?: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { supplierName, notifyEmail } = body;

    if (!supplierName || typeof supplierName !== "string") {
      return Response.json(
        { error: "supplierName is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSupplierName(supplierName);

    const updates: Record<string, unknown> = {};
    if (typeof notifyEmail === "boolean") {
      updates.notifyEmail = notifyEmail;
    }

    const entry = await Watchlist.findOneAndUpdate(
      { userId, normalizedName },
      { $set: updates },
      { new: true }
    );

    if (!entry) {
      return Response.json(
        { error: "Not found in watchlist" },
        { status: 404 }
      );
    }

    return Response.json({ entry });
  } catch (error) {
    console.error("Watchlist PATCH error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update watchlist" },
      { status: 500 }
    );
  }
}
