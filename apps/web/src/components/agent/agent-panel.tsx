"use client";

import { useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAgentStore } from "@/stores/agent-store";
import { useAgent } from "@/hooks/use-agent";
import { useIsMobile } from "@/hooks/use-mobile";
import { AgentPanelHeader } from "./agent-panel-header";
import { AgentMessageList } from "./agent-message-list";
import { AgentInput } from "./agent-input";
import { NotificationSummary } from "./notification-summary";

const PANEL_WIDTH = 420;

function PanelContent({
  textareaRef,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { sendMessage, stopStreaming, isStreaming, messages, startNewConversation, retryLastMessage } =
    useAgent();

  return (
    <>
      <AgentPanelHeader onNewChat={startNewConversation} />
      <NotificationSummary />
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
    </>
  );
}

export function AgentPanel() {
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Cmd+K / Ctrl+K toggle + Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPanelOpen(!panelOpen);
      }
      if (e.key === "Escape" && panelOpen) {
        setPanelOpen(false);
      }
    },
    [panelOpen, setPanelOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus textarea when panel opens
  useEffect(() => {
    if (panelOpen) {
      const timeout = setTimeout(() => textareaRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [panelOpen]);

  // Mobile: keep Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Sculptor</SheetTitle>
          <PanelContent textareaRef={textareaRef} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: inline panel as flex sibling
  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.div
          role="complementary"
          aria-label="Sculptor AI assistant"
          initial={{ width: 0 }}
          animate={{ width: PANEL_WIDTH }}
          exit={{ width: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
          }
          className="sticky top-0 h-svh shrink-0 overflow-hidden border-l bg-background"
        >
          <div
            className="flex h-full flex-col"
            style={{ width: PANEL_WIDTH }}
          >
            <PanelContent textareaRef={textareaRef} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
