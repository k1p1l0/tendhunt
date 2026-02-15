"use client";

import { SchoolHeader } from "@/components/schools/school-header";
import { InspectionTimeline } from "@/components/schools/inspection-timeline";

import type { InspectionEntryData } from "@/components/schools/inspection-timeline";
import type { RatingDirection } from "@/lib/ofsted-downgrade";

interface SchoolData {
  name: string;
  urn: number;
  phase?: string;
  schoolType?: string;
  localAuthority?: string;
  region?: string;
  postcode?: string;
  matName?: string;
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
  safeguarding?: string;
  inspectionDate?: string | null;
  totalPupils?: number | null;
  idaciQuintile?: number | null;
  reportUrl?: string | null;
  ratingDirection?: RatingDirection | null;
  buyerId?: string | null;
  buyerName?: string | null;
}

interface SchoolDetailClientProps {
  school: SchoolData;
  inspectionHistory: InspectionEntryData[];
}

export function SchoolDetailClient({
  school,
  inspectionHistory,
}: SchoolDetailClientProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SchoolHeader school={school} />
      <InspectionTimeline inspections={inspectionHistory} />
    </div>
  );
}
