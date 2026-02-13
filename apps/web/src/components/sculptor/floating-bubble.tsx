"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAgentStore } from "@/stores/agent-store";
import { SculptorIcon } from "./sculptor-icon";

export function FloatingBubble() {
  const pathname = usePathname();
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const prefersReducedMotion = useReducedMotion();

  const isOnDashboard = pathname === "/dashboard";
  const shouldShow = !isOnDashboard && !panelOpen;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          type="button"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }}
          onClick={() => useAgentStore.getState().setPanelOpen(true)}
          aria-label="Open Sculptor assistant"
          className="sculptor-bubble-pulse fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-background border shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow min-h-[44px] min-w-[44px]"
        >
          <SculptorIcon size={28} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
