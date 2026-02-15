import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import OfstedSchool from "@/models/ofsted-school";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ urn: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { urn } = await params;
    const urnNum = parseInt(urn, 10);
    if (isNaN(urnNum)) {
      return Response.json({ error: "Invalid URN" }, { status: 400 });
    }

    await dbConnect();

    const school = await OfstedSchool.findOne({ urn: urnNum }).lean();

    if (!school) {
      return Response.json({ error: "School not found" }, { status: 404 });
    }

    return Response.json({ school });
  } catch (error) {
    console.error("School detail API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch school",
      },
      { status: 500 }
    );
  }
}
