import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { LinkedinData } from "@/components/buyers/buyer-detail-client";

interface AttributesTabProps {
  buyer: {
    _id: string;
    name: string;
    contractCount: number;
    sector?: string;
    staffCount?: number;
    annualBudget?: number;
    enrichmentScore?: number;
    lastEnrichedAt?: string;
    linkedin?: LinkedinData;
  };
}

const budgetFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-GB");

interface AttributeCardProps {
  label: string;
  value: string | number | null | undefined;
  description: string;
}

function AttributeCard({ label, value, description }: AttributeCardProps) {
  const display = value != null && value !== "" ? value : "\u2014";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px]">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-2xl font-bold mt-1">{display}</p>
      </CardContent>
    </Card>
  );
}

function EnrichmentScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500"
      : score >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">Enrichment Score</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px]">
                  Weighted score (0-100) based on available data: org type, governance, board papers, website, staff, budget, personnel, and documents
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-2xl font-bold mt-1">{score}/100</p>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${score}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function AttributesTab({ buyer }: AttributesTabProps) {
  const linkedin = buyer.linkedin;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Real enrichment data from LinkedIn, governance portals, and contract analysis
      </p>

      {/* Core Stats */}
      <div>
        <h3 className="text-sm font-medium mb-3">Core Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AttributeCard
            label="Contract Count"
            value={buyer.contractCount}
            description="Total number of contracts from this buyer in the database"
          />
          <AttributeCard
            label="Staff Count"
            value={buyer.staffCount ? numberFormatter.format(buyer.staffCount) : null}
            description="Number of employees (from LinkedIn or manual entry)"
          />
          <AttributeCard
            label="Annual Budget"
            value={buyer.annualBudget ? budgetFormatter.format(buyer.annualBudget) : null}
            description="Estimated annual procurement budget"
          />
          {linkedin?.companyType && (
            <AttributeCard
              label="Company Type"
              value={linkedin.companyType}
              description="Organisation classification from LinkedIn"
            />
          )}
          {linkedin?.foundedYear && (
            <AttributeCard
              label="Founded"
              value={linkedin.foundedYear}
              description="Year the organisation was established"
            />
          )}
          {linkedin?.followerCount != null && linkedin.followerCount > 0 && (
            <AttributeCard
              label="LinkedIn Followers"
              value={numberFormatter.format(linkedin.followerCount)}
              description="Number of LinkedIn page followers"
            />
          )}
          {buyer.enrichmentScore != null && buyer.enrichmentScore > 0 && (
            <EnrichmentScoreBar score={buyer.enrichmentScore} />
          )}
          {buyer.lastEnrichedAt && (
            <AttributeCard
              label="Last Enriched"
              value={new Date(buyer.lastEnrichedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              description="When this buyer's data was last updated by the enrichment pipeline"
            />
          )}
        </div>
      </div>

      {/* LinkedIn Intelligence */}
      {linkedin && (
        <div>
          <h3 className="text-sm font-medium mb-3">LinkedIn Intelligence</h3>
          <div className="space-y-4">
            {linkedin.industries && linkedin.industries.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Industries</p>
                  <div className="flex flex-wrap gap-2">
                    {linkedin.industries.map((ind, i) => {
                      const label = typeof ind === "string" ? ind : (ind as Record<string, unknown>).name as string || String(ind);
                      return <Badge key={i} variant="secondary">{label}</Badge>;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {linkedin.specialities && linkedin.specialities.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Specialities</p>
                  <div className="flex flex-wrap gap-2">
                    {linkedin.specialities.map((s, i) => {
                      const label = typeof s === "string" ? s : (s as Record<string, unknown>).name as string || String(s);
                      return <Badge key={i} variant="outline">{label}</Badge>;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {linkedin.locations && linkedin.locations.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Locations</p>
                  <ul className="space-y-1 text-sm">
                    {linkedin.locations.map((loc, i) => {
                      const parsed = loc.parsed as Record<string, unknown> | undefined;
                      const text = parsed?.text as string | undefined;
                      const line1 = loc.line1 as string | undefined;
                      const isHq = loc.headquarter as boolean | undefined;
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span>{text || line1 || "Unknown location"}</span>
                          {isHq && (
                            <Badge variant="secondary" className="text-xs">HQ</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {linkedin.fundingData && Object.keys(linkedin.fundingData).length > 0 && (() => {
              const fd = linkedin.fundingData as Record<string, unknown>;
              const numRounds = fd.numFundingRounds;
              const lastRound = fd.lastFundingRound as Record<string, unknown> | undefined;
              return (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Funding</p>
                    <div className="text-sm space-y-1">
                      {numRounds != null && (
                        <p>
                          <span className="text-muted-foreground">Rounds: </span>
                          <span className="font-medium">{String(numRounds)}</span>
                        </p>
                      )}
                      {lastRound && (
                        <p>
                          <span className="text-muted-foreground">Last round: </span>
                          <span className="font-medium">
                            {String(lastRound.fundingType || "Unknown")}
                          </span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      )}

      {/* No enrichment data message */}
      {!linkedin && !buyer.staffCount && !buyer.annualBudget && !buyer.enrichmentScore && (
        <Card>
          <CardContent className="pt-4 text-center text-sm text-muted-foreground py-8">
            No enrichment data available yet. This buyer has not been processed by the enrichment pipeline.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
