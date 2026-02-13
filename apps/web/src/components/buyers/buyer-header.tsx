"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  FileText,
  ExternalLink,
  Users,
  PoundSterling,
  Landmark,
  Linkedin,
  Building2,
} from "lucide-react";
import { EnrichmentBadge } from "@/components/buyers/enrichment-badge";
import { resolveRegionName } from "@/lib/nuts-regions";

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
    logoUrl?: string;
    linkedinUrl?: string;
    description?: string;
    address?: string;
    industry?: string;
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

export function BuyerHeader({ buyer }: BuyerHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const showLogo = buyer.logoUrl && !logoError;

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
      {/* Logo */}
      <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={buyer.logoUrl}
            alt=""
            className="w-14 h-14 object-contain rounded-lg"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Building2 className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <h2 className="text-2xl font-bold tracking-tight mb-1.5">
          {buyer.name}
        </h2>

        {buyer.description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-3xl leading-relaxed line-clamp-2">
            {buyer.description}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {buyer.sector && (
              <Badge variant="outline" className="rounded-full">
                {buyer.sector}
              </Badge>
            )}
            {buyer.orgType && (
              <Badge variant="outline" className="rounded-full">
                {orgTypeLabel(buyer.orgType)}
              </Badge>
            )}
            {buyer.industry && (
              <Badge variant="outline" className="rounded-full">
                {buyer.industry}
              </Badge>
            )}
          </div>

          {/* Icons Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {(buyer.address || buyer.region) && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {buyer.address ?? resolveRegionName(buyer.region)}
              </span>
            )}
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {buyer.contractCount.toLocaleString()} contract{buyer.contractCount !== 1 ? "s" : ""}
            </span>
            {buyer.staffCount != null && buyer.staffCount > 0 && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {buyer.staffCount.toLocaleString("en-GB")} staff
              </span>
            )}
            {buyer.annualBudget != null && buyer.annualBudget > 0 && (
              <span className="flex items-center gap-2">
                <PoundSterling className="h-4 w-4" />
                {budgetFormatter.format(buyer.annualBudget)}
              </span>
            )}
            {buyer.website && (
              <a
                href={buyer.website.startsWith("http") ? buyer.website : `https://${buyer.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            )}
            {buyer.linkedinUrl && (
              <a
                href={buyer.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {buyer.democracyPortalUrl && (
              <a
                href={buyer.democracyPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Landmark className="h-4 w-4" />
                Governance Portal
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Enrichment Score Circle */}
      {buyer.enrichmentScore != null && buyer.enrichmentScore > 0 && (
        <div className="flex-shrink-0 self-center md:self-start md:mt-2">
          <EnrichmentBadge score={buyer.enrichmentScore} size="md" />
        </div>
      )}
    </div>
  );
}
