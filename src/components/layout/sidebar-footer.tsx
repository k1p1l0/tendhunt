"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditBalance } from "@/components/credits/credit-balance";
import { Crosshair, Settings } from "lucide-react";

export function SidebarFooterContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center gap-1 p-3">
      {/* Credit balance */}
      <CreditBalance />

      {/* Settings link */}
      <Link
        href="/settings"
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          pathname.startsWith("/settings")
            ? "bg-sidebar-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        }`}
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </Link>

      {/* TendHunt branding — subtle, centered */}
      <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground/60">
        <Crosshair className="size-3.5" />
        <span>TendHunt</span>
      </div>
    </div>
  );
}
