"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Inbox, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export interface SendToInboxButtonProps {
  entityType: "contract" | "buyer" | "signal";
  entityId: string;
  title: string;
  subtitle?: string;
  value?: number;
  deadlineDate?: string;
  sector?: string;
  buyerName?: string;
  logoUrl?: string;
  className?: string;
}

export function SendToInboxButton({
  entityType,
  entityId,
  title,
  subtitle,
  value,
  deadlineDate,
  sector,
  buyerName,
  logoUrl,
  className,
}: SendToInboxButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [isInInbox, setIsInInbox] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleSend = useCallback(async () => {
    if (isSending || isInInbox) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          title,
          subtitle,
          value,
          deadlineDate,
          sector,
          buyerName,
          logoUrl,
        }),
      });

      if (res.status === 201) {
        setIsInInbox(true);
        toast.success("Added to Inbox");
      } else if (res.ok) {
        setIsInInbox(true);
        toast.info("Already in Inbox");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add to Inbox");
      }
    } catch {
      toast.error("Failed to add to Inbox");
    } finally {
      setIsSending(false);
    }
  }, [
    isSending,
    isInInbox,
    entityType,
    entityId,
    title,
    subtitle,
    value,
    deadlineDate,
    sector,
    buyerName,
    logoUrl,
  ]);

  const iconTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`active:scale-[0.97] ${className ?? ""}`}
      disabled={isSending || isInInbox}
      onClick={handleSend}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isSending ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={iconTransition}
            className="mr-2 inline-flex"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.span>
        ) : isInInbox ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={iconTransition}
            className="mr-2 inline-flex"
          >
            <Check className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="inbox"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={iconTransition}
            className="mr-2 inline-flex"
          >
            <Inbox className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
      {isSending ? "Sending..." : isInInbox ? "In Inbox" : "Send to Inbox"}
    </Button>
  );
}
