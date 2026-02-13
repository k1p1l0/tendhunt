import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({});
  }

  const buyerIds = ids.split(",").slice(0, 20);

  await dbConnect();
  const buyers = await Buyer.find({ _id: { $in: buyerIds } })
    .select("_id logoUrl")
    .lean();

  const result: Record<string, string | null> = {};
  for (const b of buyers) {
    result[String(b._id)] = b.logoUrl ?? null;
  }

  return NextResponse.json(result);
}
