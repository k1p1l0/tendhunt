"use client";

import { Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "./breadcrumb-context";
import { useAgentStore } from "@/stores/agent-store";

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
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => useAgentStore.getState().setPanelOpen(true)}
        aria-label="Open research agent"
      >
        <Sparkles className="h-4 w-4" />
      </Button>
    </header>
  );
}
