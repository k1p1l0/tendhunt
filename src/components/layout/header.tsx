"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useBreadcrumb } from "./breadcrumb-context";

export function Header() {
  const { breadcrumb } = useBreadcrumb();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1 min-w-0">
        {breadcrumb ?? (
          <span className="text-sm font-medium text-muted-foreground">
            TendHunt
          </span>
        )}
      </div>
    </header>
  );
}
