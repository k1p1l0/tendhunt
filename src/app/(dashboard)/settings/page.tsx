import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await dbConnect();
  const profile = await CompanyProfile.findOne({ userId }).lean();

  // Serialize Mongoose document to plain object for client component
  const initialProfile = profile
    ? {
        companyName: profile.companyName ?? "",
        website: profile.website ?? "",
        address: profile.address ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        summary: profile.summary ?? "",
        sectors: (profile.sectors as string[]) ?? [],
        capabilities: (profile.capabilities as string[]) ?? [],
        keywords: (profile.keywords as string[]) ?? [],
        certifications: (profile.certifications as string[]) ?? [],
        idealContractDescription: profile.idealContractDescription ?? "",
        companySize: profile.companySize ?? "",
        regions: (profile.regions as string[]) ?? [],
        logoUrl: profile.logoUrl ?? "",
        documentKeys: (profile.documentKeys as string[]) ?? [],
        lastEditedAt: profile.lastEditedAt
          ? new Date(profile.lastEditedAt).toISOString()
          : null,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SettingsForm initialProfile={initialProfile} />
    </div>
  );
}
