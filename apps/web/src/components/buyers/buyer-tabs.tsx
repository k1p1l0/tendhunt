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
import { BoardDocumentsTab, type BoardDocumentData } from "@/components/buyers/board-documents-tab";
import { KeyPersonnelTab, type KeyPersonnelData } from "@/components/buyers/key-personnel-tab";
import { AttributesTab } from "@/components/buyers/attributes-tab";
import { SpendingTab } from "@/components/buyers/spending-tab";
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
}

export function BuyerTabs(props: BuyerTabsProps) {
  const contactCount = props.contacts.length;

  return (
    <Tabs defaultValue="spending" className="w-full">
      <TabsList>
        <TabsTrigger value="spending">
          Spending{props.spendTransactionCount ? ` (${props.spendTransactionCount.toLocaleString()})` : ""}
        </TabsTrigger>
        <TabsTrigger value="contracts">
          Contracts ({props.contracts.length})
        </TabsTrigger>
        <TabsTrigger value="contacts">
          Key Contacts ({contactCount})
        </TabsTrigger>
        <TabsTrigger value="signals">
          Buying Signals ({props.signals.length})
        </TabsTrigger>
        <TabsTrigger value="board-documents">
          Board Documents ({props.boardDocuments.length})
        </TabsTrigger>
        <TabsTrigger value="key-personnel">
          Key Personnel ({props.keyPersonnel.length})
        </TabsTrigger>
        <TabsTrigger value="attributes">
          Buyer Attributes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="spending" className="mt-4">
        <SpendingTab buyerId={props.buyer._id} buyerName={props.buyerName} />
      </TabsContent>

      <TabsContent value="contracts" className="mt-4">
        <ContractsTab contracts={props.contracts} />
      </TabsContent>

      <TabsContent value="contacts" className="mt-4">
        <ContactsTab contacts={props.contacts} />
      </TabsContent>

      <TabsContent value="signals" className="mt-4">
        <SignalsTab signals={props.signals} />
      </TabsContent>

      <TabsContent value="board-documents" className="mt-4">
        <BoardDocumentsTab documents={props.boardDocuments} />
      </TabsContent>

      <TabsContent value="key-personnel" className="mt-4">
        <KeyPersonnelTab personnel={props.keyPersonnel} />
      </TabsContent>

      <TabsContent value="attributes" className="mt-4">
        <AttributesTab buyer={props.buyer} />
      </TabsContent>
    </Tabs>
  );
}
