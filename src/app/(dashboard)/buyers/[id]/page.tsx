import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { fetchBuyerById } from "@/lib/buyers";
import { BuyerDetailClient } from "@/components/buyers/buyer-detail-client";
import { BuyerBreadcrumb } from "./breadcrumb";

export default async function BuyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const buyer = await fetchBuyerById(id, userId);

  if (!buyer) {
    notFound();
  }

  // Serialize for client components
  const buyerId = String(buyer._id);
  const buyerName = buyer.name ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = (buyer.contracts ?? []).map((c: any) => ({
    _id: String(c._id),
    title: c.title ?? "",
    valueMin: c.valueMin ?? null,
    valueMax: c.valueMax ?? null,
    publishedDate: c.publishedDate ? String(c.publishedDate) : null,
    status: c.status ?? undefined,
    sector: c.sector ?? null,
    source: c.source ?? undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signals = (buyer.signals ?? []).map((s: any) => ({
    _id: s._id ? String(s._id) : undefined,
    signalType: s.signalType ?? "PROCUREMENT",
    title: s.title ?? "",
    insight: s.insight ?? "",
    sourceDate: s.sourceDate ? String(s.sourceDate) : null,
    organizationName: s.organizationName ?? undefined,
    source: s.source ?? undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = (buyer.contacts ?? []).map((c: any) => ({
    name: c.name ?? undefined,
    title: c.title ?? undefined,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    linkedIn: c.linkedIn ?? undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardDocuments = (buyer.boardDocuments ?? []).map((d: any) => ({
    _id: String(d._id),
    title: d.title ?? "",
    meetingDate: d.meetingDate ? String(d.meetingDate) : null,
    committeeName: d.committeeName ?? undefined,
    documentType: d.documentType ?? undefined,
    sourceUrl: d.sourceUrl ?? "",
    extractionStatus: d.extractionStatus ?? undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyPersonnel = (buyer.keyPersonnel ?? []).map((p: any) => ({
    _id: String(p._id),
    name: p.name ?? "",
    title: p.title ?? undefined,
    role: p.role ?? undefined,
    department: p.department ?? undefined,
    email: p.email ?? undefined,
    confidence: p.confidence ?? undefined,
    extractionMethod: p.extractionMethod ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <BuyerBreadcrumb name={buyerName} />
      <BuyerDetailClient
        buyer={{
          _id: buyerId,
          name: buyerName,
          sector: buyer.sector ?? undefined,
          region: buyer.region ?? undefined,
          contractCount: buyer.contractCount ?? 0,
          website: buyer.website ?? undefined,
          description: buyer.description ?? undefined,
          isUnlocked: buyer.isUnlocked,
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
        }}
      />
    </div>
  );
}
