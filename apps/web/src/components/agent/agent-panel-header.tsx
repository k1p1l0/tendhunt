"use client";

import { RotateCcw, X, Bell } from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { useAgentContext } from "./agent-provider";
import { useAgentStore } from "@/stores/agent-store";
import { SculptorIcon } from "@/components/sculptor/sculptor-icon";
import { AgentSettings } from "./agent-settings";
import { useNotifications } from "@/hooks/use-notifications";

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
  const router = useRouter();
  const { context } = useAgentContext();
  const setPanelOpen = useAgentStore((s) => s.setPanelOpen);
  const createConversation = useAgentStore((s) => s.createConversation);
  const { unreadCount } = useNotifications();

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      createConversation(nanoid());
    }
  };

  const handleNotificationsClick = () => {
    setPanelOpen(false);
    router.push("/notifications");
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
        className="h-7 w-7 shrink-0 rounded-full relative"
        onClick={handleNotificationsClick}
        aria-label={`View notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-3.5 w-3.5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-full"
        onClick={handleNewChat}
        aria-label="Start new conversation"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <AgentSettings />
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
