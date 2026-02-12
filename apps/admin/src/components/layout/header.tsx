"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const pageNames: Record<string, string> = {
  "/": "Overview",
  "/workers": "Workers",
  "/data/contracts": "Contracts",
  "/data/buyers": "Buyers",
  "/data/signals": "Signals",
  "/users": "Users",
};

export function Header() {
  const pathname = usePathname();
  const pageName = pageNames[pathname] ?? "Admin";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm font-medium">{pageName}</span>
    </header>
  );
}
