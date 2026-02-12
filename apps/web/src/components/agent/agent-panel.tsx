"use client";

import { useEffect, useRef } from "react";
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
  const { sendMessage, stopStreaming, isStreaming, messages, startNewConversation, retryLastMessage } =
    useAgent();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cmd+K / Ctrl+K global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPanelOpen(!panelOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panelOpen, setPanelOpen]);

  // Auto-focus textarea when panel opens
  useEffect(() => {
    if (panelOpen) {
      const timeout = setTimeout(() => textareaRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [panelOpen]);

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Research Agent</SheetTitle>
        <AgentPanelHeader onNewChat={startNewConversation} />
        <AgentMessageList
          messages={messages}
          onSend={sendMessage}
          isStreaming={isStreaming}
          onRetry={retryLastMessage}
        />
        <AgentInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          textareaRef={textareaRef}
        />
      </SheetContent>
    </Sheet>
  );
}
