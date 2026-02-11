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
        onUnlocked={handleUnlocked}
      />
    </div>
  );
}
