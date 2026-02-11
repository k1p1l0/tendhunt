"use client";

import { useState } from "react";
import { BuyerHeader } from "@/components/buyers/buyer-header";
import { BuyerTabs } from "@/components/buyers/buyer-tabs";

interface ContractData {
  _id: string;
  title: string;
  valueMin?: number | null;
  valueMax?: number | null;
  publishedDate?: string | null;
  status?: string;
  sector?: string | null;
  source?: string;
}

interface SignalData {
  _id?: string;
  signalType: string;
  title: string;
  insight: string;
  sourceDate?: string | null;
  organizationName?: string;
  source?: string;
}

interface ContactData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
}

interface BoardDocumentData {
  _id: string;
  title: string;
  meetingDate?: string | null;
  committeeName?: string;
  documentType?: string;
  sourceUrl: string;
  extractionStatus?: string;
}

interface KeyPersonnelData {
  _id: string;
  name: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  confidence?: number;
  extractionMethod?: string;
}

interface BuyerData {
  _id: string;
  name: string;
  sector?: string;
  region?: string;
  contractCount: number;
  website?: string;
  description?: string;
  isUnlocked: boolean;
  contacts: ContactData[];
  contracts: ContractData[];
  signals: SignalData[];
  boardDocuments: BoardDocumentData[];
  keyPersonnel: KeyPersonnelData[];
  enrichmentScore?: number;
  enrichmentSources?: string[];
  orgType?: string;
  staffCount?: number;
  annualBudget?: number;
  democracyPortalUrl?: string;
  lastEnrichedAt?: string;
}

interface BuyerDetailClientProps {
  buyer: BuyerData;
}

export function BuyerDetailClient({ buyer }: BuyerDetailClientProps) {
  // Local state for isUnlocked -- initialized from server data,
  // flipped to true when user clicks "Unlock Contacts"
  const [isUnlocked, setIsUnlocked] = useState(buyer.isUnlocked);

  function handleUnlocked() {
    setIsUnlocked(true);
  }

  return (
    <div className="space-y-6">
      <BuyerHeader
        buyer={{
          name: buyer.name,
          sector: buyer.sector,
          region: buyer.region,
          contractCount: buyer.contractCount,
          website: buyer.website,
          isUnlocked,
          enrichmentScore: buyer.enrichmentScore,
          orgType: buyer.orgType,
          staffCount: buyer.staffCount,
          annualBudget: buyer.annualBudget,
          democracyPortalUrl: buyer.democracyPortalUrl,
        }}
      />
      <BuyerTabs
        contracts={buyer.contracts}
        signals={buyer.signals}
        contacts={buyer.contacts}
        isUnlocked={isUnlocked}
        buyerId={buyer._id}
        buyerName={buyer.name}
        buyer={{
          _id: buyer._id,
          name: buyer.name,
          contractCount: buyer.contractCount,
          sector: buyer.sector,
        }}
        boardDocuments={buyer.boardDocuments}
        keyPersonnel={buyer.keyPersonnel}
        onUnlocked={handleUnlocked}
      />
    </div>
  );
}
