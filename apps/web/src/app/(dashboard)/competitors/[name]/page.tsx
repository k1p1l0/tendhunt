import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCompetitorProfile } from "@/lib/competitors";
import { CompetitorProfileBreadcrumb } from "./breadcrumb";
import { ProfileHeader } from "@/components/competitors/profile-header";
import { ProfileTabs } from "@/components/competitors/profile-tabs";

export default async function CompetitorProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { name } = await params;
  const supplierName = decodeURIComponent(name);
  const profile = await getCompetitorProfile(supplierName);

  if (!profile) {
    return (
      <div className="space-y-4">
        <CompetitorProfileBreadcrumb name={supplierName} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">
            No contract data found for &ldquo;{supplierName}&rdquo;
          </p>
          <Link
            href="/competitors"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const sectorNames = profile.sectors.map((s) => s.name);

  return (
    <div className="space-y-6 p-6">
      <CompetitorProfileBreadcrumb name={profile.name} />
      <ProfileHeader name={profile.name} sectors={sectorNames} />
      <ProfileTabs profile={profile} supplierName={supplierName} />
    </div>
  );
}
