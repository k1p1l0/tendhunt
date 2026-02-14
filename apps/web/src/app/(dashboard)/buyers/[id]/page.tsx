import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { fetchBuyerById } from "@/lib/buyers";
import { BuyerDetailClient } from "@/components/buyers/buyer-detail-client";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";
import { EnrichmentRefresh } from "@/components/agent/enrichment-refresh";
import { BuyerBreadcrumb } from "./breadcrumb";
import { Button } from "@/components/ui/button";
import { dbConnect } from "@/lib/mongodb";
import SpendSummary from "@/models/spend-summary";
import { isValidObjectId } from "mongoose";
import { ArrowLeft, Share2 } from "lucide-react";
import { SendToInboxButton } from "@/components/inbox/send-to-inbox-button";

interface LeanContract {
  _id: unknown;
  title?: string;
  valueMin?: number;
  valueMax?: number;
  publishedDate?: Date;
  status?: string;
  sector?: string;
  source?: string;
}

interface LeanSignal {
  _id?: unknown;
  signalType?: string;
  title?: string;
  insight?: string;
  sourceDate?: Date;
  organizationName?: string;
  source?: string;
}

interface LeanContact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
}

interface LeanBoardDocument {
  _id: unknown;
  title?: string;
  meetingDate?: Date;
  committeeName?: string;
  documentType?: string;
  sourceUrl?: string;
  extractionStatus?: string;
}

interface LeanKeyPersonnel {
  _id: unknown;
  name?: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  confidence?: number;
  extractionMethod?: string;
}

interface LeanChildBuyer {
  _id: unknown;
  name?: string;
  enrichmentScore?: number;
  logoUrl?: string;
  orgType?: string;
  contractCount?: number;
}

interface LeanOfstedSchool {
  _id: unknown;
  urn?: number;
  name?: string;
  phase?: string;
  schoolType?: string;
  overallEffectiveness?: number | null;
  qualityOfEducation?: number | null;
  behaviourAndAttitudes?: number | null;
  personalDevelopment?: number | null;
  leadershipAndManagement?: number | null;
  inspectionDate?: Date;
  totalPupils?: number | null;
  idaciQuintile?: number | null;
  reportUrl?: string;
  postcode?: string;
}

