"use client";

import { CreditBalance } from "@/components/credits/credit-balance";
import { Crosshair } from "lucide-react";

export function SidebarFooterContent() {
  return (
    <div className="space-y-3 p-3">
      {/* Credit balance first */}
      <CreditBalance />

      {/* TendHunt branding below — subtle, not clickable */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Crosshair className="size-4" />
        <span>TendHunt</span>
      </div>
    </div>
  );
}
