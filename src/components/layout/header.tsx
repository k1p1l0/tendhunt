"use client";

import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1">
        <span className="text-sm font-medium text-muted-foreground">
          TendHunt
        </span>
      </div>
      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  );
}
