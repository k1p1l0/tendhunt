import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { dbConnect } from "@/lib/mongodb";
import OfstedSchool from "@/models/ofsted-school";
import Buyer from "@/models/buyer";
import { SchoolDetailClient } from "@/components/schools/school-detail-client";
import { SchoolBreadcrumb } from "./breadcrumb";
import { ArrowLeft } from "lucide-react";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ urn: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { urn } = await params;
  const urnNum = parseInt(urn, 10);
  if (isNaN(urnNum)) notFound();

  await dbConnect();

  const school = await OfstedSchool.findOne({ urn: urnNum }).lean();
  if (!school) notFound();

  // If the school has a buyerId, fetch the buyer name for the header link
  let buyerName: string | null = null;
  if (school.buyerId) {
    const buyer = await Buyer.findById(school.buyerId).select("name").lean();
    buyerName = buyer?.name ?? null;
  }

  const schoolName = school.name ?? "";

  // Serialize inspection history for the client
  const inspectionHistory = (school.inspectionHistory ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => ({
      inspectionNumber: entry.inspectionNumber ?? "",
      inspectionDate: entry.inspectionDate
        ? new Date(entry.inspectionDate).toISOString()
        : "",
      publicationDate: entry.publicationDate
        ? new Date(entry.publicationDate).toISOString()
        : null,
      inspectionType: entry.inspectionType ?? undefined,
      inspectionTypeGrouping: entry.inspectionTypeGrouping ?? undefined,
      reportUrl: entry.reportUrl ?? null,
      overallEffectiveness: entry.overallEffectiveness ?? null,
      qualityOfEducation: entry.qualityOfEducation ?? null,
      behaviourAndAttitudes: entry.behaviourAndAttitudes ?? null,
      personalDevelopment: entry.personalDevelopment ?? null,
      leadershipAndManagement: entry.leadershipAndManagement ?? null,
      safeguarding: entry.safeguarding ?? undefined,
      earlyYears: entry.earlyYears ?? null,
      sixthForm: entry.sixthForm ?? null,
      categoryOfConcern: entry.categoryOfConcern ?? undefined,
      era: entry.era ?? undefined,
    })
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <SchoolBreadcrumb name={schoolName} />

      {/* Sticky Header */}
      <div className="px-8 py-3 border-b border-border flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/scanners"
            className="p-2 -ml-2 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to scanners"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold truncate max-w-2xl">
            {schoolName}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          URN: {school.urn}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <SchoolDetailClient
            school={{
              name: schoolName,
              urn: school.urn,
              phase: school.phase ?? undefined,
              schoolType: school.schoolType ?? undefined,
              localAuthority: school.localAuthority ?? undefined,
              region: school.region ?? undefined,
              postcode: school.postcode ?? undefined,
              matName: school.matName ?? undefined,
              overallEffectiveness: school.overallEffectiveness ?? null,
              qualityOfEducation: school.qualityOfEducation ?? null,
              behaviourAndAttitudes: school.behaviourAndAttitudes ?? null,
              personalDevelopment: school.personalDevelopment ?? null,
              leadershipAndManagement: school.leadershipAndManagement ?? null,
              safeguarding: school.safeguarding ?? undefined,
              inspectionDate: school.inspectionDate
                ? new Date(school.inspectionDate).toISOString()
                : null,
              totalPupils: school.totalPupils ?? null,
              idaciQuintile: school.idaciQuintile ?? null,
              reportUrl: school.reportUrl ?? null,
              ratingDirection: school.ratingDirection ?? null,
              buyerId: school.buyerId ? String(school.buyerId) : null,
              buyerName,
            }}
            inspectionHistory={inspectionHistory}
          />
        </div>
      </div>
    </div>
  );
}