export default async function BuyerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const buyer = await fetchBuyerById(id);

  if (!buyer) {
    notFound();
  }

  const buyerId = String(buyer._id);
  const buyerName = buyer.name ?? "";

  const contracts = ((buyer.contracts ?? []) as LeanContract[]).map((c) => ({
    _id: String(c._id),
    title: c.title ?? "",
    valueMin: c.valueMin ?? null,
    valueMax: c.valueMax ?? null,
    publishedDate: c.publishedDate ? String(c.publishedDate) : null,
    status: c.status ?? undefined,
    sector: c.sector ?? null,
    source: c.source ?? undefined,
  }));

  const signals = ((buyer.signals ?? []) as LeanSignal[]).map((s) => ({
    _id: s._id ? String(s._id) : undefined,
    signalType: s.signalType ?? "PROCUREMENT",
    title: s.title ?? "",
    insight: s.insight ?? "",
    sourceDate: s.sourceDate ? String(s.sourceDate) : null,
    organizationName: s.organizationName ?? undefined,
    source: s.source ?? undefined,
  }));

  const contacts = ((buyer.contacts ?? []) as LeanContact[]).map((c) => ({
    name: c.name ?? undefined,
    title: c.title ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    linkedIn: c.linkedIn ?? undefined,
  }));

  const boardDocuments = ((buyer.boardDocuments ?? []) as LeanBoardDocument[]).map((d) => ({
    _id: String(d._id),
    title: d.title ?? "",
    meetingDate: d.meetingDate ? String(d.meetingDate) : null,
    committeeName: d.committeeName ?? undefined,
    documentType: d.documentType ?? undefined,
    sourceUrl: d.sourceUrl ?? "",
    extractionStatus: d.extractionStatus ?? undefined,
  }));

  const keyPersonnel = ((buyer.keyPersonnel ?? []) as LeanKeyPersonnel[]).map((p) => ({
    _id: String(p._id),
    name: p.name ?? "",
    title: p.title ?? undefined,
    role: p.role ?? undefined,
    department: p.department ?? undefined,
    email: p.email ?? undefined,
    confidence: p.confidence ?? undefined,
    extractionMethod: p.extractionMethod ?? undefined,
  }));

  const children = ((buyer.children ?? []) as LeanChildBuyer[]).map((c) => ({
    _id: String(c._id),
    name: c.name ?? "",
    enrichmentScore: c.enrichmentScore ?? undefined,
    logoUrl: c.logoUrl ?? undefined,
    orgType: c.orgType ?? undefined,
    contractCount: c.contractCount ?? 0,
  }));

  const ofstedSchools = ((buyer.ofstedSchools ?? []) as LeanOfstedSchool[]).map((s) => ({
    _id: String(s._id),
    urn: s.urn ?? 0,
    name: s.name ?? "",
    phase: s.phase ?? undefined,
    schoolType: s.schoolType ?? undefined,
    overallEffectiveness: s.overallEffectiveness ?? null,
    qualityOfEducation: s.qualityOfEducation ?? null,
    behaviourAndAttitudes: s.behaviourAndAttitudes ?? null,
    personalDevelopment: s.personalDevelopment ?? null,
    leadershipAndManagement: s.leadershipAndManagement ?? null,
    inspectionDate: s.inspectionDate ? String(s.inspectionDate) : null,
    totalPupils: s.totalPupils ?? null,
    idaciQuintile: s.idaciQuintile ?? null,
    reportUrl: s.reportUrl ?? null,
    postcode: s.postcode ?? null,
  }));

  const parentBuyer = buyer.parentBuyer
    ? { _id: String(buyer.parentBuyer._id), name: buyer.parentBuyer.name ?? "" }
    : undefined;

  let hasSpendData = false;
  let spendTransactionCount = 0;
  if (isValidObjectId(buyerId)) {
    await dbConnect();
    const spendSummary = await SpendSummary.findOne({ buyerId: buyer._id }).lean();
    hasSpendData = !!spendSummary;
    spendTransactionCount = spendSummary?.totalTransactions ?? 0;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <AgentContextSetter
        context={{
          page: "buyer_detail",
          buyerId,
          buyerName,
          buyerSector: buyer.sector ?? undefined,
          buyerRegion: buyer.region ?? undefined,
          buyerOrgType: buyer.orgType ?? undefined,
        }}
      />
      <EnrichmentRefresh buyerId={buyerId} />
      <BuyerBreadcrumb name={buyerName} />

      {/* Sticky Header */}
      <div className="px-8 py-3 border-b border-border flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/buyers"
            className="p-2 -ml-2 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to buyers"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold truncate max-w-2xl">
            {buyerName}
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
          <SendToInboxButton
            entityType="buyer"
            entityId={buyerId}
            title={buyerName}
            subtitle={buyer.orgType ?? buyer.sector ?? undefined}
            buyerName={buyerName}
            logoUrl={buyer.logoUrl ?? undefined}
            sector={buyer.sector ?? undefined}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <BuyerDetailClient
            initialTab={tab}
            buyer={{
              _id: buyerId,
              name: buyerName,
              sector: buyer.sector ?? undefined,
              region: buyer.region ?? undefined,
              contractCount: buyer.contractCount ?? 0,
              website: buyer.website ?? undefined,
              description: buyer.description ?? undefined,
              address: buyer.address ?? undefined,
              industry: buyer.industry ?? undefined,
              contacts,
              contracts,
              signals,
              boardDocuments,
              keyPersonnel,
              enrichmentScore: buyer.enrichmentScore ?? undefined,
              enrichmentSources: buyer.enrichmentSources ?? undefined,
              orgType: buyer.orgType ?? undefined,
              staffCount: buyer.staffCount ?? undefined,
              annualBudget: buyer.annualBudget ?? undefined,
              democracyPortalUrl: buyer.democracyPortalUrl ?? undefined,
              lastEnrichedAt: buyer.lastEnrichedAt ? String(buyer.lastEnrichedAt) : undefined,
              logoUrl: buyer.logoUrl ?? undefined,
              linkedinUrl: buyer.linkedinUrl ?? undefined,
              linkedin: buyer.linkedin ? {
                ...(buyer.linkedin as Record<string, unknown>),
                lastFetchedAt: (buyer.linkedin as Record<string, unknown>)?.lastFetchedAt
                  ? String((buyer.linkedin as Record<string, unknown>).lastFetchedAt)
                  : undefined,
              } : undefined,
              hasSpendData,
              spendTransactionCount,
              children,
              parentBuyer,
              isParent: buyer.isParent ?? false,
              ofstedSchools,
            }}
          />
        </div>
      </div>
    </div>
  );
}
