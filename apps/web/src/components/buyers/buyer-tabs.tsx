"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ContractsTab } from "@/components/buyers/contracts-tab";
import { ContactsTab } from "@/components/buyers/contacts-tab";
import { SignalsTab } from "@/components/buyers/signals-tab";
import { BoardDocumentsTab } from "@/components/buyers/board-documents-tab";
import { KeyPersonnelTab } from "@/components/buyers/key-personnel-tab";
import { AttributesTab } from "@/components/buyers/attributes-tab";
import { SpendingTab } from "@/components/buyers/spending-tab";

import type { BoardDocumentData } from "@/components/buyers/board-documents-tab";
import type { KeyPersonnelData } from "@/components/buyers/key-personnel-tab";
import type { LinkedinData } from "@/components/buyers/buyer-detail-client";

interface ContractData {
  _id: string;
  title: string;
  valueMin?: number | null;
  valueMax?: number | null;
  publishedDate?: string | Date | null;
  status?: string;
  sector?: string | null;
  source?: string;
}

interface SignalData {
  _id?: string;
  signalType: string;
  title: string;
  insight: string;
  sourceDate?: string | Date | null;
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

const VALID_TABS = [
  "spending", "contracts", "contacts", "signals",
  "board-documents", "key-personnel", "attributes",
] as const;

type BuyerTab = typeof VALID_TABS[number];

interface BuyerTabsProps {
  contracts: ContractData[];
  signals: SignalData[];
  contacts: ContactData[];
  buyerName: string;
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
  boardDocuments: BoardDocumentData[];
  keyPersonnel: KeyPersonnelData[];
  hasSpendData?: boolean;
  spendTransactionCount?: number;
  initialTab?: string;
}

export function BuyerTabs(props: BuyerTabsProps) {
  const contactCount = props.contacts.length;
  const activeTab: BuyerTab = VALID_TABS.includes(props.initialTab as BuyerTab)
    ? (props.initialTab as BuyerTab)
    : "spending";

  return (
    <Tabs defaultValue={activeTab} className="w-full">
      <TabsList
        variant="line"
        className="w-full justify-start gap-6 border-b border-border overflow-x-auto"
      >
        <TabsTrigger value="spending" className="text-sm">
          Spending{props.spendTransactionCount ? ` (${props.spendTransactionCount.toLocaleString()})` : ""}
        </TabsTrigger>
        <TabsTrigger value="contracts" className="text-sm">
          Contracts ({props.buyer.contractCount || props.contracts.length})
        </TabsTrigger>
        <TabsTrigger value="contacts" className="text-sm">
          Key Contacts ({contactCount})
        </TabsTrigger>
        <TabsTrigger value="signals" className="text-sm">
          Buying Signals ({props.signals.length})
        </TabsTrigger>
        <TabsTrigger value="board-documents" className="text-sm">
          Board Documents ({props.boardDocuments.length})
        </TabsTrigger>
        <TabsTrigger value="key-personnel" className="text-sm">
          Key Personnel ({props.keyPersonnel.length})
        </TabsTrigger>
        <TabsTrigger value="attributes" className="text-sm">
          Buyer Attributes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="spending" className="mt-6">
        <SpendingTab buyerId={props.buyer._id} buyerName={props.buyerName} />
      </TabsContent>

      <TabsContent value="contracts" className="mt-6">
        <ContractsTab contracts={props.contracts} />
      </TabsContent>

      <TabsContent value="contacts" className="mt-6">
        <ContactsTab contacts={props.contacts} />
      </TabsContent>

      <TabsContent value="signals" className="mt-6">
        <SignalsTab signals={props.signals} hasBoardDocuments={props.boardDocuments.length > 0} />
      </TabsContent>

      <TabsContent value="board-documents" className="mt-6">
        <BoardDocumentsTab documents={props.boardDocuments} />
      </TabsContent>

      <TabsContent value="key-personnel" className="mt-6">
        <KeyPersonnelTab personnel={props.keyPersonnel} />
      </TabsContent>

      <TabsContent value="attributes" className="mt-6">
        <AttributesTab buyer={props.buyer} />
      </TabsContent>
    </Tabs>
  );
}
