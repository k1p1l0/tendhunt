"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAgentStore } from "@/stores/agent-store";
import { useAgent } from "@/hooks/use-agent";
import { AgentPanelHeader } from "./agent-panel-header";
import { AgentMessageList } from "./agent-message-list";
import { AgentInput } from "./agent-input";

export function AgentPanel() {
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const { sendMessage, stopStreaming, isStreaming, messages, startNewConversation } =
    useAgent();

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Research Agent</SheetTitle>
        <AgentPanelHeader onNewChat={startNewConversation} />
        <AgentMessageList messages={messages} onSend={sendMessage} />
        <AgentInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </SheetContent>
    </Sheet>
  );
}
