"use client";

import { Users } from "lucide-react";
import { ContactCard } from "@/components/buyers/contact-card";
import { UnlockButton } from "@/components/buyers/unlock-button";

interface Contact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
}

interface ContactsTabProps {
  contacts: Contact[];
  isUnlocked: boolean;
  buyerId: string;
  onUnlocked?: () => void;
}

export function ContactsTab({
  contacts,
  isUnlocked,
  buyerId,
  onUnlocked,
}: ContactsTabProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mb-3" />
        <p className="text-sm">No contacts found for this buyer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and unlock button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {contacts.length} Key Contact{contacts.length !== 1 ? "s" : ""}
        </p>
        <UnlockButton
          buyerId={buyerId}
          isUnlocked={isUnlocked}
          onUnlocked={onUnlocked ?? (() => {})}
        />
      </div>

      {/* Contact cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact, i) => (
          <ContactCard
            key={contact.email ?? contact.name ?? i}
            contact={contact}
            isUnlocked={isUnlocked}
          />
        ))}
      </div>
    </div>
  );
}
