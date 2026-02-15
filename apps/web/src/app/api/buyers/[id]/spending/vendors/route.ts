import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import SpendTransaction from "@/models/spend-transaction";

const LARGE_VENDOR_SPEND_THRESHOLD = 500_000;
const LARGE_VENDOR_TXN_THRESHOLD = 50;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: buyerId } = await params;
    if (!isValidObjectId(buyerId)) {
      return NextResponse.json({ error: "Invalid buyer ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sizeFilter = searchParams.get("size") as "sme" | "large" | null;

    await dbConnect();

    const pipeline = [
      { $match: { buyerId: new Types.ObjectId(buyerId) } },
      {
        $group: {
          _id: "$vendorNormalized",
          vendor: { $first: "$vendor" },
          totalSpend: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          firstDate: { $min: "$date" },
          lastDate: { $max: "$date" },
          categories: { $addToSet: "$category" },
        },
      },
      { $sort: { totalSpend: -1 as const } },
    ];

    const allVendors = await SpendTransaction.aggregate(pipeline);

    const classified = allVendors.map(
      (v: {
        _id: string;
        vendor: string;
        totalSpend: number;
        transactionCount: number;
        firstDate: Date;
        lastDate: Date;
        categories: string[];
      }) => ({
        vendor: v.vendor,
        vendorNormalized: v._id,
        totalSpend: v.totalSpend,
        transactionCount: v.transactionCount,
        firstDate: v.firstDate ? new Date(v.firstDate).toISOString() : null,
        lastDate: v.lastDate ? new Date(v.lastDate).toISOString() : null,
        categories: v.categories.filter(Boolean).slice(0, 5),
        size:
          v.totalSpend > LARGE_VENDOR_SPEND_THRESHOLD ||
          v.transactionCount > LARGE_VENDOR_TXN_THRESHOLD
            ? ("large" as const)
            : ("sme" as const),
      })
    );

    const filtered = sizeFilter
      ? classified.filter((v) => v.size === sizeFilter)
      : classified;

    return NextResponse.json({
      vendors: filtered,
      total: filtered.length,
      smeCount: classified.filter((v) => v.size === "sme").length,
      largeCount: classified.filter((v) => v.size === "large").length,
    });
  } catch (error) {
    console.error("Vendors by size API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor data" },
      { status: 500 }
    );
  }
}
