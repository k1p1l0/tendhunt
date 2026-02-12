"use client";

import { useState } from "react";
import { Building2, Mail, Phone, Copy, Check } from "lucide-react";

interface Contact {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
}

interface ContactCardProps {
  contact: Contact;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-secure contexts
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Name */}
      {contact.name && (
        <h4 className="font-semibold text-sm">{contact.name}</h4>
      )}

      {/* Job title */}
      {contact.title && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>{contact.title}</span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{contact.email}</span>
          <CopyButton text={contact.email} />
        </div>
      )}

      {/* Phone */}
      {contact.phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{contact.phone}</span>
          <CopyButton text={contact.phone} />
        </div>
      )}
    </div>
  );
}
