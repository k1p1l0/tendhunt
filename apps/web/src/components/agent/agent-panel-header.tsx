"use client";

import { Sparkles, RefreshCw, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";
import { useAgentStore } from "@/stores/agent-store";

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

export function AgentPanelHeader() {
  const { context } = useAgentContext();
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const createConversation = useAgentStore((s) => s.createConversation);

  const handleNewChat = () => {
    createConversation(nanoid());
  };

  return (
    <div className="px-4 py-3 border-b flex items-center gap-2">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold leading-tight">Research Agent</h2>
        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4 font-normal truncate max-w-[200px]">
          {getContextLabel(context)}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleNewChat}
        aria-label="New chat"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => setPanelOpen(false)}
        aria-label="Close agent panel"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
