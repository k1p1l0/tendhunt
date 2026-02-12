import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchContractById } from "@/lib/contracts";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";
import { resolveRegionName } from "@/lib/nuts-regions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrichmentBadge } from "@/components/buyers/enrichment-badge";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Tag,
  Coins,
  Users,
  Globe,
  Linkedin,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
});

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMin != null && valueMax != null && valueMin !== valueMax) {
    return `${currencyFormatter.format(valueMin)} - ${currencyFormatter.format(valueMax)}`;
  }
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return null;
}

function statusColor(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    case "AWARDED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

function scoreColor(score: number) {
  if (score >= 7)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 4)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function sourceLabel(source: string) {
  return source === "FIND_A_TENDER" ? "Find a Tender" : "Contracts Finder";
}

function orgTypeLabel(orgType: string): string {
  const labels: Record<string, string> = {
    local_council_london: "London Borough",
    local_council_metro: "Metropolitan Borough",
    local_council_district: "District Council",
    local_council_county: "County Council",
    local_council_unitary: "Unitary Authority",
    nhs_trust_acute: "NHS Trust (Acute)",
    nhs_trust_mental_health: "NHS Trust (Mental Health)",
    nhs_trust_community: "NHS Trust (Community)",
    nhs_trust_ambulance: "NHS Trust (Ambulance)",
    nhs_icb: "NHS ICB",
    police_pcc: "Police / PCC",
    fire_rescue: "Fire & Rescue",
    university: "University",
    fe_college: "FE College",
    mat: "Multi-Academy Trust",
    combined_authority: "Combined Authority",
    national_park: "National Park",
    alb: "Arms-Length Body",
  };
  return labels[orgType] ?? orgType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await fetchContractById(id);

  if (!contract) {
    notFound();
  }

  const value = formatValue(contract.valueMin, contract.valueMax);
  const published = formatDate(contract.publishedDate);
  const deadline = formatDate(contract.deadlineDate);

  return (
    <div className="space-y-6">
      <AgentContextSetter
        context={{
          page: "contract_detail",
          contractId: String(contract._id),
          contractTitle: contract.title,
          contractBuyerName: contract.buyerName,
          contractSector: contract.sector ?? undefined,
          contractValue: contract.valueMax
            ? `GBP ${contract.valueMax.toLocaleString()}`
            : undefined,
        }}
      />
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contracts
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold flex-1">{contract.title}</h1>
          <Badge className={statusColor(contract.status)}>
            {contract.status}
          </Badge>
        </div>

        {contract.vibeScore != null && (
          <div className="flex items-center gap-3">
            <Badge className={`text-lg px-3 py-1 ${scoreColor(contract.vibeScore)}`}>
              {contract.vibeScore.toFixed(1)}
            </Badge>
            {contract.vibeReasoning && (
              <p className="text-sm text-muted-foreground">
                {contract.vibeReasoning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Buyer Intelligence Card */}
      {contract.buyer && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Logo / Initials */}
              {contract.buyer.logoUrl ? (
                <img
                  src={contract.buyer.logoUrl}
                  alt={`${contract.buyer.name} logo`}
                  className="h-12 w-12 rounded-xl object-contain shrink-0 bg-muted"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/buyers/${String(contract.buyer._id)}`}
                      className="text-lg font-bold hover:underline"
                    >
                      {contract.buyer.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {contract.buyer.orgType && (
                        <Badge variant="outline">{orgTypeLabel(contract.buyer.orgType)}</Badge>
                      )}
                      {contract.buyerRegion && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {resolveRegionName(contract.buyerRegion)}
                        </span>
                      )}
                      {contract.buyer.contractCount != null && contract.buyer.contractCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {contract.buyer.contractCount} contracts
                        </span>
                      )}
                    </div>
                  </div>
                  {contract.buyer.enrichmentScore != null && contract.buyer.enrichmentScore > 0 && (
                    <EnrichmentBadge score={contract.buyer.enrichmentScore} size="md" />
                  )}
                </div>

                {/* Links row */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                  {contract.buyer.website && (
                    <a
                      href={contract.buyer.website.startsWith("http") ? contract.buyer.website : `https://${contract.buyer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {getDomain(contract.buyer.website)}
                    </a>
                  )}
                  {contract.buyer.linkedinUrl && (
                    <a
                      href={contract.buyer.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  <Link
                    href={`/buyers/${String(contract.buyer._id)}`}
                    className="ml-auto text-primary hover:underline font-medium"
                  >
                    View full profile
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Buyer</p>
                {contract.buyer ? (
                  <Link
                    href={`/buyers/${String(contract.buyer._id)}`}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {contract.buyerName}
                  </Link>
                ) : (
                  <p className="text-sm font-bold">{contract.buyerName}</p>
                )}
                {contract.buyerOrg &&
                  contract.buyerOrg !== contract.buyerName && (
                    <p className="text-sm text-muted-foreground">
                      {contract.buyerOrg}
                    </p>
                  )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Region</p>
                <p className="text-sm">
                  {resolveRegionName(contract.buyerRegion)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Sector</p>
                <p className="text-sm">
                  {contract.sector || "Not classified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Stage</p>
                <Badge variant="outline">{contract.stage}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-sm">{published || "Unknown"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Deadline</p>
                <p className="text-sm">{deadline || "No deadline"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column: Value & Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Value & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Coins className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Value</p>
                <p className="text-sm font-bold">
                  {value || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Coins className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Currency</p>
                <p className="text-sm">{contract.currency || "GBP"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">CPV Codes</p>
              {contract.cpvCodes && contract.cpvCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {contract.cpvCodes.map((code: string) => (
                    <Badge key={code} variant="outline">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="text-sm">{sourceLabel(contract.source)}</p>
                {contract.sourceUrl && (
                  <a
                    href={contract.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View original listing
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {contract.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{contract.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Source link button */}
      {contract.sourceUrl && (
        <div>
          <Button variant="outline" asChild>
            <a
              href={contract.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on {sourceLabel(contract.source)}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
