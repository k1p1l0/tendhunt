import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  FileText,
  ExternalLink,
  Users,
  PoundSterling,
  Landmark,
} from "lucide-react";
import { EnrichmentBadge } from "@/components/buyers/enrichment-badge";

interface BuyerHeaderProps {
  buyer: {
    name: string;
    sector?: string;
    region?: string;
    contractCount: number;
    website?: string;
    enrichmentScore?: number;
    orgType?: string;
    staffCount?: number;
    annualBudget?: number;
    democracyPortalUrl?: string;
  };
}

function orgTypeLabel(orgType: string): string {
  const labels: Record<string, string> = {
    local_council_london: "London Borough",
    local_council_metro: "Metropolitan Borough",
    local_council_metropolitan: "Metropolitan Borough",
    local_council_district: "District Council",
    local_council_county: "County Council",
    local_council_unitary: "Unitary Authority",
    local_council_sui_generis: "Sui Generis",
    local_council_other: "Council",
    nhs_trust_acute: "NHS Trust (Acute)",
    nhs_trust_mental_health: "NHS Trust (Mental Health)",
    nhs_trust_community: "NHS Trust (Community)",
    nhs_trust_ambulance: "NHS Trust (Ambulance)",
    nhs_icb: "NHS ICB",
    nhs_other: "NHS Body",
    police_pcc: "Police / PCC",
    police_force: "Police Force",
    fire_rescue: "Fire & Rescue",
    fire_service: "Fire & Rescue",
    university: "University",
    fe_college: "FE College",
    further_education: "FE College",
    mat: "Multi-Academy Trust",
    multi_academy_trust: "Multi-Academy Trust",
    central_government: "Central Government",
    devolved_government: "Devolved Government",
    housing_association: "Housing Association",
    combined_authority: "Combined Authority",
    national_park: "National Park",
    alb: "Arms-Length Body",
    private_company: "Private Company",
  };
  return labels[orgType] ?? orgType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const budgetFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const avatarColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
];

export function BuyerHeader({ buyer }: BuyerHeaderProps) {
  const initial = buyer.name.charAt(0).toUpperCase();
  const colorIndex = hashCode(buyer.name) % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`${avatarColor} h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0`}
          >
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {buyer.name}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                {buyer.enrichmentScore != null && buyer.enrichmentScore > 0 && (
                  <EnrichmentBadge score={buyer.enrichmentScore} size="md" />
                )}
              </div>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {buyer.sector && (
                <Badge variant="outline">{buyer.sector}</Badge>
              )}
              {buyer.orgType && (
                <Badge variant="outline">{orgTypeLabel(buyer.orgType)}</Badge>
              )}
              {buyer.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {buyer.region}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {buyer.contractCount} contract{buyer.contractCount !== 1 ? "s" : ""}
              </span>
              {buyer.staffCount != null && buyer.staffCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {buyer.staffCount.toLocaleString("en-GB")} staff
                </span>
              )}
              {buyer.annualBudget != null && buyer.annualBudget > 0 && (
                <span className="flex items-center gap-1">
                  <PoundSterling className="h-3.5 w-3.5" />
                  {budgetFormatter.format(buyer.annualBudget)}
                </span>
              )}
              {buyer.website && (
                <a
                  href={buyer.website.startsWith("http") ? buyer.website : `https://${buyer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
              {buyer.democracyPortalUrl && (
                <a
                  href={buyer.democracyPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Landmark className="h-3.5 w-3.5" />
                  Governance Portal
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
