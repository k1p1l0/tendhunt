import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, PoundSterling, CalendarDays } from "lucide-react";
import { dbConnect } from "@/lib/mongodb";
import Contract from "@/models/contract";
import { buildSupplierSearchPattern, normalizeSupplierName } from "@/lib/supplier-normalize";
import { CompetitorProfileBreadcrumb } from "./breadcrumb";

interface ProfileStats {
  name: string;
  contractCount: number;
  totalValue: number;
  buyerCount: number;
  latestAwardDate: string | null;
  sectors: string[];
  regions: string[];
}

async function getBasicProfile(supplierName: string): Promise<ProfileStats | null> {
  await dbConnect();

  const pattern = buildSupplierSearchPattern(supplierName);

  const pipeline = [
    {
      $match: {
        "awardedSuppliers.name": { $regex: pattern },
      },
    },
    { $unwind: "$awardedSuppliers" },
    {
      $match: {
        "awardedSuppliers.name": { $regex: pattern },
      },
    },
    {
      $group: {
        _id: null,
        names: { $addToSet: "$awardedSuppliers.name" },
        contractCount: { $sum: 1 },
        totalValue: {
          $sum: { $ifNull: ["$awardValue", { $ifNull: ["$valueMax", 0] }] },
        },
        buyers: { $addToSet: "$buyerName" },
        latestAwardDate: { $max: "$awardDate" },
        sectors: { $addToSet: "$sector" },
        regions: { $addToSet: "$buyerRegion" },
      },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await Contract.aggregate(pipeline as any);

  if (results.length === 0) return null;

  const r = results[0];

  // Pick the best display name from the grouped variants
  const names = (r.names as string[]).sort((a: string, b: string) => b.length - a.length);
  const displayName = names[0] || supplierName;

  return {
    name: displayName,
    contractCount: r.contractCount,
    totalValue: r.totalValue,
    buyerCount: r.buyers.length,
    latestAwardDate: r.latestAwardDate
      ? new Date(r.latestAwardDate).toISOString()
      : null,
    sectors: (r.sectors as (string | null)[]).filter((s): s is string => s != null),
    regions: (r.regions as (string | null)[]).filter((s): s is string => s != null),
  };
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompetitorProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { name } = await params;
  const supplierName = decodeURIComponent(name);
  const profile = await getBasicProfile(supplierName);

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

  return (
    <div className="space-y-6">
      <CompetitorProfileBreadcrumb name={profile.name} />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/competitors"
          className="mt-1 shrink-0 h-8 w-8 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Back to search"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{profile.name}</h1>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {profile.sectors.slice(0, 4).map((sector) => (
              <span
                key={sector}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {sector}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Contracts"
          value={profile.contractCount.toLocaleString()}
        />
        <StatCard
          icon={PoundSterling}
          label="Total Value"
          value={`\u00A3${formatValue(profile.totalValue)}`}
        />
        <StatCard
          icon={Building2}
          label="Buyers"
          value={profile.buyerCount.toLocaleString()}
        />
        <StatCard
          icon={CalendarDays}
          label="Latest Award"
          value={
            profile.latestAwardDate
              ? formatDate(profile.latestAwardDate)
              : "N/A"
          }
        />
      </div>

      {/* Placeholder for Phase 2 tabs */}
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-sm">
          Detailed contract history, buyer relationships, and spend data will be
          available in the next update.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
