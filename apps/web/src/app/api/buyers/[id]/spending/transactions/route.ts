import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import SpendTransaction from "@/models/spend-transaction";

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

    await dbConnect();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "50", 10),
      100
    );
    const category = searchParams.get("category");
    const vendor = searchParams.get("vendor");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const amountMin = searchParams.get("amountMin");
    const amountMax = searchParams.get("amountMax");
    const sort = searchParams.get("sort") ?? "date";
    const order = searchParams.get("order") ?? "desc";

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { buyerId };

    if (category) {
      query.category = category;
    }
    if (vendor) {
      query.vendor = { $regex: vendor, $options: "i" };
    }
    if (dateFrom) {
      query.date = { ...query.date, $gte: new Date(dateFrom) };
    }
    if (dateTo) {
      query.date = { ...query.date, $lte: new Date(dateTo) };
    }
    if (amountMin) {
      query.amount = { ...query.amount, $gte: parseFloat(amountMin) };
    }
    if (amountMax) {
      query.amount = { ...query.amount, $lte: parseFloat(amountMax) };
    }

    // Parallel queries
    const skip = (page - 1) * pageSize;
    const sortField = sort === "date" ? "date" : "amount";
    const sortOrder = order === "asc" ? 1 : -1;

    const [transactions, total] = await Promise.all([
      SpendTransaction.find(query)
        .sort([[sortField, sortOrder]])
        .skip(skip)
        .limit(pageSize)
        .lean(),
      SpendTransaction.countDocuments(query),
    ]);

    // Serialize dates and ObjectIds
    const serialized = transactions.map((t) => ({
      _id: String(t._id),
      buyerId: String(t.buyerId),
      date: t.date ? new Date(t.date).toISOString() : null,
      amount: t.amount,
      vendor: t.vendor,
      category: t.category,
      subcategory: t.subcategory ?? null,
      department: t.department ?? null,
      reference: t.reference ?? null,
      sourceFile: t.sourceFile ?? null,
    }));

    return NextResponse.json({
      transactions: serialized,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[Transactions API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
