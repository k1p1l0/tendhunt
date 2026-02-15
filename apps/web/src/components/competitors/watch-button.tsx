"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Bell, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface WatchButtonProps {
  supplierName: string;
}

export function WatchButton({ supplierName }: WatchButtonProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const res = await fetch(
          `/api/watchlist?check=${encodeURIComponent(supplierName)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setIsWatching(data.watched);
          setNotifyEmail(data.notifyEmail ?? false);
        }
      } catch {
        // silently fail — button will show unwatched state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [supplierName]);

  const handleToggleWatch = useCallback(async () => {
    setIsToggling(true);
    try {
      if (isWatching) {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierName }),
        });
        if (res.ok) {
          setIsWatching(false);
          setNotifyEmail(false);
        }
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierName, notifyEmail: false }),
        });
        if (res.ok) {
          setIsWatching(true);
        }
      }
    } catch (err) {
      console.error("Failed to toggle watch:", err);
    } finally {
      setIsToggling(false);
    }
  }, [isWatching, supplierName]);

  const handleToggleEmail = useCallback(
    async (checked: boolean) => {
      setNotifyEmail(checked);
      try {
        await fetch("/api/watchlist", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierName, notifyEmail: checked }),
        });
      } catch {
        setNotifyEmail(!checked);
      }
    },
    [supplierName]
  );

  if (isLoading) {
    return (
      <Button size="sm" variant="outline" disabled className="shrink-0">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={isWatching ? "watching" : "watch"}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <Button
            size="sm"
            variant={isWatching ? "default" : "outline"}
            onClick={handleToggleWatch}
            disabled={isToggling}
            className="shrink-0"
          >
            {isToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isWatching ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {isWatching ? "Watching" : "Watch"}
          </Button>
        </motion.div>
      </AnimatePresence>

      {isWatching && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Watch settings"
              >
                {notifyEmail ? (
                  <Bell className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Watch Settings</p>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="email-notify"
                    className="text-sm text-muted-foreground"
                  >
                    Email digest
                  </Label>
                  <Switch
                    id="email-notify"
                    checked={notifyEmail}
                    onCheckedChange={handleToggleEmail}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Receive a weekly email summary of this competitor&apos;s new contracts and activity.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </motion.div>
      )}
    </div>
  );
}
