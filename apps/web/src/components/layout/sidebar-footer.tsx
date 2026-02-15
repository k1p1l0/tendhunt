"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { CreditBalance } from "@/components/credits/credit-balance";
import { Crosshair, Settings, Sun, Moon } from "lucide-react";

export function SidebarFooterContent() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

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

      {/* Theme toggle + branding row */}
      <div className="flex w-full items-center justify-between pt-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Crosshair className="size-3.5" />
          <span>TendHunt</span>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
