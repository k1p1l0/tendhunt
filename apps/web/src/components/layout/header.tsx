"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useBreadcrumb } from "./breadcrumb-context";
import { useAgentStore } from "@/stores/agent-store";
import { SculptorIcon } from "@/components/sculptor/sculptor-icon";

export function Header() {
  const { breadcrumb } = useBreadcrumb();
  const panelOpen = useAgentStore((s) => s.panelOpen);

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
      {!panelOpen && (
        <button
          type="button"
          className="agent-trigger-btn"
          onClick={() => useAgentStore.getState().setPanelOpen(true)}
          aria-label="Open Sculptor (Cmd+K)"
        >
          <SculptorIcon size={20} animate />
          <span className="text-sm font-medium">Sculptor</span>
          <kbd className="agent-trigger-kbd">⌘K</kbd>
        </button>
      )}
    </header>
  );
}
