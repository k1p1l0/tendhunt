"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ContractsTab } from "@/components/buyers/contracts-tab";
import { SignalsTab } from "@/components/buyers/signals-tab";
import { AttributesTab } from "@/components/buyers/attributes-tab";
import { Users } from "lucide-react";

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
}

export function BuyerTabs({
  contracts,
  signals,
  contacts,
  isUnlocked,
  buyerId,
  buyerName,
  buyer,
}: BuyerTabsProps) {
  const contactCount = contacts.length;

  return (
    <Tabs defaultValue="contracts" className="w-full">
      <TabsList>
        <TabsTrigger value="contracts">
          Contracts ({contracts.length})
        </TabsTrigger>
        <TabsTrigger value="contacts">
          Key Contacts ({contactCount})
        </TabsTrigger>
        <TabsTrigger value="signals">
          Buying Signals ({signals.length})
        </TabsTrigger>
        <TabsTrigger value="attributes">
          Buyer Attributes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contracts" className="mt-4">
        <ContractsTab contracts={contracts} />
      </TabsContent>

      <TabsContent value="contacts" className="mt-4">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {contactCount} Key Contact{contactCount !== 1 ? "s" : ""}
          </p>
          {contactCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Users className="h-10 w-10" />
              <p className="text-sm">No contacts found for this buyer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-1">
                  <p className="font-semibold text-sm">{contact.name || "Unknown"}</p>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  )}
                  {contact.email && (
                    <p className={`text-sm ${!isUnlocked ? "blur-sm select-none" : ""}`}>
                      {contact.email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="signals" className="mt-4">
        <SignalsTab signals={signals} />
      </TabsContent>

      <TabsContent value="attributes" className="mt-4">
        <AttributesTab buyer={buyer} />
      </TabsContent>
    </Tabs>
  );
}
