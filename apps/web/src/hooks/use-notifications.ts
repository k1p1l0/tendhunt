import { useCallback, useEffect, useState } from "react";

export interface NotificationItem {
  _id: string;
  type: "NEW_CONTRACT" | "NEW_REGION" | "NEW_SECTOR";
  title: string;
  body: string;
  entityLink?: string;
  supplierName?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsData {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

export function useNotifications() {
  const [data, setData] = useState<NotificationsData>({
    notifications: [],
    total: 0,
    unreadCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      setIsLoading(true);
      const url = unreadOnly
        ? "/api/notifications?unread=true&limit=10"
        : "/api/notifications?limit=15";
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      setData({
        notifications: json.notifications ?? [],
        total: json.total ?? 0,
        unreadCount: json.unreadCount ?? 0,
      });
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + polling every 5 minutes
  useEffect(() => {
    fetchNotifications();

    let interval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (interval) return;
      interval = setInterval(() => fetchNotifications(), 300_000);
    }

    function stopPolling() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchNotifications();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  return {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
    total: data.total,
    isLoading,
    refetch: fetchNotifications,
  };
}
