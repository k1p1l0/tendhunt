"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function NotificationsBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(
      <span className="text-sm font-medium">Notifications</span>
    );
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return null;
}
