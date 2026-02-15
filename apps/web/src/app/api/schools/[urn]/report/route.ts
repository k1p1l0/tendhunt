import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import OfstedSchool from "@/models/ofsted-school";
import { getReportText } from "@/lib/ofsted-report";

/**
 * GET /api/schools/[urn]/report
 *
 * Fetches the Ofsted report PDF for a school, extracts text, and returns it.
 * Results are cached in MongoDB to avoid redundant PDF downloads.
 *
 * Query params:
 *   - inspectionNumber (optional): fetch a specific historical report instead of the latest
 */
export async function GET(
  request: Request,
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

    const url = new URL(request.url);
    const inspectionNumber = url.searchParams.get("inspectionNumber");

    await dbConnect();

    const school = await OfstedSchool.findOne({ urn: urnNum })
      .select("urn name reportUrl inspectionHistory")
      .lean() as {
        urn: number;
        name: string;
        reportUrl?: string;
        inspectionHistory?: Array<{
          inspectionNumber: string;
          reportUrl?: string;
          inspectionDate: Date;
        }>;
      } | null;

    if (!school) {
      return Response.json({ error: "School not found" }, { status: 404 });
    }

    // Determine which report URL to use
    let targetUrl: string | undefined;

    if (inspectionNumber && school.inspectionHistory) {
      const entry = school.inspectionHistory.find(
        (e) => e.inspectionNumber === inspectionNumber
      );
      targetUrl = entry?.reportUrl;
    } else {
      targetUrl = school.reportUrl;
    }

    if (!targetUrl) {
      return Response.json(
        { error: "No report URL available for this school" },
        { status: 404 }
      );
    }

    const report = await getReportText(urnNum, targetUrl);

    if (!report) {
      return Response.json(
        { error: "Failed to fetch or extract report text" },
        { status: 502 }
      );
    }

    return Response.json({
      urn: urnNum,
      schoolName: school.name,
      reportUrl: report.reportUrl,
      charCount: report.charCount,
      fromCache: report.fromCache,
      text: report.text,
    });
  } catch (error) {
    console.error("Report API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch report",
      },
      { status: 500 }
    );
  }
}
