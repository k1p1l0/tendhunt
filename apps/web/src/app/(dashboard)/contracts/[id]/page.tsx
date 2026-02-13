import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchContractById } from "@/lib/contracts";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";
import { ContractDetailView } from "@/components/contracts/contract-detail-view";
import { ContractBreadcrumb } from "./breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Bookmark } from "lucide-react";

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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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
      <ContractBreadcrumb name={contract.title} />

      {/* Sticky Header */}
      <div className="px-8 py-3 border-b border-border flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/contracts"
            className="p-2 -ml-2 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to contracts"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1
            className="text-base font-semibold truncate max-w-2xl"
          >
            {contract.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="active:scale-[0.97]"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm" className="active:scale-[0.97]">
            <Bookmark className="h-4 w-4 mr-2" />
            Track Opportunity
          </Button>
        </div>
      </div>

      {/* Split Content */}
      <ContractDetailView
        contract={{
          _id: String(contract._id),
          title: contract.title,
          description: contract.description,
          status: contract.status,
          stage: contract.stage,
          buyerName: contract.buyerName,
          buyerOrg: contract.buyerOrg,
          buyerRegion: contract.buyerRegion,
          buyerId: contract.buyerId ? String(contract.buyerId) : null,
          source: contract.source,
          sourceUrl: contract.sourceUrl,
          sector: contract.sector,
          cpvCodes: contract.cpvCodes,
          valueMin: contract.valueMin,
          valueMax: contract.valueMax,
          currency: contract.currency,
          publishedDate: contract.publishedDate,
          deadlineDate: contract.deadlineDate,
          vibeScore: contract.vibeScore,
          vibeReasoning: contract.vibeReasoning,
          procurementMethod: contract.procurementMethod,
          procurementMethodDetails: contract.procurementMethodDetails,
          submissionMethod: contract.submissionMethod,
          submissionPortalUrl: contract.submissionPortalUrl,
          buyerContact: contract.buyerContact,
          documents: contract.documents,
          lots: contract.lots,
          lotCount: contract.lotCount,
          maxLotsBidPerSupplier: contract.maxLotsBidPerSupplier,
          buyer: contract.buyer
            ? {
                _id: String(contract.buyer._id),
                name: contract.buyer.name,
                orgType: contract.buyer.orgType,
                orgSubType: contract.buyer.orgSubType,
                website: contract.buyer.website,
                logoUrl: contract.buyer.logoUrl,
                enrichmentScore: contract.buyer.enrichmentScore,
                linkedinUrl: contract.buyer.linkedinUrl,
                contractCount: contract.buyer.contractCount,
                description: contract.buyer.description,
                address: contract.buyer.address,
                region: contract.buyer.region,
                sector: contract.buyer.sector,
                industry: contract.buyer.industry,
                staffCount: contract.buyer.staffCount,
                annualBudget: contract.buyer.annualBudget,
                contacts: contract.buyer.contacts?.map((c: Record<string, unknown>) => ({
                  name: c.name as string | null,
                  title: c.title as string | null,
                  email: c.email as string | null,
                  phone: c.phone as string | null,
                  linkedIn: c.linkedIn as string | null,
                  isRevealed: c.isRevealed as boolean | undefined,
                })) ?? null,
                linkedin: contract.buyer.linkedin
                  ? {
                      companyType: contract.buyer.linkedin.companyType,
                      foundedYear: contract.buyer.linkedin.foundedYear,
                      followerCount: contract.buyer.linkedin.followerCount,
                      employeeCountRange: contract.buyer.linkedin.employeeCountRange,
                      specialities: contract.buyer.linkedin.specialities,
                      industries: contract.buyer.linkedin.industries,
                      locations: contract.buyer.linkedin.locations,
                    }
                  : null,
                democracyPortalUrl: contract.buyer.democracyPortalUrl,
                boardPapersUrl: contract.buyer.boardPapersUrl,
                lastEnrichedAt: contract.buyer.lastEnrichedAt,
              }
            : null,
        }}
      />
    </div>
  );
}
