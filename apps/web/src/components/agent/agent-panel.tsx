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
import { useSidebar } from "@/components/ui/sidebar";
import { AgentPanelHeader } from "./agent-panel-header";
import { AgentMessageList } from "./agent-message-list";
import { AgentInput } from "./agent-input";

const PANEL_WIDTH = 480;

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
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const sidebarWasOpenRef = useRef<boolean | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Sync sidebar state: collapse when panel opens, restore when it closes
  useEffect(() => {
    if (isMobile) return;

    if (panelOpen) {
      sidebarWasOpenRef.current = sidebarOpen;
      setSidebarOpen(false);
    } else if (sidebarWasOpenRef.current !== null) {
      setSidebarOpen(sidebarWasOpenRef.current);
      sidebarWasOpenRef.current = null;
    }
  // sidebarOpen is intentionally excluded — we only read it when panelOpen transitions to true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, isMobile, setSidebarOpen]);

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
          className="h-svh shrink-0 overflow-hidden border-l bg-background"
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
