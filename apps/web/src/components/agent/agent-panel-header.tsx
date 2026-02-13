"use client";

import { RotateCcw, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";
import { useAgentStore } from "@/stores/agent-store";
import { SculptorIcon } from "@/components/sculptor/sculptor-icon";

function getContextLabel(context: ReturnType<typeof useAgentContext>["context"]): string {
  if (context.buyerName) return context.buyerName;
  if (context.contractTitle) return context.contractTitle;
  if (context.scannerName) return context.scannerName;

  switch (context.page) {
    case "buyer_detail":
      return "Buyer Detail";
    case "contract_detail":
      return "Contract Detail";
    case "scanner":
      return "Scanner";
    case "contracts":
      return "Contracts";
    case "buyers":
      return "Buyers";
    default:
      return "Dashboard";
  }
}

interface AgentPanelHeaderProps {
  onNewChat?: () => void;
}

export function AgentPanelHeader({ onNewChat }: AgentPanelHeaderProps) {
  const { context } = useAgentContext();
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const createConversation = useAgentStore((s) => s.createConversation);

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      createConversation(nanoid());
    }
  };

  return (
    <div className="px-4 h-14 shrink-0 border-b flex items-center gap-3">
      <SculptorIcon size={24} animate className="shrink-0" />
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold leading-tight">Sculptor</h2>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {getContextLabel(context)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-full"
        onClick={handleNewChat}
        aria-label="Start new conversation"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-full"
        onClick={() => setPanelOpen(false)}
        aria-label="Close agent panel"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
