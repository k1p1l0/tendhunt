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
import { AttributesTab } from "@/components/buyers/attributes-tab";

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
  isUnlocked: boolean;
  buyerId: string;
  buyerName: string;
  buyer: {
    _id: string;
    name: string;
    contractCount: number;
    sector?: string;
  };
  onUnlocked?: () => void;
}

export function BuyerTabs(props: BuyerTabsProps) {
  const contactCount = props.contacts.length;

  return (
    <Tabs defaultValue="contracts" className="w-full">
      <TabsList>
        <TabsTrigger value="contracts">
          Contracts ({props.contracts.length})
        </TabsTrigger>
        <TabsTrigger value="contacts">
          Key Contacts ({contactCount})
        </TabsTrigger>
        <TabsTrigger value="signals">
          Buying Signals ({props.signals.length})
        </TabsTrigger>
        <TabsTrigger value="attributes">
          Buyer Attributes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contracts" className="mt-4">
        <ContractsTab contracts={props.contracts} />
      </TabsContent>

      <TabsContent value="contacts" className="mt-4">
        <ContactsTab
          contacts={props.contacts}
          isUnlocked={props.isUnlocked}
          buyerId={props.buyerId}
          onUnlocked={props.onUnlocked}
        />
      </TabsContent>

      <TabsContent value="signals" className="mt-4">
        <SignalsTab signals={props.signals} />
      </TabsContent>

      <TabsContent value="attributes" className="mt-4">
        <AttributesTab buyer={props.buyer} />
      </TabsContent>
    </Tabs>
  );
}
