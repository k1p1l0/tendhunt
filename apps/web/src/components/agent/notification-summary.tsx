"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useNotifications } from "@/hooks/use-notifications";
import { useAgentStore } from "@/stores/agent-store";
import { formatTimeAgo } from "@/lib/format-time-ago";
import {
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notification-types";

export function NotificationSummary() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading } = useNotifications();
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

  if (!shouldShow) {
    return null;
  }

  // Show loading skeleton if loading and no notifications yet
  if (isLoading && notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mt-4 mb-2 rounded-lg border bg-card p-3 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-md" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (notifications.length === 0) {
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
          const Icon = NOTIFICATION_TYPE_ICONS[notification.type];
          const colorClass = NOTIFICATION_TYPE_COLORS[notification.type] ?? "";
          const typeLabel = NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type;

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
