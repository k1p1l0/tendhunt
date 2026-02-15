"use client";

import { useRouter } from "next/navigation";
import { Bell, Check, Eye, Swords, MapPin, Tag } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";

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

export function NotificationsPageClient() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, refetch } = useNotifications();

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      refetch();
    } catch {
      // silent
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      refetch();
    } catch {
      // silent
    }
  };

  const handleClickNotification = (notification: NotificationItem) => {
    if (!notification.read) {
      handleMarkRead(notification._id);
    }
    if (notification.entityLink) {
      router.push(notification.entityLink);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated on competitor activity and new opportunities
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-base text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2 max-w-md">
              Watch competitors to get alerted when they win new contracts,
              enter new regions, or expand into new sectors
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Bell;
              const colorClass = TYPE_COLORS[notification.type] ?? "";

              return (
                <motion.div
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-lg border bg-card p-4 hover:shadow-md transition-all cursor-pointer flex items-start gap-3 ${
                    !notification.read ? "ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => handleClickNotification(notification)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClickNotification(notification);
                    }
                  }}
                >
                  <div className={`shrink-0 rounded-md p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p
                        className={`text-sm leading-snug ${
                          !notification.read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <button
                          type="button"
                          className="shrink-0 p-1 rounded hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notification._id);
                          }}
                          aria-label="Mark as read"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                      {notification.supplierName && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <p className="text-xs text-muted-foreground">
                            {notification.supplierName}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
