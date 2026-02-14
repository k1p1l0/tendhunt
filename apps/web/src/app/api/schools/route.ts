import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import OfstedSchool from "@/models/ofsted-school";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q") ?? undefined;
    const ofstedRating = searchParams.get("ofstedRating") ?? undefined;
    const region = searchParams.get("region") ?? undefined;
    const schoolPhase = searchParams.get("schoolPhase") ?? undefined;
    const localAuthority = searchParams.get("localAuthority") ?? undefined;
    const downgradeWithin = searchParams.get("downgradeWithin") ?? undefined;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : 1;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!, 10)
      : 100;

    await dbConnect();

    const filter: Record<string, unknown> = {};

    // Text search by school name
    if (query) {
      filter.name = { $regex: query, $options: "i" };
    }

    // Ofsted rating filter (1=Outstanding, 2=Good, 3=Requires Improvement, 4=Inadequate)
    if (ofstedRating) {
      const ratingNum = parseInt(ofstedRating, 10);
      if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 4) {
        filter.overallEffectiveness = ratingNum;
      }
    }

    // Region filter
    if (region) {
      filter.region = region;
    }

    // School phase filter (e.g. "Primary", "Secondary", etc.)
    if (schoolPhase) {
      filter.phase = schoolPhase;
    }

    // Local authority filter
    if (localAuthority) {
      filter.localAuthority = localAuthority;
    }

    // Downgrade recency filter
    if (downgradeWithin) {
      const now = new Date();
      let cutoffDate: Date | null = null;

      switch (downgradeWithin) {
        case "1m":
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case "3m":
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case "6m":
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case "1y":
          cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case "any":
          filter.lastDowngradeDate = { $exists: true, $ne: null };
          break;
      }

      if (cutoffDate) {
        filter.lastDowngradeDate = { $gte: cutoffDate };
      }
    }

    const skip = (page - 1) * pageSize;

    const [schools, filteredCount, totalCount] = await Promise.all([
      OfstedSchool.find(filter)
        .select(
          "name urn phase schoolType localAuthority region postcode " +
          "overallEffectiveness qualityOfEducation behaviourAndAttitudes " +
          "personalDevelopment leadershipAndManagement safeguarding " +
          "inspectionDate previousOverallEffectiveness previousInspectionDate " +
          "ratingDirection lastDowngradeDate downgradeType totalPupils " +
          "matName reportUrl"
        )
        .sort({ lastDowngradeDate: -1, inspectionDate: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      OfstedSchool.countDocuments(filter),
      OfstedSchool.estimatedDocumentCount(),
    ]);

    return Response.json({ schools, filteredCount, totalCount });
  } catch (error) {
    console.error("Schools API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch schools",
      },
      { status: 500 }
    );
  }
}
