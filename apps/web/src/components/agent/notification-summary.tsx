"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, MapPin, Tag, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useNotifications } from "@/hooks/use-notifications";
import { useAgentStore } from "@/stores/agent-store";

const TYPE_ICONS: Record<string, typeof Swords> = {
  NEW_CONTRACT: Swords,
  NEW_REGION: MapPin,
  NEW_SECTOR: Tag,
};

const TYPE_COLORS: Record<string, string> = {
  NEW_CONTRACT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  NEW_REGION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  NEW_SECTOR: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_CONTRACT: "New Contract",
  NEW_REGION: "New Region",
  NEW_SECTOR: "New Sector",
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationSummary() {
  const router = useRouter();
  const { notifications, unreadCount } = useNotifications();
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const [hasShownSummary, setHasShownSummary] = useState(false);

  // Reset when panel closes - use requestAnimationFrame to avoid sync setState
  useEffect(() => {
    if (!panelOpen) {
      requestAnimationFrame(() => {
        setHasShownSummary(false);
      });
    }
  }, [panelOpen]);

  // Only show once per panel open, and only if there are unread notifications
  const shouldShow = panelOpen && !hasShownSummary && unreadCount > 0;

  // Mark as shown after first render - use requestAnimationFrame to avoid sync setState
  useEffect(() => {
    if (shouldShow) {
      requestAnimationFrame(() => {
        setHasShownSummary(true);
      });
    }
  }, [shouldShow]);

  if (!shouldShow || notifications.length === 0) {
    return null;
  }

  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 3);

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-4 mt-4 mb-2 rounded-lg border bg-card p-3 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <p className="text-xs font-semibold text-foreground">
          {unreadCount === 1 ? "1 new alert" : `${unreadCount} new alerts`}
        </p>
      </div>
      <div className="space-y-2">
        {unreadNotifications.map((notification) => {
          const Icon = TYPE_ICONS[notification.type] ?? Swords;
          const colorClass = TYPE_COLORS[notification.type] ?? "";
          const typeLabel = TYPE_LABELS[notification.type] ?? notification.type;

          return (
            <button
              key={notification._id}
              onClick={() => {
                if (notification.entityLink) {
                  router.push(notification.entityLink);
                }
              }}
              className="w-full text-left rounded-md p-2 hover:bg-accent/50 transition-colors flex items-start gap-2 group"
            >
              <div className={`shrink-0 rounded-md p-1.5 ${colorClass}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground">
                      {typeLabel}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      · {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  {notification.entityLink && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                    {notification.body}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {unreadCount > 3 && (
        <button
          onClick={() => router.push("/notifications")}
          className="w-full mt-2 pt-2 border-t text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          View all {unreadCount} notifications →
        </button>
      )}
    </motion.div>
  );
}
