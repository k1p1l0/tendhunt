"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAgentStore } from "@/stores/agent-store";
import { AgentPanelHeader } from "./agent-panel-header";
import { AgentMessageList } from "./agent-message-list";
import { AgentInput } from "./agent-input";

export function AgentPanel() {
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const activeConversationId = useAgentStore((s) => s.activeConversationId);
  const createConversation = useAgentStore((s) => s.createConversation);
  const addMessage = useAgentStore((s) => s.addMessage);

  const handleSend = useCallback(
    (text: string) => {
      let convId = activeConversationId;
      if (!convId) {
        convId = nanoid();
        createConversation(convId, text.slice(0, 60));
      }
      addMessage(convId, {
        id: nanoid(),
        role: "user",
        content: text,
        timestamp: new Date(),
      });
    },
    [activeConversationId, createConversation, addMessage]
  );

  const handleStop = useCallback(() => {
    useAgentStore.getState().setIsStreaming(false);
  }, []);

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Research Agent</SheetTitle>
        <AgentPanelHeader />
        <AgentMessageList onSend={handleSend} />
        <AgentInput onSend={handleSend} onStop={handleStop} />
      </SheetContent>
    </Sheet>
  );
}
